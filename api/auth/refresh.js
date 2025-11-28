const db = require('../_lib/db');
const crypto = require('crypto');
const { signAccess, signRefresh, verifyRefresh } = require('../_lib/jwt');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

  let payload;
  try {
    payload = verifyRefresh(refreshToken);
  } catch (err) {
    return res.status(401).json({ message: 'invalid refresh token' });
  }

  const rHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const row = (await db.query('SELECT * FROM refresh_tokens WHERE token_hash=$1 AND revoked=false AND expires_at > now()', [rHash])).rows[0];
  if (!row) return res.status(401).json({ message: 'refresh token not found or revoked' });

  // rotate
  await db.query('DELETE FROM refresh_tokens WHERE id=$1', [row.id]);

  const newAccess = signAccess({ userId: payload.userId });
  const newRefresh = signRefresh({ userId: payload.userId });

  const newHash = crypto.createHash('sha256').update(newRefresh).digest('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await db.query('INSERT INTO refresh_tokens (user_id, token_hash, ip, user_agent, expires_at) VALUES ($1,$2,$3,$4,$5)', [
    payload.userId, newHash, req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null, req.headers['user-agent'] || null, expiresAt
  ]);

  res.json({ accessToken: newAccess, refreshToken: newRefresh });
};