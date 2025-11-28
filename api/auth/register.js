const db = require('../_lib/db');
const { hash } = require('bcrypt');
const crypto = require('crypto');
const { sendEmail } = require('../_lib/email');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
const APP_ORIGIN = process.env.APP_ORIGIN || 'https://www.modahaus.co.za';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password, firstName, lastName, phone } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email and password required' });

  const existing = (await db.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()])).rows[0];
  if (existing) return res.status(409).json({ message: 'email already registered' });

  const passwordHash = await hash(password, BCRYPT_ROUNDS);
  const user = (await db.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone) VALUES ($1,$2,$3,$4,$5) RETURNING id,email,first_name,last_name`,
    [email.toLowerCase(), passwordHash, firstName || null, lastName || null, phone || null]
  )).rows[0];

  // create verification token
  const tokenRaw = crypto.randomBytes(48).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
  await db.query('INSERT INTO email_tokens (user_id, token_hash, type, expires_at) VALUES ($1,$2,$3,$4)',
    [user.id, tokenHash, 'verification', expiresAt]);

  const verifyUrl = `${APP_ORIGIN}/verify-email?token=${tokenRaw}`;
  const html = `<p>Hello ${firstName || ''},</p><p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`;
  try {
    await sendEmail({ to: user.email, subject: 'Verify your email', html });
  } catch (err) {
    console.error('sendEmail failed in register:', err);
    // Do not fail registration for email send errors — decide policy yourself.
  }
  res.status(201).json({ user: { id: user.id, email: user.email } });
};