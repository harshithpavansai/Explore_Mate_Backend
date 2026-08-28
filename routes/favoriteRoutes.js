const router = require('express').Router();
const ctrl = require('../controllers/favoriteController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', ctrl.list);
router.post('/', ctrl.add);
router.delete('/:destinationId', ctrl.remove);

module.exports = router;
