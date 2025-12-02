const db = require('../../_lib/db');
const { getUserIdFromReq } = require('../../_lib/auth');

module.exports = async (req, res) => {
  const userId = getUserIdFromReq(req);
  if (!userId) return res.status(401).json({ message: 'unauthorized' });

  if (req.method === 'GET') {
    const orders = (await db.query('SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC', [userId])).rows;
    return res.status(200).json({ orders });
  } else if (req.method === 'POST') {
    const { items, amount_cents, currency, shippingAddress } = req.body;
    const order = (await db.query(
      'INSERT INTO orders(user_id,status,amount_cents,currency,items,shipping_address,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,NOW(),NOW()) RETURNING *',
      [userId, 'pending', amount_cents, currency, items, shippingAddress]
    )).rows[0];

    // TODO: create Ozow payment session/redirect here and return payment details to frontend
    return res.status(201).json({ order });
  } else return res.status(405).end();
};