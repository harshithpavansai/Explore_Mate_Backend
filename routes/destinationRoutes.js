const router = require('express').Router();
const ctrl = require('../controllers/destinationController');
const { protect, restrictTo, optionalAuth } = require('../middleware/authMiddleware');

router.get('/', optionalAuth, ctrl.list);
router.get('/trending', ctrl.trending);
router.get('/nearby', ctrl.nearby);
router.get('/:id', optionalAuth, ctrl.detail);

router.post('/',     protect, restrictTo('admin'), ctrl.createDestination);
router.put('/:id',   protect, restrictTo('admin'), ctrl.updateDestination);
router.delete('/:id',protect, restrictTo('admin'), ctrl.deleteDestination);

module.exports = router;
