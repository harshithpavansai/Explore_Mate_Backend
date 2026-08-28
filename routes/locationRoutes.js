const router = require('express').Router();
const ctrl = require('../controllers/locationController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/geocode', optionalAuth, ctrl.geocode);
router.get('/reverse', optionalAuth, ctrl.reverse);
router.get('/nearby',  optionalAuth, ctrl.nearby);

module.exports = router;
