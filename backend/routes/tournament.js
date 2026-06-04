const express = require('express');
const router = express.Router();
const { createTournament, getTournaments, getTournamentById, addTeamsToTournament, generateFixtures } = require('../controllers/tournamentController');
const { protect, authorize } = require('../middleware/auth');

// Public endpoints
router.get('/', getTournaments);
router.get('/:id', getTournamentById);

// Master Host / Super Admin operations
router.post('/', protect, authorize('Super Admin', 'Master Host'), createTournament);
router.post('/:id/teams', protect, authorize('Super Admin', 'Master Host'), addTeamsToTournament);
router.post('/:id/fixtures', protect, authorize('Super Admin', 'Master Host'), generateFixtures);

module.exports = router;
