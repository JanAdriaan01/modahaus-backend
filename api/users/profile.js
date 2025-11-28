const db = require('../_lib/db');
const { getUserIdFromReq } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  const userId = getUserIdFromReq(req);
  if (!userId) return res.status(401).json({ message: 'unauthorized' });

  if (req.method === 'GET') {
    const user = (await db.query('SELECT id,email,first_name,last_name,phone FROM users WHERE id=$1', [userId])).rows[0];
    return res.status(200).json({ user });
  } else if (req.method === 'PATCH') {
    const { firstName, lastName, phone } = req.body;
    await db.query('UPDATE users SET first_name=$1,last_name=$2,phone=$3,updated_at=NOW() WHERE id=$4', [firstName, lastName, phone, userId]);
    const updated = (await db.query('SELECT id,email,first_name,last_name,phone FROM users WHERE id=$1', [userId])).rows[0];
    return res.status(200).json({ user: updated });
  } else return res.status(405).end();
};