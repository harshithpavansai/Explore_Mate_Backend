const router = require('express').Router();
const ctrl = require('../controllers/reviewController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

router.get('/destination/:id', optionalAuth, ctrl.listByDestination);
router.post('/', protect, ctrl.create);
router.delete('/:id', protect, ctrl.remove);

module.exports = router;
