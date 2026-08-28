/**
 * 404 handler for unmatched API routes.
 */
module.exports = (req, res) =>
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
