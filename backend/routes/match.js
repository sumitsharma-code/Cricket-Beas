const express = require('express');
const router = express.Router();
const { createMatch, getMatches, getMatchById, startMatch, setActivePlayers, recordBall, endInnings } = require('../controllers/matchController');
const { protect, authorize, authorizeScorer } = require('../middleware/auth');

// Public views
router.get('/', getMatches);
router.get('/:id', getMatchById);

// Master Host scheduling operations
router.post('/', protect, authorize('Super Admin', 'Master Host'), createMatch);

// Scorer live-control operations (must be the single assigned scorer or Super Admin)
router.post('/:id/start', protect, authorizeScorer, startMatch);
router.post('/:id/active-players', protect, authorizeScorer, setActivePlayers);
router.post('/:id/ball', protect, authorizeScorer, recordBall);
router.post('/:id/end-innings', protect, authorizeScorer, endInnings);

module.exports = router;
