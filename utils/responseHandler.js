/**
 * Uniform JSON response shape so the Flutter app can rely on a stable contract.
 *   success:   { success: true,  message?, data? }
 *   error:     { success: false, message, errors? }
 */
const ok = (res, data = null, message = 'OK', status = 200) =>
  res.status(status).json({ success: true, message, data });

const created = (res, data, message = 'Created') => ok(res, data, message, 201);

const fail = (res, message = 'Request failed', status = 400, errors = undefined) =>
  res.status(status).json({ success: false, message, ...(errors && { errors }) });

const notFound = (res, message = 'Not found') => fail(res, message, 404);
const unauthorized = (res, message = 'Unauthorized') => fail(res, message, 401);
const forbidden = (res, message = 'Forbidden') => fail(res, message, 403);

class ApiError extends Error {
  constructor(message, status = 400, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ok, created, fail, notFound, unauthorized, forbidden, ApiError, asyncHandler };
