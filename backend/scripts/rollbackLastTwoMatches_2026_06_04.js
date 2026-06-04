const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

require('../models/Player');
require('../models/Team');
const Player = require('../models/Player');
const Team = require('../models/Team');
const Match = require('../models/Match');

const TARGET_MATCH_IDS = [
  '6a21bf6d42f2e017e2cad95a',
  '6a21c2031222d9747efc0fe5',
];

const TEMP_TEAM_NAMES = [
  'Piyush Ki Pussies',
  'SHUBH ki SAHELIYA',
  'Pussy Distroyers',
  'Daily Gooners',
];

const zeroPlayerStats = () => ({
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
    bestBowling: {
      wickets: 0,
      runs: 0,
    },
  },
  fielding: {
    catches: 0,
    runOuts: 0,
    stumpings: 0,
  },
});

const zeroTeamStats = () => ({
  played: 0,
  won: 0,
  lost: 0,
  draw: 0,
});

const updatePlayerCareerStats = async (player, matchStats, roleInMatch) => {
  if (roleInMatch === 'batting') {
    player.stats.batting.runs += matchStats.runs;
    player.stats.batting.ballsFaced += matchStats.ballsFaced;
    player.stats.batting.fours += matchStats.fours;
    player.stats.batting.sixes += matchStats.sixes;

    if (matchStats.runs >= 100) {
      player.stats.batting.hundreds += 1;
    } else if (matchStats.runs >= 50) {
      player.stats.batting.fifties += 1;
    }

    if (matchStats.outStatus !== 'DNB') {
      player.stats.batting.innings += 1;
      if (matchStats.outStatus === 'Not Out' || matchStats.outStatus === 'Retired Hurt') {
        player.stats.batting.notOuts += 1;
      }
      if (matchStats.runs === 0 && matchStats.outStatus !== 'Not Out' && matchStats.outStatus !== 'Retired Hurt') {
        player.stats.batting.ducks += 1;
      }
    }

    if (matchStats.runs > player.stats.batting.highestScore) {
      player.stats.batting.highestScore = matchStats.runs;
    }
  } else if (roleInMatch === 'bowling') {
    player.stats.bowling.runsConceded += matchStats.runsConceded;
    player.stats.bowling.ballsBowled += (matchStats.overs * 6) + matchStats.balls;
    player.stats.bowling.wickets += matchStats.wickets;
    player.stats.bowling.maidens += matchStats.maidens;
    player.stats.bowling.dotBalls += matchStats.dotBalls;

    const currentBest = player.stats.bowling.bestBowling;
    if (
      matchStats.wickets > currentBest.wickets ||
      (matchStats.wickets === currentBest.wickets && matchStats.runsConceded < currentBest.runs) ||
      (currentBest.wickets === 0 && currentBest.runs === 0)
    ) {
      player.stats.bowling.bestBowling = {
        wickets: matchStats.wickets,
        runs: matchStats.runsConceded,
      };
    }
  } else if (roleInMatch === 'fielding') {
    player.stats.fielding.catches += matchStats.catches || 0;
    player.stats.fielding.runOuts += matchStats.runOuts || 0;
    player.stats.fielding.stumpings += matchStats.stumpings || 0;
  }

  await player.save();
};

async function applyMatchToStats(match) {
  const teamStats = new Map();
  teamStats.set(match.homeTeamId.toString(), { played: 1, won: 0, lost: 0, draw: 0 });
  teamStats.set(match.awayTeamId.toString(), { played: 1, won: 0, lost: 0, draw: 0 });

  if (match.winnerId) {
    const winnerId = match.winnerId.toString();
    const loserId = winnerId === match.homeTeamId.toString() ? match.awayTeamId.toString() : match.homeTeamId.toString();
    if (teamStats.has(winnerId)) teamStats.get(winnerId).won = 1;
    if (teamStats.has(loserId)) teamStats.get(loserId).lost = 1;
  } else {
    teamStats.get(match.homeTeamId.toString()).draw = 1;
    teamStats.get(match.awayTeamId.toString()).draw = 1;
  }

  for (const [teamId, stats] of teamStats.entries()) {
    const team = await Team.findById(teamId);
    if (!team) continue;
    team.stats.played += stats.played;
    team.stats.won += stats.won;
    team.stats.lost += stats.lost;
    team.stats.draw += stats.draw;
    await team.save();
  }

  for (const innings of match.innings || []) {
    for (const batsman of innings.battingScorecard || []) {
      const player = await Player.findById(batsman.playerId);
      if (player) {
        await updatePlayerCareerStats(player, batsman, 'batting');
      }
    }

    for (const bowler of innings.bowlingScorecard || []) {
      const player = await Player.findById(bowler.playerId);
      if (player) {
        await updatePlayerCareerStats(player, bowler, 'bowling');
      }
    }

    for (const batsman of innings.battingScorecard || []) {
      if (batsman.fielderId) {
        const player = await Player.findById(batsman.fielderId);
        if (player) {
          const matchStats = { catches: 0, runOuts: 0, stumpings: 0 };
          if (batsman.outStatus === 'Caught') matchStats.catches = 1;
          else if (batsman.outStatus === 'Run Out') matchStats.runOuts = 1;
          else if (batsman.outStatus === 'Stumped') matchStats.stumpings = 1;
          await updatePlayerCareerStats(player, matchStats, 'fielding');
        }
      }
    }
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cricbeas');

  const targetMatches = await Match.find({ _id: { $in: TARGET_MATCH_IDS } }).lean();
  if (targetMatches.length === 0) {
    console.log('No target matches found; nothing to rollback.');
    return;
  }

  await Match.deleteMany({ _id: { $in: TARGET_MATCH_IDS } });

  const remainingMatches = await Match.find({ status: 'Completed' }).sort({ createdAt: 1 }).lean();

  await Player.updateMany({}, { $set: zeroPlayerStats() });
  await Team.updateMany({}, { $set: zeroTeamStats() });

  for (const match of remainingMatches) {
    await applyMatchToStats(match);
    await Match.updateOne(
      { _id: match._id },
      { $set: { careerStatsApplied: true, careerStatsAppliedAt: match.careerStatsAppliedAt || new Date() } }
    );
  }

  const referencedTeamIds = new Set(
    await Match.find({}, { homeTeamId: 1, awayTeamId: 1 }).lean().then((matches) =>
      matches.flatMap((match) => [match.homeTeamId?.toString(), match.awayTeamId?.toString()]).filter(Boolean)
    )
  );

  const teamsToDelete = await Team.find({ name: { $in: TEMP_TEAM_NAMES } }).lean();
  for (const team of teamsToDelete) {
    if (!referencedTeamIds.has(team._id.toString())) {
      await Team.deleteOne({ _id: team._id });
    }
  }

  console.log(JSON.stringify({
    removedMatches: targetMatches.map((match) => match._id.toString()),
    remainingCompletedMatches: remainingMatches.length,
    removedTempTeams: teamsToDelete.filter((team) => !referencedTeamIds.has(team._id.toString())).map((team) => team.name),
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
