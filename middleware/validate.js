/**
 * Express-validator runner.
 * Pass an array of validation chains, get a `400` with a `errors[]` map back if any fail.
 */
const { validationResult } = require('express-validator');

const validate = (chains) => async (req, res, next) => {
  await Promise.all(chains.map((c) => c.run(req)));
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: errors.array().map((e) => ({ field: e.path || e.param, message: e.msg })),
  });
};

module.exports = validate;
