const db = require('../_lib/db');
const crypto = require('crypto');
const { sendEmail } = require('../_lib/email');
const APP_ORIGIN = process.env.APP_ORIGIN || 'https://www.modahaus.co.za';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'email required' });

  const user = (await db.query('SELECT id,email,first_name FROM users WHERE email=$1', [email.toLowerCase()])).rows[0];
  if (!user) return res.status(200).json({ message: 'If an account exists we have sent a reset link' }); // avoid enumeration

  const tokenRaw = crypto.randomBytes(48).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 1); // 1h
  await db.query('INSERT INTO email_tokens (user_id, token_hash, type, expires_at) VALUES ($1,$2,$3,$4)', [
    user.id, tokenHash, 'reset', expiresAt
  ]);

  const resetUrl = `${APP_ORIGIN}/reset-password?token=${tokenRaw}`;
  const html = `<p>Hi ${user.first_name || ''},</p><p>Reset your password: <a href="${resetUrl}">Reset password</a></p>`;
  try {
    await sendEmail({ to: user.email, subject: 'Reset your password', html });
  } catch (err) {
    console.error('Resend error request-reset:', err);
  }
  return res.json({ message: 'If an account exists we have sent a reset link' });
};
