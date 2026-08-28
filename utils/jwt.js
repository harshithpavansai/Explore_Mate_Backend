/**
 * JWT helpers (access + refresh tokens).
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_SECRET  = process.env.JWT_SECRET || 'dev-access-secret-change-me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';
const ACCESS_EXP     = process.env.JWT_EXPIRES_IN || '1d';
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

const signAccessToken = (payload) =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXP });

const signRefreshToken = (payload) =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXP });

const verifyAccessToken = (token) => jwt.verify(token, ACCESS_SECRET);
const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_SECRET);

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const issueAuthTokens = (user) => {
  const base = { sub: user.id, email: user.email, role: user.role };
  return {
    accessToken: signAccessToken(base),
    refreshToken: signRefreshToken({ sub: user.id }),
    expiresIn: ACCESS_EXP,
  };
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  issueAuthTokens,
};
