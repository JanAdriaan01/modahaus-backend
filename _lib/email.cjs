// _lib/email.cjs
// Handles sending emails via Resend API

const Resend = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

if (!process.env.RESEND_API_KEY) console.error('RESEND_API_KEY not defined!');

async function sendEmail({ to, subject, html, text }) {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM, // must be verified in Resend
      to,
      subject,
      html,
      text
    });
    console.log('Email sent to', to);
  } catch (err) {
    console.error('sendEmail error:', err);
    throw err; // propagate error to auth.cjs
  }
}

module.exports = { sendEmail };