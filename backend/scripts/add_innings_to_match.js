const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { connectDB } = require('../config/db');
const Match = require('../models/Match');
const Player = require('../models/Player');
const Team = require('../models/Team');
const fs = require('fs');

function parseOutStatus(dismissalText) {
  if (!dismissalText) return 'DNB';
  const t = dismissalText.toLowerCase();
  if (t.startsWith('b ')) return 'Bowled';
  if (t.startsWith('c ')) return 'Caught';
  if (t.includes('run out')) return 'Run Out';
  if (t.includes('stumped')) return 'Stumped';
  return 'Other';
}

function splitOversDecimal(val) {
  // Accept numeric like 1.4 meaning 1 over and 4 balls
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

function parseDismissalPlayers(dismissalText) {
  // returns { bowlerName, fielderName }
  if (!dismissalText) return {};
  const t = dismissalText.trim();
  const res = {};
  // c Fielder b Bowler
  const cMatch = t.match(/c\s+([^b]+?)\s+b\s+(.+)$/i);
  if (cMatch) {
    res.fielderName = cMatch[1].trim();
    res.bowlerName = cMatch[2].trim();
    return res;
  }
  const bMatch = t.match(/b\s+(.+)$/i);
  if (bMatch) {
    res.bowlerName = bMatch[1].trim();
    return res;
  }
  const roMatch = t.match(/run out\s*\(([^)]+)\)/i);
  if (roMatch) {
    res.fielderName = roMatch[1].trim();
    return res;
  }
  return res;
}

async function main() {
  const matchId = process.argv[2];
  const jsonPath = process.argv[3];
  if (!matchId || !jsonPath) {
    console.error('Usage: node add_innings_to_match.js <matchId> <secondInningsJsonFile>');
    process.exit(1);
  }

  await connectDB();

  let data;
  try {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (err) {
    console.error('Failed to read/parse JSON:', err.message);
    process.exit(1);
  }

  const match = await Match.findById(matchId);
  if (!match) {
    console.error('Match not found:', matchId);
    process.exit(1);
  }

  if ((match.innings || []).length >= 2) {
    console.error('Match already has two innings. Aborting.');
    process.exit(1);
  }

  // Find team by name
  const team = await Team.findOne({ name: new RegExp('^' + data.team.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') });
  if (!team) {
    console.error('Team not found:', data.team);
    process.exit(1);
  }

  const battingScorecard = [];
  for (const b of data.batting || []) {
    const player = await findOrCreatePlayerByName(b.name);
    const { bowlerName, fielderName } = parseDismissalPlayers(b.dismissal || b.dismissalText || b.dismissalText);
    const bowler = bowlerName ? await findOrCreatePlayerByName(bowlerName) : null;
    const fielder = fielderName ? await findOrCreatePlayerByName(fielderName) : null;
    battingScorecard.push({
      playerId: player._id,
      runs: b.runs || 0,
      ballsFaced: b.balls || 0,
      fours: b.fours || 0,
      sixes: b.sixes || 0,
      outStatus: parseOutStatus(b.dismissal || b.dismissalText),
      bowlerId: bowler ? bowler._id : null,
      fielderId: fielder ? fielder._id : null,
      dismissalText: b.dismissal || b.dismissalText || '',
    });
  }

  const bowlingScorecard = [];
  for (const bw of data.bowling || []) {
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

  const { overs, balls } = splitOversDecimal(data.overs);
  const inn = {
    teamId: team._id,
    runs: data.score || data.runs || 0,
    wickets: data.wickets || 0,
    overs,
    balls,
    extras: { total: data.extras || 0, wides: 0, noballs: 0, byes: 0, legbyes: 0 },
    battingScorecard,
    bowlingScorecard,
    fallOfWickets: [],
    partnerships: [],
  };

  match.innings = match.innings || [];
  match.innings.push(inn);
  match.currentInnings = match.innings.length;
  // update match status to Completed
  match.status = 'Completed';

  // Determine winner
  const firstInnings = match.innings[0];
  const secondInnings = match.innings[1];
  if (firstInnings && secondInnings) {
    if (secondInnings.runs > firstInnings.runs) {
      match.winnerId = secondInnings.teamId;
      match.resultDescription = `${team.name} won by ${secondInnings.runs - firstInnings.runs} runs`;
    } else if (secondInnings.runs < firstInnings.runs) {
      // winner is the other team
      const otherTeamId = (String(match.homeTeamId) === String(secondInnings.teamId)) ? match.awayTeamId : match.homeTeamId;
      match.winnerId = otherTeamId;
      match.resultDescription = `Won by ${firstInnings.runs - secondInnings.runs} runs`;
    } else {
      match.winnerId = null;
      match.resultDescription = 'Match tied';
    }
  }

  match.careerStatsApplied = false;
  match.careerStatsAppliedAt = null;

  await match.save();
  console.log('Second innings added to match', match._id.toString());
  console.log('Run the career-stats apply script to update player/team stats:');
  console.log(`  node backend/scripts/apply_stats_for_match.js ${match._id}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
