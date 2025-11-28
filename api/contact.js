// contact form sending both business email and client confirmation using Resend
const { sendEmail } = require('./_lib/email');

module.exports = async (req, res) => {
  // CORS - allow your frontend origin
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) return res.status(400).json({ error: 'All fields are required' });

    // Business email
    const businessHtml = `<p>From: ${name} (${email})</p><p>Subject: ${subject}</p><p>Message: ${message.replace(/\n/g,'<br>')}</p>`;
    await sendEmail({ to: [process.env.EMAIL_FROM], subject: `Contact: ${subject}`, html: businessHtml });

    // Client confirmation
    const clientHtml = `<p>Hi ${name},</p><p>Thanks for contacting us — we will respond shortly.</p>`;
    await sendEmail({ to: [email], subject: 'Thanks for contacting Modahaus', html: clientHtml });

    return res.status(200).json({ message: 'Emails sent successfully' });
  } catch (err) {
    console.error('contact handler error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};