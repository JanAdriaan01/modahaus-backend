// api/auth.js
const db = require('../_lib/db'); // ensure correct relative path
const crypto = require('crypto');
const { hash, compare } = require('bcrypt');
const { signAccess, signRefresh, verifyRefresh } = require('../_lib/jwt');
const { sendEmail } = require('../_lib/email');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
const APP_ORIGIN = process.env.APP_ORIGIN || 'https://www.modahaus.co.za';

module.exports = async function handler(req, res) {
  console.log('Auth handler called');
  console.log('Request method:', req.method);
  console.log('Query params:', req.query);
  console.log('Body:', req.body);

  try {
    const action = req.query?.action;
    if (!action) return res.status(400).json({ message: 'action query param required' });

    // ---------------- REGISTER ----------------
    if (action === 'register' && req.method === 'POST') {
      const { email, password, firstName, lastName, phone } = req.body || {};
      if (!email || !password) return res.status(400).json({ message: 'email and password required' });

      console.log('Registering user:', email);

      // Check existing
      const existing = (await db.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()])).rows[0];
      if (existing) return res.status(409).json({ message: 'email already registered' });

      const passwordHash = await hash(password, BCRYPT_ROUNDS);
      const user = (await db.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone) 
         VALUES ($1,$2,$3,$4,$5) RETURNING id,email,first_name,last_name`,
        [email.toLowerCase(), passwordHash, firstName || null, lastName || null, phone || null]
      )).rows[0];

      // Verification token
      const tokenRaw = crypto.randomBytes(48).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

      await db.query('INSERT INTO email_tokens (user_id, token_hash, type, expires_at) VALUES ($1,$2,$3,$4)',
        [user.id, tokenHash, 'verification', expiresAt]);

      const verifyUrl = `${APP_ORIGIN}/verify-email?token=${tokenRaw}`;
      const html = `<p>Hello ${firstName || ''},</p><p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`;

      try {
        console.log('Sending verification email to:', user.email);
        await sendEmail({ to: user.email, subject: 'Verify your email', html });
      } catch (err) {
        console.error('sendEmail failed in register:', err);
      }

      return res.status(201).json({ user: { id: user.id, email: user.email } });
    }

    // ---------------- LOGIN ----------------
    if (action === 'login' && req.method === 'POST') {
      const { email, password } = req.body || {};
      if (!email || !password) return res.status(400).json({ message: 'email & password required' });

      console.log('Login attempt for:', email);

      const user = (await db.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()])).rows[0];
      if (!user || !user.password_hash) return res.status(401).json({ message: 'invalid credentials' });

      const ok = await compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ message: 'invalid credentials' });

      // produce tokens
      const payload = { userId: user.id, role: user.role || 'user' };
      const accessToken = signAccess(payload);
      const refreshToken = signRefresh({ userId: user.id });

      return res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name } });
    }

    return res.status(400).json({ message: 'unknown action or wrong method' });

  } catch (err) {
    console.error('Auth handler error:', err);
    return res.status(500).json({ message: 'internal server error', error: err.message });
  }
};