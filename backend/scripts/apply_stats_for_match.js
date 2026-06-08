const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { connectDB } = require('../config/db');
const Match = require('../models/Match');
const Player = require('../models/Player');

const MATCH_ID = process.argv[2];

function parseOutStatus(dismissalText, notOutFlag) {
  if (notOutFlag) return 'Not Out';
  if (!dismissalText) return 'DNB';
  const t = dismissalText.toLowerCase();
  if (t.startsWith('b ')) return 'Bowled';
  if (t.startsWith('c ')) return 'Caught';
  if (t.includes('run out')) return 'Run Out';
  if (t.includes('stumped')) return 'Stumped';
  return 'Other';
}

async function applyStatsForMatch(matchId) {
  await connectDB();
  const match = await Match.findById(matchId).lean();
  if (!match) {
    console.error('Match not found:', matchId);
    process.exit(1);
  }

  if (match.careerStatsApplied) {
    console.log('Career stats already applied for match', matchId);
    process.exit(0);
  }

  const playerIncs = {}; // pid -> increments

  for (const inn of match.innings) {
    for (const b of inn.battingScorecard) {
      const pid = b.playerId;
      if (!pid) continue;
      const outStatus = b.outStatus || parseOutStatus(b.dismissalText, false);
      if (!playerIncs[pid]) playerIncs[pid] = { batting: {}, bowling: {}, fielding: {} };
      const inc = playerIncs[pid].batting;
      inc.runs = (inc.runs || 0) + (b.runs || 0);
      inc.ballsFaced = (inc.ballsFaced || 0) + (b.ballsFaced || 0);
      inc.fours = (inc.fours || 0) + (b.fours || 0);
      inc.sixes = (inc.sixes || 0) + (b.sixes || 0);
      inc.innings = (inc.innings || 0) + (b.outStatus === 'DNB' ? 0 : 1);
      if (b.outStatus === 'Not Out') inc.notOuts = (inc.notOuts || 0) + 1;
      if (b.runs === 0 && b.outStatus !== 'Not Out' && b.outStatus !== 'DNB') inc.ducks = (inc.ducks || 0) + 1;
      if (!inc.highestScore || b.runs > inc.highestScore) inc.highestScore = b.runs;
    }

    for (const bw of inn.bowlingScorecard) {
      const pid = bw.playerId;
      if (!pid) continue;
      if (!playerIncs[pid]) playerIncs[pid] = { batting: {}, bowling: {}, fielding: {} };
      const inc = playerIncs[pid].bowling;
      const balls = (bw.overs || 0) * 6 + (bw.balls || 0);
      inc.wickets = (inc.wickets || 0) + (bw.wickets || 0);
      inc.runsConceded = (inc.runsConceded || 0) + (bw.runsConceded || 0);
      inc.ballsBowled = (inc.ballsBowled || 0) + balls;
      inc.maidens = (inc.maidens || 0) + (bw.maidens || 0);
      inc.dotBalls = (inc.dotBalls || 0) + (bw.dotBalls || 0);
      // best bowling handled separately
      if (!inc.best || bw.wickets > (inc.best.wickets || 0) || (bw.wickets === (inc.best.wickets || 0) && bw.runsConceded < (inc.best.runs || Infinity))) {
        inc.best = { wickets: bw.wickets || 0, runs: bw.runsConceded || 0 };
      }
    }
  }

  // Apply increments
  for (const pid of Object.keys(playerIncs)) {
    const incs = playerIncs[pid];
    const update = { $inc: {}, $max: {} };
    if (incs.batting.runs) update.$inc['stats.batting.runs'] = incs.batting.runs;
    if (incs.batting.ballsFaced) update.$inc['stats.batting.ballsFaced'] = incs.batting.ballsFaced;
    if (incs.batting.fours) update.$inc['stats.batting.fours'] = incs.batting.fours;
    if (incs.batting.sixes) update.$inc['stats.batting.sixes'] = incs.batting.sixes;
    if (incs.batting.innings) update.$inc['stats.batting.innings'] = incs.batting.innings;
    if (incs.batting.notOuts) update.$inc['stats.batting.notOuts'] = incs.batting.notOuts;
    if (incs.batting.ducks) update.$inc['stats.batting.ducks'] = incs.batting.ducks;
    if (incs.batting.highestScore) update.$max['stats.batting.highestScore'] = incs.batting.highestScore;

    if (incs.bowling.wickets) update.$inc['stats.bowling.wickets'] = incs.bowling.wickets;
    if (incs.bowling.runsConceded) update.$inc['stats.bowling.runsConceded'] = incs.bowling.runsConceded;
    if (incs.bowling.ballsBowled) update.$inc['stats.bowling.ballsBowled'] = incs.bowling.ballsBowled;
    if (incs.bowling.maidens) update.$inc['stats.bowling.maidens'] = incs.bowling.maidens;
    if (incs.bowling.dotBalls) update.$inc['stats.bowling.dotBalls'] = incs.bowling.dotBalls;
    if (incs.bowling.best) update.$max['stats.bowling.bestBowling.wickets'] = incs.bowling.best.wickets;
    if (incs.bowling.best) update.$max['stats.bowling.bestBowling.runs'] = incs.bowling.best.runs;

    // Clean empty operators
    if (Object.keys(update.$inc).length === 0) delete update.$inc;
    if (Object.keys(update.$max).length === 0) delete update.$max;

    await Player.findByIdAndUpdate(pid, update);
  }

  // Mark match as applied
  await Match.findByIdAndUpdate(matchId, { careerStatsApplied: true, careerStatsAppliedAt: new Date() });
  console.log('Applied stats for match', matchId);
  process.exit(0);
}

const id = MATCH_ID;
if (!id) {
  console.error('Usage: node apply_stats_for_match.js <matchId>');
  process.exit(1);
}

applyStatsForMatch(id).catch(err => { console.error(err); process.exit(1); });
