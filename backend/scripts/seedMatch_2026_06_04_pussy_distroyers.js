const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Player = require('../models/Player');
const Team = require('../models/Team');
const Match = require('../models/Match');

const MATCH_DATE = new Date('2026-06-04T00:00:00.000Z');
const normalize = (value) => String(value || '').trim().toLowerCase();

const homeTeamName = 'Pussy Distroyers';
const awayTeamName = 'Daily Gooners';

const homeBatting = [
  { name: 'Akash', runs: 0, balls: 1, fours: 0, sixes: 0, outStatus: 'Bowled' },
  { name: 'Piyush', runs: 0, balls: 4, fours: 0, sixes: 0, outStatus: 'Caught' },
  { name: 'Malik', runs: 10, balls: 19, fours: 1, sixes: 0, outStatus: 'Not Out' },
  { name: 'Nikhil', runs: 4, balls: 9, fours: 0, sixes: 0, outStatus: 'Run Out' },
  { name: 'Darshil', runs: 1, balls: 3, fours: 0, sixes: 0, outStatus: 'LBW' },
  { name: 'Gursimrat', runs: 2, balls: 5, fours: 0, sixes: 0, outStatus: 'Caught' },
  { name: 'X', runs: 2, balls: 4, fours: 0, sixes: 0, outStatus: 'Run Out' },
  { name: 'Y', runs: 0, balls: 0, fours: 0, sixes: 0, outStatus: 'DNB' },
];

const homeBowling = [
  { name: 'Piyush', overs: 1.0, maidens: 1, runs: 0, wickets: 1 },
  { name: 'Darshil', overs: 2.0, maidens: 0, runs: 8, wickets: 1 },
  { name: 'Akash', overs: 2.0, maidens: 0, runs: 7, wickets: 1 },
  { name: 'Malik', overs: 1.0, maidens: 0, runs: 13, wickets: 0 },
  { name: 'Gursimrat', overs: 1.0, maidens: 0, runs: 5, wickets: 0 },
];

const awayBatting = [
  { name: 'Aryan', runs: 0, balls: 5, fours: 0, sixes: 0, outStatus: 'Bowled' },
  { name: 'Shubhdeep', runs: 10, balls: 19, fours: 1, sixes: 0, outStatus: 'Caught' },
  { name: 'Shivansh', runs: 5, balls: 12, fours: 0, sixes: 0, outStatus: 'LBW' },
  { name: 'Anurag', runs: 4, balls: 5, fours: 0, sixes: 0, outStatus: 'Not Out' },
  { name: 'Yuvraj', runs: 1, balls: 1, fours: 0, sixes: 0, outStatus: 'Not Out' },
];

const awayBowling = [
  { name: 'Shubhdeep', overs: 1.0, maidens: 0, runs: 6, wickets: 1 },
  { name: 'Aryan', overs: 2.0, maidens: 0, runs: 7, wickets: 3 },
  { name: 'Yuvraj', overs: 1.0, maidens: 0, runs: 10, wickets: 0 },
  { name: 'Anurag', overs: 1.0, maidens: 0, runs: 6, wickets: 0 },
  { name: 'Shivansh', overs: 1.0, maidens: 0, runs: 3, wickets: 1 },
  { name: 'Kaptaaan', overs: 1.0, maidens: 0, runs: 3, wickets: 1 },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cricbeas');

  const players = await Player.find({}).lean();
  const playerByName = new Map(players.map((player) => [normalize(player.name), player]));

  const getPlayerId = (name) => {
    const player = playerByName.get(normalize(name));
    return player ? player._id : null;
  };

  const buildPlayerIdList = (names) => names.map(getPlayerId).filter(Boolean);

  const getTeam = async (name, playerNames) => {
    const existing = await Team.findOne({ name });
    if (existing) return existing;
    return Team.create({
      name,
      players: buildPlayerIdList(playerNames),
      logo: '',
      managerId: null,
    });
  };

  const homeTeam = await getTeam(homeTeamName, ['Akash', 'Piyush', 'Malik', 'Nikhil', 'Darshil', 'Gursimrat']);
  const awayTeam = await getTeam(awayTeamName, ['Aryan', 'Shubhdeep', 'Shivansh', 'Anurag', 'Yuvraj']);

  const buildBattingScorecard = (entries) => entries
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

  const buildBowlingScorecard = (entries) => entries
    .map((entry) => {
      const playerId = getPlayerId(entry.name);
      if (!playerId) return null;
      const totalBalls = Math.round(entry.overs * 6);
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

  const resultDescription = 'Pussy Distroyers won by 2 runs';

  const existing = await Match.findOne({
    homeTeamId: homeTeam._id,
    awayTeamId: awayTeam._id,
    resultDescription,
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
        runs: 35,
        wickets: 6,
        overs: 7,
        balls: 0,
        extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0, total: 16 },
        battingScorecard: buildBattingScorecard(homeBatting),
        bowlingScorecard: buildBowlingScorecard(homeBowling),
        fallOfWickets: [],
        partnerships: [],
      },
      {
        teamId: awayTeam._id,
        runs: 33,
        wickets: 3,
        overs: 7,
        balls: 0,
        extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0, total: 13 },
        battingScorecard: buildBattingScorecard(awayBatting),
        bowlingScorecard: buildBowlingScorecard(awayBowling),
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
    resultDescription,
    assignedScorerId: null,
    createdAt: MATCH_DATE,
  });

  console.log(`Inserted match: ${match._id}`);
  console.log(JSON.stringify({
    match: 'Pussy Distroyers vs Daily Gooners',
    result: match.resultDescription,
    homeTeam: homeTeam.name,
    awayTeam: awayTeam.name,
    playersUsed: players
      .filter((player) => [
        'akash', 'piyush', 'malik', 'nikhil', 'darshil', 'gursimrat',
        'aryan', 'shubhdeep', 'shivansh', 'anurag', 'yuvraj'
      ].includes(normalize(player.name)))
      .map((player) => player.name),
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
