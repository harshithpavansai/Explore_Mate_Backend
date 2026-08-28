/**
 * Authentication controller.
 * - Register / Login / Refresh / Logout
 * - Email/Phone OTP (Firebase or DB-backed fallback)
 * - Forgot/Reset password
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const { query, withTransaction } = require('../config/database');
const { hashPassword, comparePassword, isStrongPassword } = require('../utils/password');
const { issueAuthTokens, verifyRefreshToken, hashToken } = require('../utils/jwt');
const { ok, created, fail, ApiError, asyncHandler } = require('../utils/responseHandler');
const { verifyIdToken } = require('../config/firebase');
const logger = require('../utils/logger');

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------
const sanitizeUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  avatar_url: u.avatar_url,
  bio: u.bio,
  xp: u.xp,
  level: u.level,
  is_verified: u.is_verified,
  preferences: u.preferences,
  created_at: u.created_at,
});

const persistRefresh = async (userId, refreshToken, req) => {
  const tokenHash = hashToken(refreshToken);
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES ($1,$2,$3,$4,$5)`,
    [userId, tokenHash, expires, req.get('user-agent') || null, req.ip || null]
  );
};

// ----------------------------------------------------------------------
// REGISTER
// POST /auth/register   { name, email, password, phone? }
// ----------------------------------------------------------------------
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) throw new ApiError('Name, email, and password are required');
  if (!isStrongPassword(password))
    throw new ApiError('Password must be at least 8 characters and include letters and digits');

  const exists = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (exists.rows.length) throw new ApiError('Email already registered', 409);

  const passwordHash = await hashPassword(password);

  const insert = await query(
    `INSERT INTO users (name,email,phone,password_hash,role)
     VALUES ($1,$2,$3,$4,'user')
     RETURNING *`,
    [name, email.toLowerCase(), phone || null, passwordHash]
  );

  const user = insert.rows[0];

  // Generate a 6-digit OTP and store its hash for verify-otp
  const code = String(crypto.randomInt(100_000, 999_999));
  const codeHash = await bcrypt.hash(code, 8);
  await query(
    `INSERT INTO otp_codes (user_id,target,code_hash,purpose,expires_at)
     VALUES ($1,$2,$3,'verify',$4)`,
    [user.id, user.email, codeHash, new Date(Date.now() + 10 * 60_000)]
  );
  // In real life, dispatch via email/SMS provider here.
  logger.info(`[OTP] ${user.email} -> ${code} (dev mode log)`);

  const tokens = issueAuthTokens(user);
  await persistRefresh(user.id, tokens.refreshToken, req);

  return created(res, {
    user: sanitizeUser(user),
    tokens,
    devOtp: process.env.NODE_ENV === 'production' ? undefined : code,
  }, 'Registered. Please verify OTP sent to your email.');
});

// ----------------------------------------------------------------------
// LOGIN
// POST /auth/login   { email, password }
// ----------------------------------------------------------------------
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError('Email and password are required');

  const { rows } = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email.toLowerCase()]);
  const user = rows[0];
  if (!user || !user.password_hash)
    throw new ApiError('Invalid credentials', 401);

  const match = await comparePassword(password, user.password_hash);
  if (!match) throw new ApiError('Invalid credentials', 401);
  if (!user.is_active) throw new ApiError('Account disabled', 403);

  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  const tokens = issueAuthTokens(user);
  await persistRefresh(user.id, tokens.refreshToken, req);

  return ok(res, { user: sanitizeUser(user), tokens }, 'Login successful');
});

// ----------------------------------------------------------------------
// LOGIN VIA FIREBASE (phone/google)
// POST /auth/firebase   { idToken, name? }
// ----------------------------------------------------------------------
const firebaseLogin = asyncHandler(async (req, res) => {
  const { idToken, name } = req.body;
  if (!idToken) throw new ApiError('idToken required');

  const decoded = await verifyIdToken(idToken);
  if (!decoded) throw new ApiError('Invalid Firebase token', 401);

  const email = decoded.email || `${decoded.uid}@firebase.local`;
  const phone = decoded.phone_number || null;
  const displayName = decoded.name || name || 'Explorer';

  let { rows } = await query(
    'SELECT * FROM users WHERE firebase_uid = $1 OR email = $2 LIMIT 1',
    [decoded.uid, email]
  );
  let user = rows[0];

  if (!user) {
    const ins = await query(
      `INSERT INTO users (name,email,phone,firebase_uid,is_verified,role)
       VALUES ($1,$2,$3,$4,TRUE,'user') RETURNING *`,
      [displayName, email, phone, decoded.uid]
    );
    user = ins.rows[0];
  } else if (!user.firebase_uid) {
    await query('UPDATE users SET firebase_uid=$1, is_verified=TRUE WHERE id=$2', [decoded.uid, user.id]);
    user.firebase_uid = decoded.uid;
    user.is_verified = true;
  }

  const tokens = issueAuthTokens(user);
  await persistRefresh(user.id, tokens.refreshToken, req);

  return ok(res, { user: sanitizeUser(user), tokens }, 'Firebase login successful');
});

// ----------------------------------------------------------------------
// VERIFY OTP
// POST /auth/verify-otp   { email, code }
// ----------------------------------------------------------------------
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) throw new ApiError('Email and code are required');

  const { rows } = await query(
    `SELECT * FROM otp_codes
     WHERE target = $1 AND purpose = 'verify' AND consumed_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [email.toLowerCase()]
  );
  const otp = rows[0];
  if (!otp) throw new ApiError('OTP expired or not found', 400);

  const matches = await bcrypt.compare(String(code), otp.code_hash);
  if (!matches) throw new ApiError('Invalid OTP', 400);

  await withTransaction(async (c) => {
    await c.query('UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1', [otp.id]);
    await c.query('UPDATE users SET is_verified = TRUE WHERE email = $1', [email.toLowerCase()]);
  });

  return ok(res, null, 'Account verified');
});

// ----------------------------------------------------------------------
// RESEND OTP
// POST /auth/resend-otp   { email }
// ----------------------------------------------------------------------
const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError('Email required');

  const { rows } = await query('SELECT id,email FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = rows[0];
  if (!user) return ok(res, null, 'If the account exists, an OTP was sent');

  const code = String(crypto.randomInt(100_000, 999_999));
  const codeHash = await bcrypt.hash(code, 8);
  await query(
    `INSERT INTO otp_codes (user_id,target,code_hash,purpose,expires_at)
     VALUES ($1,$2,$3,'verify',$4)`,
    [user.id, user.email, codeHash, new Date(Date.now() + 10 * 60_000)]
  );
  logger.info(`[OTP] ${user.email} -> ${code} (dev mode)`);

  return ok(res, process.env.NODE_ENV === 'production' ? null : { devOtp: code }, 'OTP resent');
});

// ----------------------------------------------------------------------
// REFRESH TOKEN
// POST /auth/refresh    { refreshToken }
// ----------------------------------------------------------------------
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError('refreshToken required');

  let decoded;
  try { decoded = verifyRefreshToken(refreshToken); }
  catch { throw new ApiError('Invalid refresh token', 401); }

  const tokenHash = hashToken(refreshToken);
  const { rows } = await query(
    `SELECT rt.*, u.* FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  const stored = rows[0];
  if (!stored || stored.user_id !== decoded.sub) throw new ApiError('Refresh token revoked', 401);

  // Rotate: revoke old, issue new
  await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [tokenHash]);
  const tokens = issueAuthTokens({ id: stored.user_id, email: stored.email, role: stored.role });
  await persistRefresh(stored.user_id, tokens.refreshToken, req);

  return ok(res, { tokens }, 'Token refreshed');
});

// ----------------------------------------------------------------------
// LOGOUT
// POST /auth/logout   { refreshToken? }
// ----------------------------------------------------------------------
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [hashToken(refreshToken)]);
  } else if (req.user) {
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [req.user.id]);
  }
  return ok(res, null, 'Logged out');
});

// ----------------------------------------------------------------------
// FORGOT / RESET PASSWORD
// POST /auth/forgot-password   { email }
// POST /auth/reset-password    { email, code, newPassword }
// ----------------------------------------------------------------------
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError('Email required');

  const { rows } = await query('SELECT id,email FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = rows[0];
  // Always 200 to avoid email enumeration
  if (!user) return ok(res, null, 'If the account exists, a reset link was sent');

  const code = String(crypto.randomInt(100_000, 999_999));
  const codeHash = await bcrypt.hash(code, 8);
  await query(
    `INSERT INTO otp_codes (user_id,target,code_hash,purpose,expires_at)
     VALUES ($1,$2,$3,'reset',$4)`,
    [user.id, user.email, codeHash, new Date(Date.now() + 15 * 60_000)]
  );
  logger.info(`[RESET] ${user.email} -> ${code}`);
  return ok(res, process.env.NODE_ENV === 'production' ? null : { devCode: code }, 'Reset code sent');
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) throw new ApiError('email, code, newPassword are required');
  if (!isStrongPassword(newPassword)) throw new ApiError('Weak password');

  const { rows } = await query(
    `SELECT * FROM otp_codes
     WHERE target = $1 AND purpose = 'reset' AND consumed_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [email.toLowerCase()]
  );
  const otp = rows[0];
  if (!otp) throw new ApiError('Reset code expired or not found');

  const ok2 = await bcrypt.compare(String(code), otp.code_hash);
  if (!ok2) throw new ApiError('Invalid reset code');

  const newHash = await hashPassword(newPassword);
  await withTransaction(async (c) => {
    await c.query('UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1', [otp.id]);
    await c.query('UPDATE users SET password_hash = $1 WHERE email = $2', [newHash, email.toLowerCase()]);
    await c.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [otp.user_id]);
  });

  return ok(res, null, 'Password reset successful');
});

// ----------------------------------------------------------------------
// ME
// GET /auth/me
// ----------------------------------------------------------------------
const me = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  return ok(res, sanitizeUser(rows[0]));
});

module.exports = {
  register,
  login,
  firebaseLogin,
  verifyOtp,
  resendOtp,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  me,
};
