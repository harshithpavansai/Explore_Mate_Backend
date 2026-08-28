const router = require('express').Router();
const ctrl = require('../controllers/gameController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/me', ctrl.profile);
router.post('/award', ctrl.awardXp);
router.get('/leaderboard', ctrl.leaderboard);
router.get('/badges', ctrl.allBadges);
router.post('/badges/:code/grant', ctrl.grantBadge);
router.get('/missions', ctrl.missions);

module.exports = router;
