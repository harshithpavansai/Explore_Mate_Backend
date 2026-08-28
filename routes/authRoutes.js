const router = require('express').Router();
const { body } = require('express-validator');

const ctrl = require('../controllers/authController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

// Public
router.post('/register', authLimiter,
  validate([
    body('name').isString().isLength({ min: 2 }),
    body('email').isEmail(),
    body('password').isString().isLength({ min: 8 }),
    body('phone').optional().isString(),
  ]),
  ctrl.register);

router.post('/login', authLimiter,
  validate([
    body('email').isEmail(),
    body('password').isString().notEmpty(),
  ]),
  ctrl.login);

router.post('/firebase', authLimiter,
  validate([body('idToken').isString().notEmpty()]),
  ctrl.firebaseLogin);

router.post('/verify-otp', authLimiter,
  validate([
    body('email').isEmail(),
    body('code').isString().isLength({ min: 4, max: 8 }),
  ]),
  ctrl.verifyOtp);

router.post('/resend-otp', authLimiter,
  validate([body('email').isEmail()]),
  ctrl.resendOtp);

router.post('/refresh', validate([body('refreshToken').isString().notEmpty()]), ctrl.refresh);

router.post('/forgot-password', authLimiter,
  validate([body('email').isEmail()]),
  ctrl.forgotPassword);

router.post('/reset-password', authLimiter,
  validate([
    body('email').isEmail(),
    body('code').isString(),
    body('newPassword').isString().isLength({ min: 8 }),
  ]),
  ctrl.resetPassword);

// Auth-required
router.post('/logout', protect, ctrl.logout);
router.get('/me', protect, ctrl.me);

module.exports = router;
