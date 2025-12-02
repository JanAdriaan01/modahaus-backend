const db = require('../../_lib/db');
const { getUserIdFromReq } = require('../../_lib/auth');

module.exports = async function handler(req, res) {
  const userId = getUserIdFromReq(req);
  if (!userId) return res.status(401).json({ message: 'unauthorized' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'order id required' });

  const order = (await db.query('SELECT * FROM orders WHERE id=$1 AND user_id=$2', [id, userId])).rows[0];
  if (!order) return res.status(404).json({ message: 'not found' });
  res.status(200).json({ order });
};