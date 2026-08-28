const router = require('express').Router();
const ctrl = require('../controllers/translatorController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

router.get('/languages', optionalAuth, ctrl.languages);
router.post('/', protect, ctrl.translate);
router.post('/speak', protect, ctrl.speak);

module.exports = router;
