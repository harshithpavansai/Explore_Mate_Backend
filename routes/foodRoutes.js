const router = require('express').Router();
const ctrl = require('../controllers/foodController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, ctrl.list);
router.post('/recommend', protect, ctrl.recommend);

module.exports = router;
