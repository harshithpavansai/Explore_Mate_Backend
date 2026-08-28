/**
 * Password hashing & verification.
 */
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

/**
 * Quick password strength check.
 * Min 8 chars, at least one letter and one digit.
 */
const isStrongPassword = (pwd) =>
  typeof pwd === 'string' && pwd.length >= 8 && /[A-Za-z]/.test(pwd) && /\d/.test(pwd);

module.exports = { hashPassword, comparePassword, isStrongPassword };
