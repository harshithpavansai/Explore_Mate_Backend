const router = require('express').Router();
const ctrl = require('../controllers/tripController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.detail);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/generate-itinerary', ctrl.generateItinerary);
router.get('/:id/export-pdf', ctrl.exportPdf);

module.exports = router;
