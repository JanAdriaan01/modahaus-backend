// helper to extract userId from Authorization header
const { verifyAccess } = require('./jwt');

function getUserIdFromReq(req) {
  const auth = (req.headers.authorization || req.headers.Authorization || '');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.split(' ')[1];
  try {
    const payload = verifyAccess(token);
    // expect payload contains userId
    return payload.userId || payload.user_id || payload.sub || null;
  } catch (err) {
    return null;
  }
}

module.exports = { getUserIdFromReq };
