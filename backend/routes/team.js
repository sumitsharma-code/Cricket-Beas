const express = require('express');
const router = express.Router();
const { createTeam, getTeams, getTeamById, addPlayerToTeam, removePlayerFromTeam } = require('../controllers/teamController');
const { protect } = require('../middleware/auth');

router.get('/', getTeams);
router.get('/:id', getTeamById);
router.post('/', protect, createTeam);
router.post('/:id/players', protect, addPlayerToTeam);
router.delete('/:id/players', protect, removePlayerFromTeam);

module.exports = router;
