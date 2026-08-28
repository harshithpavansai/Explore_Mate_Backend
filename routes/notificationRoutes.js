const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', ctrl.list);
router.patch('/read-all', ctrl.markAllRead);
router.patch('/:id/read', ctrl.markRead);
router.delete('/:id', ctrl.remove);

router.post('/', restrictTo('admin'), ctrl.create);

module.exports = router;
