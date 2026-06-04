const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Player = require('../models/Player');
const Team = require('../models/Team');
const Match = require('../models/Match');

const MATCH_DATE = new Date('2026-06-04T00:00:00.000Z');

const battingLabels = {
  home: {
    teamName: 'Piyush Ki Pussies',
    score: '51/4',
    overs: 7.0,
    extras: 20,
    players: [
      { name: 'Piyush', runs: 14, balls: 11, fours: 1, sixes: 1, outStatus: 'Caught' },
      { name: 'Nikhil', runs: 10, balls: 14, fours: 1, sixes: 0, outStatus: 'Bowled' },
      { name: 'Darshil', runs: 6, balls: 6, fours: 1, sixes: 0, outStatus: 'LBW' },
      { name: 'Malik', runs: 0, balls: 5, fours: 0, sixes: 0, outStatus: 'Run Out' },
      { name: 'Akash', runs: 0, balls: 1, fours: 0, sixes: 0, outStatus: 'Run Out' },
      { name: 'Gursimrat', runs: 1, balls: 7, fours: 0, sixes: 0, outStatus: 'Not Out' },
    ],
  },
  away: {
    teamName: 'SHUBH ki SAHELIYA',
    score: '35/4',
    overs: 7.0,
    extras: 10,
    players: [
      { name: 'Aryan', runs: 2, balls: 7, fours: 0, sixes: 0, outStatus: 'Bowled' },
      { name: 'Shivansh', runs: 3, balls: 5, fours: 0, sixes: 0, outStatus: 'Caught' },
      { name: 'Anurag', runs: 12, balls: 10, fours: 2, sixes: 0, outStatus: 'LBW' },
      { name: 'Yuvraj', runs: 7, balls: 8, fours: 0, sixes: 0, outStatus: 'Run Out' },
      { name: 'Shubh', runs: 1, balls: 10, fours: 0, sixes: 0, outStatus: 'Not Out' },
      { name: 'Sehaj', runs: 0, balls: 2, fours: 0, sixes: 0, outStatus: 'Not Out' },
    ],
  },
};

const bowlingFigures = {
  home: [
    { name: 'Aryan', overs: 1.0, maidens: 0, runs: 14, wickets: 0 },
    { name: 'Shubhdeep', overs: 2.0, maidens: 0, runs: 14, wickets: 1 },
    { name: 'Yuvraj', overs: 1.0, maidens: 0, runs: 7, wickets: 1 },
    { name: 'Anurag', overs: 1.0, maidens: 0, runs: 4, wickets: 0 },
    { name: 'Sehaj', overs: 1.0, maidens: 0, runs: 12, wickets: 2 },
    { name: 'Darshil', overs: 1.0, maidens: 1, runs: 0, wickets: 0 },
  ],
  away: [
    { name: 'darshil', overs: 1.0, maidens: 0, runs: 4, wickets: 0 },
    { name: 'Akash', overs: 2.0, maidens: 0, runs: 4, wickets: 2 },
    { name: 'Malik', overs: 1.0, maidens: 0, runs: 10, wickets: 1 },
    { name: 'Gursimrat', overs: 1.0, maidens: 0, runs: 9, wickets: 0 },
    { name: 'Piyush', overs: 1.0, maidens: 0, runs: 8, wickets: 1 },
    { name: 'X', overs: 1.0, maidens: 1, runs: 0, wickets: 0 },
  ],
};

