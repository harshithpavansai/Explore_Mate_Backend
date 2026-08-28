const router = require('express').Router();
const ctrl = require('../controllers/audioTourController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.post('/', ctrl.generate);
router.get('/', ctrl.list);
router.get('/:id', ctrl.detail);

module.exports = router;
