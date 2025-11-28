const db = require('../_lib/db');
const crypto = require('crypto');
const { hash } = require('bcrypt');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ message: 'token and newPassword required' });

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const row = (await db.query('SELECT * FROM email_tokens WHERE token_hash=$1 AND type=$2 AND expires_at > now()', [tokenHash, 'reset'])).rows[0];
  if (!row) return res.status(400).json({ message: 'invalid or expired token' });

  const pwHash = await hash(newPassword, BCRYPT_ROUNDS);
  await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [pwHash, row.user_id]);
  await db.query('DELETE FROM email_tokens WHERE id=$1', [row.id]);
  res.json({ message: 'password updated' });
};