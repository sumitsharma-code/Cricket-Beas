const express = require('express');
const router = express.Router();
const { getLeaderboards } = require('../controllers/leaderboardController');

router.get('/', getLeaderboards);

module.exports = router;
