/**
 * Centralized error handler.
 * Translates thrown ApiErrors / unknown errors into uniform JSON responses.
 */
const logger = require('../utils/logger');
const { ApiError } = require('../utils/responseHandler');

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.status || 400).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
  }

  // Postgres unique-violation
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Resource already exists' });
  }
  // Postgres foreign-key violation
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Invalid reference' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }

  logger.error(`[${req.method} ${req.originalUrl}] ${err.stack || err.message}`);

  return res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};
