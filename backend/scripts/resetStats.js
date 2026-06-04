const mongoose = require('mongoose');
require('dotenv').config();

// register models
require('../models/Player');
require('../models/Team');

const Player = require('../models/Player');
const Team = require('../models/Team');

async function resetStats() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cricbeas';
  await mongoose.connect(mongoUri);
  console.log('Connected to', mongoUri);

  const zeroPlayerStats = {
    batting: {
      runs: 0,
      innings: 0,
      highestScore: 0,
      fours: 0,
      sixes: 0,
      fifties: 0,
      hundreds: 0,
      ducks: 0,
      ballsFaced: 0,
      notOuts: 0,
    },
    bowling: {
      wickets: 0,
      runsConceded: 0,
      ballsBowled: 0,
      maidens: 0,
      dotBalls: 0,
      bestBowling: { wickets: 0, runs: 0 },
    },
    fielding: {
      catches: 0,
      runOuts: 0,
      stumpings: 0,
    },
  };

  const zeroTeamStats = { played: 0, won: 0, lost: 0, draw: 0 };

  try {
    const pRes = await Player.updateMany({}, { $set: { stats: zeroPlayerStats } });
    console.log('Players updated:', pRes.modifiedCount || pRes.nModified || pRes.modifiedCount === 0 ? pRes.modifiedCount : pRes.n);

    const tRes = await Team.updateMany({}, { $set: { stats: zeroTeamStats } });
    console.log('Teams updated:', tRes.modifiedCount || tRes.nModified || tRes.modifiedCount === 0 ? tRes.modifiedCount : tRes.n);

    // Optional: clear any cached leaderboards collection if exists (not used currently)

    console.log('Reset complete.');
  } catch (err) {
    console.error('Error resetting stats:', err);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  resetStats();
}
