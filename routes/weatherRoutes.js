const router = require('express').Router();
const ctrl = require('../controllers/weatherController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, ctrl.current);

module.exports = router;
