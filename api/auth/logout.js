const db = require('../_lib/db');
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

  const rHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await db.query('UPDATE refresh_tokens SET revoked=true WHERE token_hash=$1', [rHash]);
  res.json({ message: 'logged out' });
};