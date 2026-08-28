/**
 * JWT-based authentication middleware.
 * Populates req.user when an `Authorization: Bearer <token>` header is supplied.
 */
const { verifyAccessToken } = require('../utils/jwt');
const { unauthorized, forbidden } = require('../utils/responseHandler');
const { query } = require('../config/database');

const extractToken = (req) => {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  if (req.query && req.query.token) return req.query.token;
  return null;
};

const protect = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return unauthorized(res, 'Authentication token missing');

  try {
    const decoded = verifyAccessToken(token);
    const { rows } = await query(
      'SELECT id,name,email,phone,role,xp,level,is_active,is_verified FROM users WHERE id = $1 LIMIT 1',
      [decoded.sub]
    );
    const user = rows[0];
    if (!user) return unauthorized(res, 'User no longer exists');
    if (!user.is_active) return forbidden(res, 'Account disabled');
    req.user = user;
    next();
  } catch (err) {
    return unauthorized(res, err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token');
  }
};

const optionalAuth = async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const decoded = verifyAccessToken(token);
    const { rows } = await query('SELECT id,email,role FROM users WHERE id = $1', [decoded.sub]);
    if (rows[0]) req.user = rows[0];
  } catch { /* ignore */ }
  next();
};

const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user) return unauthorized(res);
  if (!roles.includes(req.user.role)) return forbidden(res, 'Insufficient privileges');
  next();
};

module.exports = { protect, optionalAuth, restrictTo };
