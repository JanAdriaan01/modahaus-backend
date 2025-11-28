const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ALGO = process.env.JWT_ALGORITHM || 'HS256';
const accessExpires = process.env.JWT_ACCESS_EXPIRES || '15m';
const refreshExpires = process.env.JWT_REFRESH_EXPIRES || '30d';

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  console.warn('JWT secrets missing: set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in env');
}

function signAccess(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { algorithm: ALGO, expiresIn: accessExpires });
}

function signRefresh(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { algorithm: ALGO, expiresIn: refreshExpires });
}

function verifyAccess(token) {
  return jwt.verify(token, ACCESS_SECRET, { algorithms: [ALGO] });
}

function verifyRefresh(token) {
  return jwt.verify(token, REFRESH_SECRET, { algorithms: [ALGO] });
}

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh };