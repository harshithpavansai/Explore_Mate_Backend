const router = require('express').Router();
const ctrl = require('../controllers/hiddenGemsController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, ctrl.list);
router.get('/nearby', optionalAuth, ctrl.nearby);

module.exports = router;
