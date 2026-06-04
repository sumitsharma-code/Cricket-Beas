const express = require('express');
const router = express.Router();
const { createPlayer, getPlayers, getPlayerById, updatePlayer } = require('../controllers/playerController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getPlayers);
router.get('/:id', getPlayerById);
router.post('/', protect, authorize('Super Admin', 'Master Host'), createPlayer);
router.put('/:id', protect, updatePlayer);

module.exports = router;
