const db = require('../_lib/db');
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: 'token required' });

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const row = (await db.query('SELECT * FROM email_tokens WHERE token_hash=$1 AND type=$2 AND expires_at > now()', [tokenHash, 'verification'])).rows[0];
  if (!row) return res.status(400).json({ message: 'invalid or expired token' });

  await db.query('UPDATE users SET email_verified=true WHERE id=$1', [row.user_id]);
  await db.query('DELETE FROM email_tokens WHERE id=$1', [row.id]);
  return res.redirect(`${process.env.APP_ORIGIN}/email-verified?success=1`);
};