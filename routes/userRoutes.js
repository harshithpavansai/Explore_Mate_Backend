const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/me', ctrl.getProfile);
router.put('/me', ctrl.updateProfile);
router.patch('/me/preferences', ctrl.updatePreferences);
router.get('/me/history', ctrl.tripHistory);
router.post('/me/history', ctrl.addToHistory);
router.delete('/me', ctrl.deactivate);

// Admin
router.get('/', restrictTo('admin'), ctrl.listUsers);

module.exports = router;
