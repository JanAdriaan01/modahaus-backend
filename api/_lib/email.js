// defensive Resend wrapper
let ResendPkg;
try {
  ResendPkg = require('resend');
} catch (err) {
  console.error('resend package not installed or failed to load', err);
  throw err;
}
const Resend = ResendPkg.Resend || ResendPkg;
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, html, text }) {
  // returns a promise; caller should await and handle errors
  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text
  });
}

module.exports = { sendEmail };