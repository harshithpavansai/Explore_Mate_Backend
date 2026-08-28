const router = require('express').Router();
const ctrl = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.post('/chat', ctrl.chat);
router.post('/recommend', ctrl.recommend);
router.post('/travel-tips', ctrl.travelTips);

module.exports = router;
