import { Resend } from 'resend';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

// Initialize environment variables and Express
dotenv.config();
const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// Email endpoint
app.post('/api/send-email', async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Send email to your business
    const { data: businessEmail, error: businessError } = await resend.emails.send({
      from: 'modahaus <orders@modahaus.co.za>',
      to: ['orders@modahaus.co.za'],
      subject: `New Contact Form: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #007bff; color: white; padding: 20px; text-align: center; }
                .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
                .field { margin-bottom: 15px; }
                .field-label { font-weight: bold; color: #555; }
                .field-value { color: #333; }
                .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>New Contact Form Submission</h1>
                </div>
                <div class="content">
                    <div class="field">
                        <span class="field-label">From:</span>
                        <span class="field-value">${name} (${email})</span>
                    </div>
                    <div class="field">
                        <span class="field-label">Subject:</span>
                        <span class="field-value">${subject}</span>
                    </div>
                    <div class="field">
                        <span class="field-label">Message:</span>
                        <div class="field-value">${message.replace(/\n/g, '<br>')}</div>
                    </div>
                </div>
                <div class="footer">
                    <p>This inquiry was submitted through your Modahaus contact form.</p>
                </div>
            </div>
        </body>
        </html>
      `,
    });

    if (businessError) {
      console.error('Business email error:', businessError);
      return res.status(500).json({ error: businessError.message });
    }

    // Send confirmation email to client
    const { data: clientEmail, error: clientError } = await resend.emails.send({
      from: 'modahaus <orders@modahaus.co.za>',
      to: [email],
      subject: `Thank you for contacting Modahaus`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #28a745; color: white; padding: 20px; text-align: center; }
                .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
                .field { margin-bottom: 15px; }
                .field-label { font-weight: bold; color: #555; }
                .field-value { color: #333; }
                .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Thank You for Contacting Modahaus</h1>
                </div>
                <div class="content">
                    <p>Dear ${name},</p>
                    <p>Thank you for your message. We have received your inquiry and will get back to you within 24 hours.</p>
                    <div class="field">
                        <span class="field-label">Your Subject:</span>
                        <span class="field-value">${subject}</span>
                    </div>
                    <div class="field">
                        <span class="field-label">Your Message:</span>
                        <div class="field-value">${message.replace(/\n/g, '<br>')}</div>
                    </div>
                </div>
                <div class="footer">
                    <p><strong>Modahaus Team</strong><br>
                    Email: orders@modahaus.co.za<br>
                    We look forward to assisting you!</p>
                </div>
            </div>
        </body>
        </html>
      `,
    });

    if (clientError) {
      console.error('Client email error:', clientError);
      return res.status(500).json({ error: clientError.message });
    }

    console.log('Both emails sent successfully:');
    console.log('Business email:', businessEmail);
    console.log('Client email:', clientEmail);
    
    return res.status(200).json({ 
      message: 'Emails sent successfully', 
      businessEmail: businessEmail,
      clientEmail: clientEmail
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});