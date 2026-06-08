const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { connectDB } = require('../config/db');
const Match = require('../models/Match');
const Player = require('../models/Player');

async function recompute() {
  await connectDB();
  console.log('Connected, scanning matches...');

  const matches = await Match.find({ status: { $in: ['Completed','Live'] } }).lean();

  const battingMax = {}; // playerId -> max runs
  const bowlingBest = {}; // playerId -> {wickets, runs}

  for (const match of matches) {
    for (const inn of match.innings || []) {
      for (const b of inn.battingScorecard || []) {
        const pid = (b.playerId && b.playerId._id) ? b.playerId._id.toString() : (b.playerId && b.playerId.toString ? b.playerId.toString() : null);
        if (!pid) continue;
        const runs = b.runs || 0;
        if (!battingMax[pid] || runs > battingMax[pid]) battingMax[pid] = runs;
      }

      for (const bw of inn.bowlingScorecard || []) {
        const pid = (bw.playerId && bw.playerId._id) ? bw.playerId._id.toString() : (bw.playerId && bw.playerId.toString ? bw.playerId.toString() : null);
        if (!pid) continue;
        const wickets = bw.wickets || 0;
        const runs = bw.runsConceded || bw.runs || 0;
        const current = bowlingBest[pid];
        if (!current || wickets > current.wickets || (wickets === current.wickets && runs < current.runs)) {
          bowlingBest[pid] = { wickets, runs };
        }
      }
    }
  }

  // Update players
  const players = await Player.find();
  let updated = 0;
  for (const p of players) {
    const pid = p._id.toString();
    const targetBat = battingMax[pid] || 0;
    const targetBowl = bowlingBest[pid] || { wickets: 0, runs: 0 };
    let changed = false;
    if ((p.stats?.batting?.highestScore || 0) !== targetBat) {
      p.stats = p.stats || {};
      p.stats.batting = p.stats.batting || {};
      p.stats.batting.highestScore = targetBat;
      changed = true;
    }
    if (!p.stats) p.stats = {};
    p.stats.bowling = p.stats.bowling || {};
    const curBest = p.stats.bowling.bestBowling || { wickets: 0, runs: 0 };
    if (curBest.wickets !== targetBowl.wickets || curBest.runs !== targetBowl.runs) {
      p.stats.bowling.bestBowling = targetBowl;
      changed = true;
    }
    if (changed) {
      await p.save();
      updated++;
    }
  }

  console.log('Recomputed highs for players. Updated:', updated);
  process.exit(0);
}

recompute().catch(err => { console.error(err); process.exit(1); });
