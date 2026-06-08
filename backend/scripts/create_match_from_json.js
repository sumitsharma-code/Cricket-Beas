const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { connectDB } = require('../config/db');
const Match = require('../models/Match');
const Player = require('../models/Player');
const Team = require('../models/Team');
const fs = require('fs');

function parseOutStatus(dismissalText) {
  if (!dismissalText) return 'DNB';
  const t = String(dismissalText).toLowerCase();
  if (t === 'not out') return 'Not Out';
  if (t.startsWith('b ')) return 'Bowled';
  if (t.startsWith('c ')) return 'Caught';
  if (t.includes('run out')) return 'Run Out';
  if (t.includes('stumped')) return 'Stumped';
  return 'Other';
}

function splitOversDecimal(val) {
  const s = String(val || '0');
  if (!s.includes('.')) return { overs: parseInt(s, 10) || 0, balls: 0 };
  const [o, b] = s.split('.');
  return { overs: parseInt(o, 10) || 0, balls: parseInt(b, 10) || 0 };
}

async function findOrCreatePlayerByName(name) {
  if (!name) return null;
  const q = { name: new RegExp('^' + name.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') };
  let p = await Player.findOne(q);
  if (!p) {
    p = new Player({ name: name.trim(), role: 'Batsman', battingStyle: 'Right-hand Batsman', bowlingStyle: 'None' });
    await p.save();
    console.log('Created missing player:', p.name);
  }
  return p;
}

async function findOrCreateTeamByName(name) {
  if (!name) return null;
  const q = { name: new RegExp('^' + name.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') };
  let t = await Team.findOne(q);
  if (!t) {
    t = new Team({ name: name.trim() });
    await t.save();
    console.log('Created missing team:', t.name);
  }
  return t;
}

function parseDismissalPlayers(dismissalText) {
  if (!dismissalText) return {};
  const t = String(dismissalText).trim();
  const res = {};
  const cMatch = t.match(/c\s+([^b]+?)\s+b\s+(.+)$/i);
  if (cMatch) {
    res.fielderName = cMatch[1].trim();
    res.bowlerName = cMatch[2].trim();
    return res;
  }
  const bMatch = t.match(/b\s+(.+)$/i);
  if (bMatch) { res.bowlerName = bMatch[1].trim(); return res; }
  const roMatch = t.match(/run out\s*\(([^)]+)\)/i);
  if (roMatch) { res.fielderName = roMatch[1].trim(); return res; }
  return res;
}

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Usage: node create_match_from_json.js <matchJsonFile>');
    process.exit(1);
  }

  await connectDB();

  let data;
  try { data = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch (err) { console.error('Failed to read/parse JSON:', err.message); process.exit(1); }

  // Teams
  const team1 = await findOrCreateTeamByName(data.match.team1);
  const team2 = await findOrCreateTeamByName(data.match.team2);

  const inningsArr = [];
  for (const inn of data.innings || []) {
    const battingScorecard = [];
    for (const b of inn.batting || []) {
      const player = await findOrCreatePlayerByName(b.name);
      const { bowlerName, fielderName } = parseDismissalPlayers(b.dismissal || b.dismissalText || b.dismissal);
      const bowler = bowlerName ? await findOrCreatePlayerByName(bowlerName) : null;
      const fielder = fielderName ? await findOrCreatePlayerByName(fielderName) : null;
      battingScorecard.push({
        playerId: player._id,
        runs: b.runs || 0,
        ballsFaced: b.balls || 0,
        fours: b.fours || 0,
        sixes: b.sixes || 0,
        outStatus: parseOutStatus(b.dismissal || b.dismissalText || b.dismissal),
        bowlerId: bowler ? bowler._id : null,
        fielderId: fielder ? fielder._id : null,
        dismissalText: b.dismissal || b.dismissalText || '',
      });
    }

    const bowlingScorecard = [];
    for (const bw of inn.bowling || []) {
      const player = await findOrCreatePlayerByName(bw.name);
      const { overs, balls } = splitOversDecimal(bw.overs);
      bowlingScorecard.push({
        playerId: player._id,
        overs,
        balls,
        maidens: bw.maidens || 0,
        runsConceded: bw.runs || bw.runsConceded || 0,
        wickets: bw.wickets || 0,
        dotBalls: bw.dotBalls || 0,
      });
    }

    const { overs, balls } = splitOversDecimal(inn.overs);
    const team = await findOrCreateTeamByName(inn.team);
    inningsArr.push({
      teamId: team._id,
      runs: inn.score || inn.runs || 0,
      wickets: inn.wickets || 0,
      overs,
      balls,
      extras: { total: inn.extras || 0, wides: 0, noballs: 0, byes: 0, legbyes: 0 },
      battingScorecard,
      bowlingScorecard,
      fallOfWickets: [],
      partnerships: [],
    });
  }

  const matchDoc = new Match({
    homeTeamId: team1._id,
    awayTeamId: team2._id,
    status: 'Completed',
    matchType: 'Custom',
    totalOvers: 20,
    innings: inningsArr,
    currentInnings: inningsArr.length,
    createdAt: new Date(),
  });

  // winner
  if (data.match && data.match.winner) {
    const winnerTeam = await Team.findOne({ name: new RegExp('^' + data.match.winner.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') });
    if (winnerTeam) {
      matchDoc.winnerId = winnerTeam._id;
      matchDoc.resultDescription = data.match.margin ? `${data.match.winner} won by ${data.match.margin}` : `${data.match.winner} won`;
    }
  }

  // player of the match
  if (data.potm && data.potm.player) {
    const potm = await findOrCreatePlayerByName(data.potm.player);
    if (potm) matchDoc.playerOfTheMatchId = potm._id;
  }

  await matchDoc.save();
  console.log('Created match', matchDoc._id.toString());
  console.log('Run career stats apply:');
  console.log(`  node backend/scripts/apply_stats_for_match.js ${matchDoc._id}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
