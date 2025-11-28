// api/auth.js
import db from '../_lib/db.js';
import crypto from 'crypto';
import { hash, compare } from 'bcrypt';
import { signAccess, signRefresh, verifyRefresh } from '../_lib/jwt.js';
import { sendEmail } from '../_lib/email.js';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
const APP_ORIGIN = process.env.APP_ORIGIN || 'https://www.modahaus.co.za';

export default async function handler(req, res) {
  try {
    const action = req.query?.action;
    if (!action) return res.status(400).json({ message: 'action query param required' });

    // ----------------- REGISTER -----------------
    if (action === 'register' && req.method === 'POST') {
      const { email, password, firstName, lastName, phone } = req.body || {};
      if (!email || !password) return res.status(400).json({ message: 'email and password required' });

      const existing = (await db.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()])).rows[0];
      if (existing) return res.status(409).json({ message: 'email already registered' });

      const passwordHash = await hash(password, BCRYPT_ROUNDS);
      const user = (await db.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone)
         VALUES ($1,$2,$3,$4,$5) RETURNING id,email,first_name,last_name`,
        [email.toLowerCase(), passwordHash, firstName || null, lastName || null, phone || null]
      )).rows[0];

      const tokenRaw = crypto.randomBytes(48).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
      await db.query(
        'INSERT INTO email_tokens (user_id, token_hash, type, expires_at) VALUES ($1,$2,$3,$4)',
        [user.id, tokenHash, 'verification', expiresAt]
      );

      const verifyUrl = `${APP_ORIGIN}/verify-email?token=${tokenRaw}`;
      const html = `<p>Hello ${firstName || ''},</p><p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`;
      try { await sendEmail({ to: user.email, subject: 'Verify your email', html }); } catch (err) { console.error(err); }

      return res.status(201).json({ user: { id: user.id, email: user.email } });
    }

    // ----------------- LOGIN -----------------
    if (action === 'login' && req.method === 'POST') {
      const { email, password } = req.body || {};
      if (!email || !password) return res.status(400).json({ message: 'email & password required' });

      const user = (await db.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()])).rows[0];
      if (!user || !user.password_hash) return res.status(401).json({ message: 'invalid credentials' });

      const ok = await compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ message: 'invalid credentials' });

      const payload = { userId: user.id, role: user.role || 'user' };
      const accessToken = signAccess(payload);
      const refreshToken = signRefresh({ userId: user.id });

      const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

      await db.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, ip, user_agent, expires_at)
         VALUES ($1,$2,$3,$4,$5)`,
        [user.id, refreshHash, req.headers['x-forwarded-for'] || null, req.headers['user-agent'] || null, expiresAt]
      );

      await db.query('UPDATE users SET last_login_at=now() WHERE id=$1', [user.id]);

      return res.json({
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name }
      });
    }

    // ----------------- LOGOUT -----------------
    if (action === 'logout' && req.method === 'POST') {
      const { refreshToken } = req.body || {};
      if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });
      const rHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await db.query('UPDATE refresh_tokens SET revoked=true WHERE token_hash=$1', [rHash]);
      return res.json({ message: 'logged out' });
    }

    // ----------------- REFRESH -----------------
    if (action === 'refresh' && req.method === 'POST') {
      const { refreshToken } = req.body || {};
      if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

      let payload;
      try { payload = verifyRefresh(refreshToken); } catch { return res.status(401).json({ message: 'invalid refresh token' }); }

      const rHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const row = (await db.query(
        'SELECT * FROM refresh_tokens WHERE token_hash=$1 AND revoked=false AND expires_at > now()',
        [rHash]
      )).rows[0];
      if (!row) return res.status(401).json({ message: 'refresh token not found or revoked' });

      await db.query('DELETE FROM refresh_tokens WHERE id=$1', [row.id]);

      const newAccess = signAccess({ userId: payload.userId });
      const newRefresh = signRefresh({ userId: payload.userId });
      const newHash = crypto.createHash('sha256').update(newRefresh).digest('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
      await db.query(
        'INSERT INTO refresh_tokens (user_id, token_hash, ip, user_agent, expires_at) VALUES ($1,$2,$3,$4,$5)',
        [payload.userId, newHash, req.headers['x-forwarded-for'] || null, req.headers['user-agent'] || null, expiresAt]
      );

      return res.json({ accessToken: newAccess, refreshToken: newRefresh });
    }

    // ----------------- REQUEST RESET -----------------
    if (action === 'request-reset' && req.method === 'POST') {
      const { email } = req.body || {};
      if (!email) return res.status(400).json({ message: 'email required' });

      const user = (await db.query('SELECT id,email,first_name FROM users WHERE email=$1', [email.toLowerCase()])).rows[0];
      if (!user) return res.status(200).json({ message: 'If an account exists we have sent a reset link' });

      const tokenRaw = crypto.randomBytes(48).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

      await db.query('INSERT INTO email_tokens (user_id, token_hash, type, expires_at) VALUES ($1,$2,$3,$4)',
        [user.id, tokenHash, 'reset', expiresAt]
      );

      const resetUrl = `${APP_ORIGIN}/reset-password?token=${tokenRaw}`;
      const html = `<p>Hi ${user.first_name || ''},</p><p>Reset your password: <a href="${resetUrl}">Reset password</a></p>`;
      try { await sendEmail({ to: user.email, subject: 'Reset your password', html }); } catch (err) { console.error(err); }

      return res.json({ message: 'If an account exists we have sent a reset link' });
    }

    // ----------------- RESET PASSWORD -----------------
    if (action === 'reset-password' && req.method === 'POST') {
      const { token, newPassword } = req.body || {};
      if (!token || !newPassword) return res.status(400).json({ message: 'token and newPassword required' });

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const row = (await db.query(
        'SELECT * FROM email_tokens WHERE token_hash=$1 AND type=$2 AND expires_at > now()',
        [tokenHash, 'reset']
      )).rows[0];
      if (!row) return res.status(400).json({ message: 'invalid or expired token' });

      const pwHash = await hash(newPassword, BCRYPT_ROUNDS);
      await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [pwHash, row.user_id]);
      await db.query('DELETE FROM email_tokens WHERE id=$1', [row.id]);

      return res.json({ message: 'password updated' });
    }

    // ----------------- VERIFY EMAIL -----------------
    if (action === 'verify-email' && req.method === 'GET') {
      const token = req.query?.token;
      if (!token) return res.status(400).json({ message: 'token required' });

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const row = (await db.query(
        'SELECT * FROM email_tokens WHERE token_hash=$1 AND type=$2 AND expires_at > now()',
        [tokenHash, 'verification']
      )).rows[0];
      if (!row) return res.status(400).json({ message: 'invalid or expired token' });

      await db.query('UPDATE users SET email_verified=true WHERE id=$1', [row.user_id]);
      await db.query('DELETE FROM email_tokens WHERE id=$1', [row.id]);

      return res.redirect(`${APP_ORIGIN}/email-verified?success=1`);
    }

    return res.status(400).json({ message: 'unknown action or wrong method' });
  } catch (err) {
    console.error('Auth handler error:', err);
    return res.status(500).json({ message: 'internal server error' });
  }
}
