const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { connectDB } = require('../config/db');
const Match = require('../models/Match');
const Team = require('../models/Team');
const Player = require('../models/Player');

async function run() {
  await connectDB();
  const id = '6a269f9f0a67672aecca470f'; // ID from import script output
  const match = await Match.findById(id).populate('homeTeamId awayTeamId innings.battingScorecard.playerId innings.bowlingScorecard.playerId innings.fallOfWickets.playerId').lean();
  if (!match) {
    console.log('Match not found with id', id);
    process.exit(1);
  }
  console.log('Match found:');
  console.log(JSON.stringify(match, null, 2));
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
