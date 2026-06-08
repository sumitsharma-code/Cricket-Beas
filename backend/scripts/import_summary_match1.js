const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { connectDB } = require('../config/db');

const Player = require('../models/Player');
const Team = require('../models/Team');
const Match = require('../models/Match');

const DATA_FILE = path.join(__dirname, 'match1.json');

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseOversString(s) {
  // expects "X.Y" where Y is balls in over (e.g., 4.2 means 4 overs and 2 balls)
  if (!s) return { overs: 0, balls: 0 };
  const parts = String(s).split('.');
  const overs = parseInt(parts[0], 10) || 0;
  const balls = parts.length > 1 ? parseInt(parts[1], 10) || 0 : 0;
  return { overs, balls };
}

async function findOrCreateTeam(name) {
  if (!name) return null;
  const team = await Team.findOne({ name: new RegExp(`^${escapeRegExp(name)}$`, 'i') });
  if (team) return team;
  return Team.create({ name });
}

async function findOrCreatePlayer(name) {
  if (!name) return null;
  const trimmed = name.trim();
  let player = await Player.findOne({ name: new RegExp(`^${escapeRegExp(trimmed)}$`, 'i') });
  if (player) return player;
  // create placeholder player with safe defaults
  player = new Player({
    name: trimmed,
    role: 'All-Rounder',
    battingStyle: 'Right-hand Batsman',
  });
  return player.save();
}

function mapOutStatus(battingRow) {
  if (battingRow.notOut) return 'Not Out';
  const text = (battingRow.dismissal || '').toLowerCase();
  if (text.startsWith('b ')) return 'Bowled';
  if (text.startsWith('c ')) return 'Caught';
  if (text.includes('run out')) return 'Run Out';
  // default to Other
  return 'Other';
}

async function importMatch() {
  await connectDB();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const data = JSON.parse(raw);

  // Teams
  const homeTeamName = data.teams[0];
  const awayTeamName = data.teams[1];
  const homeTeam = await findOrCreateTeam(homeTeamName);
  const awayTeam = await findOrCreateTeam(awayTeamName);

  const inningsDocs = [];

  for (const inn of data.innings) {
    const teamDoc = await findOrCreateTeam(inn.team);

    const battingScorecard = [];
    for (const b of inn.batting) {
      const player = await findOrCreatePlayer(b.name);
      battingScorecard.push({
        playerId: player._id,
        runs: b.runs || 0,
        ballsFaced: b.balls || 0,
        fours: b.fours || 0,
        sixes: b.sixes || 0,
        outStatus: mapOutStatus(b),
        dismissalText: b.dismissal || '',
      });
    }

    const bowlingScorecard = [];
    for (const bw of inn.bowling) {
      const player = await findOrCreatePlayer(bw.name);
      const parsed = parseOversString(bw.overs);
      bowlingScorecard.push({
        playerId: player._id,
        overs: parsed.overs,
        balls: parsed.balls,
        maidens: bw.maidens || 0,
        runsConceded: bw.runs || 0,
        wickets: bw.wickets || 0,
      });
    }

    const extras = {
      wides: inn.extras?.wides || 0,
      noballs: inn.extras?.noBalls || 0,
      byes: inn.extras?.byes || 0,
      legbyes: inn.extras?.legByes || 0,
      total: inn.extras?.total || 0,
    };

    const fallOfWickets = [];
    for (const f of (inn.fallOfWickets || [])) {
      const player = await findOrCreatePlayer(f.player);
      const parsed = parseOversString(f.over);
      fallOfWickets.push({
        wicketNo: f.wicketNumber,
        runs: f.score,
        overs: parsed.overs,
        balls: parsed.balls,
        playerId: player._id,
      });
    }

    const parsedOvers = parseOversString(inn.overs);
    const innDoc = {
      teamId: teamDoc._id,
      runs: inn.total || 0,
      wickets: inn.wickets || 0,
      overs: parsedOvers.overs,
      balls: parsedOvers.balls,
      extras,
      battingScorecard,
      bowlingScorecard,
      fallOfWickets,
      partnerships: [],
    };

    inningsDocs.push(innDoc);
  }

  // Build match doc
  const matchDoc = new Match({
    homeTeamId: homeTeam._id,
    awayTeamId: awayTeam._id,
    status: 'Completed',
    matchType: 'Custom',
    totalOvers: data.oversPerInnings || 0,
    innings: inningsDocs,
    winnerId: (await Team.findOne({ name: new RegExp(`^${escapeRegExp(data.result.winner)}$`, 'i') }))._id,
    resultDescription: `${data.result.winner} won by ${data.result.margin}`,
    createdAt: data.importedAt ? new Date(data.importedAt) : Date.now(),
  });

  await matchDoc.save();

  console.log('Match imported with id:', matchDoc._id.toString());
  console.log('To apply stats: node backend/scripts/apply_stats_for_match.js', matchDoc._id.toString());
  process.exit(0);
}

importMatch().catch(err => {
  console.error('Import error:', err);
  process.exit(1);
});
