const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

require('../models/Player');
require('../models/Team');
const Match = require('../models/Match');
const Player = require('../models/Player');
const Team = require('../models/Team');

const TARGET_MATCH_ID = '6a21c2031222d9747efc0fe5';

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

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cricbeas');

  const match = await Match.findById(TARGET_MATCH_ID);
  if (!match) {
    throw new Error(`Match not found: ${TARGET_MATCH_ID}`);
  }

  if (match.careerStatsApplied) {
    console.log(`Career stats already applied for match ${match._id}`);
    return;
  }

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

  for (const innings of match.innings) {
    for (const batsman of innings.battingScorecard) {
      const player = await Player.findById(batsman.playerId);
      if (player) {
        await updatePlayerCareerStats(player, batsman, 'batting');
      }
    }

    for (const bowler of innings.bowlingScorecard) {
      const player = await Player.findById(bowler.playerId);
      if (player) {
        await updatePlayerCareerStats(player, bowler, 'bowling');
      }
    }

    for (const batsman of innings.battingScorecard) {
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

  match.careerStatsApplied = true;
  match.careerStatsAppliedAt = new Date();
  await match.save();

  console.log(`Applied career stats for match ${match._id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
