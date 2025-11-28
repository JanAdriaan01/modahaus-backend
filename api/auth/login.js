const db = require('../_lib/db');
const { compare } = require('bcrypt');
const crypto = require('crypto');
const { signAccess, signRefresh } = require('../_lib/jwt');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email & password required' });

  const user = (await db.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()])).rows[0];
  if (!user || !user.password_hash) return res.status(401).json({ message: 'invalid credentials' });

  const ok = await compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: 'invalid credentials' });

  // tokens
  const payload = { userId: user.id, role: user.role || 'user' };
  const accessToken = signAccess(payload);
  const refreshToken = signRefresh({ userId: user.id });

  // store hashed refresh token (sha256)
  const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30d
  await db.query(`INSERT INTO refresh_tokens (user_id, token_hash, ip, user_agent, expires_at) VALUES ($1,$2,$3,$4,$5)`,
    [user.id, refreshHash, req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null, req.headers['user-agent'] || null, expiresAt]);

  await db.query('UPDATE users SET last_login_at=now() WHERE id=$1', [user.id]);

  res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name } });
};