const normalize = (value) => String(value || '').trim().toLowerCase();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cricbeas');

  const players = await Player.find({}).lean();
  const playerByName = new Map(players.map((player) => [normalize(player.name), player]));

  const teamNameToPlayerNames = {
    'Piyush Ki Pussies': ['Piyush', 'Nikhil', 'Darshil', 'Akash', 'Gursimrat'],
    'SHUBH ki SAHELIYA': ['Aryan', 'Shivansh', 'Anurag', 'Yuvraj', 'Sehaj'],
  };

  const getPlayerId = (name) => {
    const player = playerByName.get(normalize(name));
    return player ? player._id : null;
  };

  const getTeam = async (name) => {
    const existing = await Team.findOne({ name });
    if (existing) return existing;

    const playerIds = (teamNameToPlayerNames[name] || [])
      .map(getPlayerId)
      .filter(Boolean);

    return Team.create({
      name,
      players: playerIds,
      logo: '',
      managerId: null,
    });
  };

  const homeTeam = await getTeam(battingLabels.home.teamName);
  const awayTeam = await getTeam(battingLabels.away.teamName);

  const buildBattingScorecard = (entries) =>
    entries
      .map((entry) => {
        const playerId = getPlayerId(entry.name);
        if (!playerId) return null;
        return {
          playerId,
          runs: entry.runs,
          ballsFaced: entry.balls,
          fours: entry.fours,
          sixes: entry.sixes,
          outStatus: entry.outStatus,
          dismissalText: entry.outStatus === 'Not Out' ? '' : entry.outStatus,
          bowlerId: null,
          fielderId: null,
        };
      })
      .filter(Boolean);

  const buildBowlingScorecard = (entries) =>
    entries
      .map((entry) => {
        const playerId = getPlayerId(entry.name);
        if (!playerId) return null;
        const totalBalls = Number((entry.overs * 6).toFixed(0));
        return {
          playerId,
          overs: entry.overs,
          balls: totalBalls % 6,
          maidens: entry.maidens,
          runsConceded: entry.runs,
          wickets: entry.wickets,
          dotBalls: 0,
        };
      })
      .filter(Boolean);

  const existing = await Match.findOne({
    homeTeamId: homeTeam._id,
    awayTeamId: awayTeam._id,
    resultDescription: 'Piyush Ki Pussies won by 16 runs',
  });

  if (existing) {
    console.log(`Match already exists: ${existing._id}`);
    return;
  }

  const match = await Match.create({
    tournamentId: null,
    homeTeamId: homeTeam._id,
    awayTeamId: awayTeam._id,
    status: 'Completed',
    matchType: 'Custom',
    totalOvers: 7,
    toss: { wonBy: null, decision: 'Bat' },
    currentInnings: 2,
    innings: [
      {
        teamId: homeTeam._id,
        runs: 51,
        wickets: 4,
        overs: 7,
        balls: 0,
        extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0, total: 20 },
        battingScorecard: buildBattingScorecard(battingLabels.home.players),
        bowlingScorecard: buildBowlingScorecard(bowlingFigures.home),
        fallOfWickets: [],
        partnerships: [],
      },
      {
        teamId: awayTeam._id,
        runs: 35,
        wickets: 4,
        overs: 7,
        balls: 0,
        extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0, total: 10 },
        battingScorecard: buildBattingScorecard(battingLabels.away.players),
        bowlingScorecard: buildBowlingScorecard(bowlingFigures.away),
        fallOfWickets: [],
        partnerships: [],
      },
    ],
    currentState: {
      strikerId: null,
      nonStrikerId: null,
      currentBowlerId: null,
      ballsBowledInOver: 0,
      runsInCurrentOver: 0,
      lastBalls: [],
      freeHit: false,
    },
    commentary: [],
    wagonWheel: [],
    playerOfTheMatchId: null,
    winnerId: homeTeam._id,
    resultDescription: 'Piyush Ki Pussies won by 16 runs',
    assignedScorerId: null,
    createdAt: MATCH_DATE,
  });

  console.log(`Inserted match: ${match._id}`);
  console.log(JSON.stringify({
    match: 'Piyush Ki Pussies vs SHUBH ki SAHELIYA',
    result: match.resultDescription,
    homeTeam: homeTeam.name,
    awayTeam: awayTeam.name,
    playersUsed: players.filter((player) => [
      'piyush', 'nikhil', 'darshil', 'akash', 'gursimrat',
      'aryan', 'shivansh', 'anurag', 'yuvraj', 'sehaj', 'shubhdeep'
    ].includes(normalize(player.name))).map((player) => player.name),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
