// _lib/email.js
import Resend from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html, text }) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM, // e.g., 'no-reply@modahaus.co.za'
    to,
    subject,
    html,
    text
  });
}