const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { connectDB } = require('../config/db');
const Match = require('../models/Match');
const Player = require('../models/Player');

const MATCH_ID = process.argv[2];

async function undoDoubleStats(matchId) {
  await connectDB();
  const match = await Match.findById(matchId);
  if (!match) {
    console.error('Match not found:', matchId);
    process.exit(1);
  }

  const playerIds = new Set();

  for (const inn of match.innings) {
    for (const b of inn.battingScorecard) {
      if (b.playerId) playerIds.add(b.playerId.toString());
    }
    for (const bw of inn.bowlingScorecard) {
      if (bw.playerId) playerIds.add(bw.playerId.toString());
    }
  }

  // Halve stats for all players in this match
  for (const pid of playerIds) {
    const player = await Player.findById(pid);
    if (!player) continue;

    // Halve all stats
    player.stats.batting.runs = Math.round((player.stats.batting.runs || 0) / 2);
    player.stats.batting.ballsFaced = Math.round((player.stats.batting.ballsFaced || 0) / 2);
    player.stats.batting.fours = Math.round((player.stats.batting.fours || 0) / 2);
    player.stats.batting.sixes = Math.round((player.stats.batting.sixes || 0) / 2);
    player.stats.batting.innings = Math.round((player.stats.batting.innings || 0) / 2);
    player.stats.batting.notOuts = Math.round((player.stats.batting.notOuts || 0) / 2);
    player.stats.batting.ducks = Math.round((player.stats.batting.ducks || 0) / 2);
    player.stats.batting.highestScore = Math.round((player.stats.batting.highestScore || 0) / 2);
    player.stats.bowling.wickets = Math.round((player.stats.bowling.wickets || 0) / 2);
    player.stats.bowling.runsConceded = Math.round((player.stats.bowling.runsConceded || 0) / 2);
    player.stats.bowling.ballsBowled = Math.round((player.stats.bowling.ballsBowled || 0) / 2);
    player.stats.bowling.maidens = Math.round((player.stats.bowling.maidens || 0) / 2);
    player.stats.bowling.dotBalls = Math.round((player.stats.bowling.dotBalls || 0) / 2);

    await player.save();
  }

  console.log('Halved stats for', playerIds.size, 'players in match', matchId);
  process.exit(0);
}

const id = MATCH_ID;
if (!id) {
  console.error('Usage: node undo_double_stats.js <matchId>');
  process.exit(1);
}

undoDoubleStats(id).catch(err => { console.error(err); process.exit(1); });
