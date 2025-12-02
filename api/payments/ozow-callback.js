const fetch = require('node-fetch');
const db = require('../../_lib/db');
// optionally send email:
// const { sendEmail } = require('../../_lib/email');

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  const { orderId, transactionId } = req.method === 'GET' ? req.query : req.body;
  if (!orderId || !transactionId) return res.status(400).json({ message: 'Missing orderId or transactionId' });

  const orderRow = (await db.query('SELECT * FROM orders WHERE id=$1', [orderId])).rows[0];
  if (!orderRow) return res.status(404).json({ message: 'Order not found' });

  const verifyUrl = process.env.OZOW_VERIFY_URL;
  const merchantId = process.env.OZOW_MERCHANT_ID;
  const apiKey = process.env.OZOW_API_KEY;
  if (!verifyUrl || !apiKey) {
    console.error('Ozow envs missing');
    return res.status(500).json({ message: 'Payment verifier not configured' });
  }

  const payload = { merchantId, transactionId, orderId };
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };

  let ozowResp;
  try {
    ozowResp = await fetch(verifyUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
  } catch (err) {
    console.error('Ozow fetch error', err);
    return res.status(502).json({ message: 'Failed to verify payment' });
  }

  if (!ozowResp.ok) {
    const text = await ozowResp.text();
    console.error('Ozow verify failed:', ozowResp.status, text);
    return res.status(502).json({ message: 'Failed to verify payment with Ozow' });
  }

  const ozowData = await ozowResp.json();
  const status = ozowData.status || ozowData.transactionStatus || ozowData.paymentStatus;

  if (status === 'paid' || status === 'success' || status === 'Completed') {
    await db.query('UPDATE orders SET status=$1, payment_provider=$2, payment_id=$3, updated_at=NOW() WHERE id=$4',
      ['paid', 'ozow', transactionId, orderId]);
    // optionally send confirmation email here, using orderRow.customer_email
    return res.redirect(`${process.env.APP_ORIGIN}/order-confirmation?orderId=${orderId}`);
  } else {
    await db.query('UPDATE orders SET status=$1, payment_provider=$2, payment_id=$3, updated_at=NOW() WHERE id=$4',
      [status || 'pending', 'ozow', transactionId, orderId]);
    return res.redirect(`${process.env.APP_ORIGIN}/payment-failed?orderId=${orderId}`);
  }
};
