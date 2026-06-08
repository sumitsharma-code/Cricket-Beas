const Player = require('../models/Player');
const Match = require('../models/Match');

const getMostDucksFromMatches = async () => {
  return Match.aggregate([
    { $unwind: '$innings' },
    { $unwind: '$innings.battingScorecard' },
    {
      $match: {
        'innings.battingScorecard.outStatus': { $nin: ['DNB', 'Not Out', 'Retired Hurt'] },
        'innings.battingScorecard.runs': 0
      }
    },
    {
      $group: {
        _id: '$innings.battingScorecard.playerId',
        ducks: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'players',
        localField: '_id',
        foreignField: '_id',
        as: 'player'
      }
    },
    { $unwind: '$player' },
    {
      $project: {
        _id: '$player._id',
        name: '$player.name',
        stats: '$player.stats',
        ducks: 1
      }
    },
    { $sort: { ducks: -1, 'stats.batting.runs': 1 } },
    { $limit: 10 }
  ]);
};

exports.getLeaderboards = async (req, res) => {
  try {
    const liveMatches = await Match.find({ status: 'Live' });

    if (liveMatches.length === 0) {
      // 1. Orange Cap (Most Runs)
      const orangeCap = await Player.find({ 'stats.batting.runs': { $gt: 0 } })
        .sort({ 'stats.batting.runs': -1, 'stats.batting.innings': 1 })
        .limit(10);

      // 2. Purple Cap (Most Wickets)
      const purpleCap = await Player.find({ 'stats.bowling.wickets': { $gt: 0 } })
        .sort({ 'stats.bowling.wickets': -1, 'stats.bowling.runsConceded': 1 })
        .limit(10);

      // 3. Most Fours
      const mostFours = await Player.find({ 'stats.batting.fours': { $gt: 0 } })
        .sort({ 'stats.batting.fours': -1 })
        .limit(10);

      // 4. Most Sixes
      const mostSixes = await Player.find({ 'stats.batting.sixes': { $gt: 0 } })
        .sort({ 'stats.batting.sixes': -1 })
        .limit(10);

      // 5. Best Strike Rate (Min 15 balls faced)
      const bestStrikeRate = await Player.aggregate([
        { $match: { 'stats.batting.ballsFaced': { $gte: 15 } } },
        { 
          $addFields: { 
            strikeRate: { 
              $round: [
                { $multiply: [ { $divide: ['$stats.batting.runs', '$stats.batting.ballsFaced'] }, 100 ] }, 
                2
              ] 
            } 
          } 
        },
        { $sort: { strikeRate: -1, 'stats.batting.runs': -1 } },
        { $limit: 10 }
      ]);

      // 6. Best Economy (Min 12 balls/2 overs bowled)
      const bestEconomy = await Player.aggregate([
        { $match: { 'stats.bowling.ballsBowled': { $gte: 12 } } },
        { 
          $addFields: { 
            economyRate: { 
              $round: [
                { $multiply: [ { $divide: ['$stats.bowling.runsConceded', '$stats.bowling.ballsBowled'] }, 6 ] }, 
                2
              ] 
            } 
          } 
        },
        { $sort: { economyRate: 1, 'stats.bowling.wickets': -1 } },
        { $limit: 10 }
      ]);

      // 7. Most Dot Balls
      const mostDotBalls = await Player.find({ 'stats.bowling.dotBalls': { $gt: 0 } })
        .sort({ 'stats.bowling.dotBalls': -1 })
        .limit(10);

      // 8. Most Catches
      const mostCatches = await Player.find({ 'stats.fielding.catches': { $gt: 0 } })
        .sort({ 'stats.fielding.catches': -1 })
        .limit(10);

      // 9. Most Ducks
      let mostDucks = await Player.find({ 'stats.batting.ducks': { $gt: 0 } })
        .sort({ 'stats.batting.ducks': -1, 'stats.batting.runs': 1 })
        .limit(10);

      if (mostDucks.length === 0) {
        mostDucks = await getMostDucksFromMatches();
      }

      // 10. Highest Runs Run Rate by Bowler (runs per over bowled)
      const highestRunRate = await Player.aggregate([
        { $match: { 'stats.bowling.ballsBowled': { $gt: 0 } } },
        {
          $addFields: {
            oversBowled: { $divide: ['$stats.bowling.ballsBowled', 6] },
            runRate: {
              $round: [
                {
                  $divide: ['$stats.bowling.runsConceded', { $divide: ['$stats.bowling.ballsBowled', 6] }]
                },
                2
              ]
            }
          }
        },
        { $sort: { runRate: -1, 'stats.bowling.runsConceded': -1 } },
        { $limit: 10 }
      ]);

      // 11. MVP / Player of the Tournament
      const mvp = await Player.aggregate([
        {
          $addFields: {
            mvpPoints: {
              $round: [
                {
                  $subtract: [
                    {
                      $add: [
                        { $multiply: ['$stats.batting.runs', 1] },
                        { $multiply: ['$stats.batting.fours', 1] },
                        { $multiply: ['$stats.batting.sixes', 2] },
                        { $multiply: ['$stats.bowling.wickets', 20] },
                        { $multiply: ['$stats.bowling.maidens', 10] },
                        { $multiply: ['$stats.fielding.catches', 10] },
                        { $multiply: ['$stats.fielding.stumpings', 15] },
                        { $multiply: ['$stats.bowling.dotBalls', 0.5] }
                      ]
                    },
                    { $multiply: ['$stats.bowling.runsConceded', 0.5] }
                  ]
                },
                1
              ]
            }
          }
        },
        { $sort: { mvpPoints: -1 } },
        { $limit: 10 }
      ]);

      // 10. Emerging Player
      const emergingPlayer = await Player.aggregate([
        { $match: { 'stats.batting.innings': { $lte: 5 } } },
        {
          $addFields: {
            mvpPoints: {
              $round: [
                {
                  $subtract: [
                    {
                      $add: [
                        { $multiply: ['$stats.batting.runs', 1] },
                        { $multiply: ['$stats.batting.fours', 1] },
                        { $multiply: ['$stats.batting.sixes', 2] },
                        { $multiply: ['$stats.bowling.wickets', 20] },
                        { $multiply: ['$stats.bowling.maidens', 10] },
                        { $multiply: ['$stats.fielding.catches', 10] },
                        { $multiply: ['$stats.fielding.stumpings', 15] },
                        { $multiply: ['$stats.bowling.dotBalls', 0.5] }
                      ]
                    },
                    { $multiply: ['$stats.bowling.runsConceded', 0.5] }
                  ]
                },
                1
              ]
            }
          }
        },
        { $sort: { mvpPoints: -1 } },
        { $limit: 10 }
      ]);

      // Best Batting Average (Min 2 Innings)
      const bestAverage = await Player.aggregate([
        { $match: { 'stats.batting.innings': { $gte: 2 } } },
        { 
          $addFields: { 
            battingAverage: { 
              $cond: [
                { $gt: [ { $subtract: ['$stats.batting.innings', '$stats.batting.notOuts'] }, 0 ] },
                { $round: [ { $divide: ['$stats.batting.runs', { $subtract: ['$stats.batting.innings', '$stats.batting.notOuts'] }] }, 2 ] },
                { $cond: [ { $gt: ['$stats.batting.runs', 0] }, '$stats.batting.runs', 0 ] }
              ] 
            } 
          } 
        },
        { $sort: { battingAverage: -1, 'stats.batting.runs': -1 } },
        { $limit: 10 }
      ]);

      // Worst Batting Average (Min 2 Innings)
      const worstAverage = await Player.aggregate([
        { $match: { 'stats.batting.innings': { $gte: 2 } } },
        { 
          $addFields: { 
            battingAverage: { 
              $cond: [
                { $gt: [ { $subtract: ['$stats.batting.innings', '$stats.batting.notOuts'] }, 0 ] },
                { $round: [ { $divide: ['$stats.batting.runs', { $subtract: ['$stats.batting.innings', '$stats.batting.notOuts'] }] }, 2 ] },
                { $cond: [ { $gt: ['$stats.batting.runs', 0] }, '$stats.batting.runs', 0 ] }
              ] 
            } 
          } 
        },
        { $sort: { battingAverage: 1, 'stats.batting.runs': 1 } },
        { $limit: 10 }
      ]);

      return res.json({
        orangeCap,
        purpleCap,
        mostFours,
        mostSixes,
        bestStrikeRate,
        bestEconomy,
        mostDotBalls,
        mostCatches,
        mostDucks,
        highestRunRate,
        mvp,
        emergingPlayer,
        bestAverage,
        worstAverage,
      });
    }

    // If there are live matches, aggregate in memory to provide real-time updates
    const playerUpdates = {};

    const getOrCreateUpdate = (pid) => {
      const pidStr = pid.toString();
      if (!playerUpdates[pidStr]) {
        playerUpdates[pidStr] = {
          batting: { runs: 0, innings: 0, highestScore: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0, ducks: 0, ballsFaced: 0, notOuts: 0 },
          bowling: { wickets: 0, runsConceded: 0, ballsBowled: 0, maidens: 0, dotBalls: 0, bestBowling: { wickets: 0, runs: 0 } },
          fielding: { catches: 0, runOuts: 0, stumpings: 0 }
        };
      }
      return playerUpdates[pidStr];
    };

    for (const match of liveMatches) {
      for (const innings of match.innings) {
        // 1. Batting
        for (const batsman of innings.battingScorecard) {
          const pid = batsman.playerId?._id || batsman.playerId;
          if (!pid) continue;
          const update = getOrCreateUpdate(pid);

          update.batting.runs += batsman.runs;
          update.batting.ballsFaced += batsman.ballsFaced;
          update.batting.fours += batsman.fours;
          update.batting.sixes += batsman.sixes;

          if (batsman.runs >= 100) {
            update.batting.hundreds += 1;
          } else if (batsman.runs >= 50) {
            update.batting.fifties += 1;
          }

          if (batsman.outStatus !== 'DNB') {
            update.batting.innings += 1;
            if (batsman.outStatus === 'Not Out' || batsman.outStatus === 'Retired Hurt') {
              update.batting.notOuts += 1;
            }
            if (batsman.runs === 0 && batsman.outStatus !== 'Not Out' && batsman.outStatus !== 'Retired Hurt') {
              update.batting.ducks += 1;
            }
          }
          
          if (batsman.runs > update.batting.highestScore) {
            update.batting.highestScore = batsman.runs;
          }
        }

        // 2. Bowling
        for (const bowler of innings.bowlingScorecard) {
          const pid = bowler.playerId?._id || bowler.playerId;
          if (!pid) continue;
          const update = getOrCreateUpdate(pid);

          const balls = (bowler.overs * 6) + bowler.balls;
          update.bowling.runsConceded += bowler.runsConceded;
          update.bowling.ballsBowled += balls;
          update.bowling.wickets += bowler.wickets;
          update.bowling.maidens += bowler.maidens;
          update.bowling.dotBalls += bowler.dotBalls;

          const matchWickets = bowler.wickets;
          const matchRuns = bowler.runsConceded;
          if (matchWickets > update.bowling.bestBowling.wickets ||
             (matchWickets === update.bowling.bestBowling.wickets && matchRuns < update.bowling.bestBowling.runs) ||
             (update.bowling.bestBowling.wickets === 0 && update.bowling.bestBowling.runs === 0)) {
            update.bowling.bestBowling = { wickets: matchWickets, runs: matchRuns };
          }
        }

        // 3. Fielding
        for (const batsman of innings.battingScorecard) {
          if (batsman.fielderId) {
            const pid = batsman.fielderId?._id || batsman.fielderId;
            if (!pid) continue;
            const update = getOrCreateUpdate(pid);
            if (batsman.outStatus === 'Caught') update.fielding.catches += 1;
            else if (batsman.outStatus === 'Run Out') update.fielding.runOuts += 1;
            else if (batsman.outStatus === 'Stumped') update.fielding.stumpings += 1;
          }
        }
      }
    }

    const players = await Player.find().lean();

    for (const player of players) {
      const update = playerUpdates[player._id.toString()];
      if (update) {
        player.stats.batting.runs += update.batting.runs;
        player.stats.batting.ballsFaced += update.batting.ballsFaced;
        player.stats.batting.fours += update.batting.fours;
        player.stats.batting.sixes += update.batting.sixes;
        player.stats.batting.hundreds += update.batting.hundreds;
        player.stats.batting.fifties += update.batting.fifties;
        player.stats.batting.innings += update.batting.innings;
        player.stats.batting.notOuts += update.batting.notOuts;
        player.stats.batting.ducks += update.batting.ducks;
        if (update.batting.highestScore > player.stats.batting.highestScore) {
          player.stats.batting.highestScore = update.batting.highestScore;
        }

        player.stats.bowling.runsConceded += update.bowling.runsConceded;
        player.stats.bowling.ballsBowled += update.bowling.ballsBowled;
        player.stats.bowling.wickets += update.bowling.wickets;
        player.stats.bowling.maidens += update.bowling.maidens;
        player.stats.bowling.dotBalls += update.bowling.dotBalls;

        const currentBest = player.stats.bowling.bestBowling || { wickets: 0, runs: 0 };
        const liveBest = update.bowling.bestBowling;
        if (liveBest.wickets > currentBest.wickets ||
           (liveBest.wickets === currentBest.wickets && liveBest.runs < currentBest.runs) ||
           (currentBest.wickets === 0 && currentBest.runs === 0)) {
          player.stats.bowling.bestBowling = liveBest;
        }

        player.stats.fielding.catches += update.fielding.catches;
        player.stats.fielding.runOuts += update.fielding.runOuts;
        player.stats.fielding.stumpings += update.fielding.stumpings;
      }
    }

    const orangeCap = players
      .filter(p => p.stats.batting.runs > 0)
      .sort((a, b) => b.stats.batting.runs - a.stats.batting.runs || a.stats.batting.innings - b.stats.batting.innings)
      .slice(0, 10);

    const purpleCap = players
      .filter(p => p.stats.bowling.wickets > 0)
      .sort((a, b) => b.stats.bowling.wickets - a.stats.bowling.wickets || a.stats.bowling.runsConceded - b.stats.bowling.runsConceded)
      .slice(0, 10);

    const mostFours = players
      .filter(p => p.stats.batting.fours > 0)
      .sort((a, b) => b.stats.batting.fours - a.stats.batting.fours)
      .slice(0, 10);

    const mostSixes = players
      .filter(p => p.stats.batting.sixes > 0)
      .sort((a, b) => b.stats.batting.sixes - a.stats.batting.sixes)
      .slice(0, 10);

    const bestStrikeRate = players
      .filter(p => p.stats.batting.ballsFaced >= 15)
      .map(p => {
        const strikeRate = parseFloat(((p.stats.batting.runs / p.stats.batting.ballsFaced) * 100).toFixed(2));
        return { ...p, strikeRate };
      })
      .sort((a, b) => b.strikeRate - a.strikeRate || b.stats.batting.runs - a.stats.batting.runs)
      .slice(0, 10);

    const bestEconomy = players
      .filter(p => p.stats.bowling.ballsBowled >= 12)
      .map(p => {
        const economyRate = parseFloat(((p.stats.bowling.runsConceded / p.stats.bowling.ballsBowled) * 6).toFixed(2));
        return { ...p, economyRate };
      })
      .sort((a, b) => a.economyRate - b.economyRate || b.stats.bowling.wickets - a.stats.bowling.wickets)
      .slice(0, 10);

    const mostDotBalls = players
      .filter(p => p.stats.bowling.dotBalls > 0)
      .sort((a, b) => b.stats.bowling.dotBalls - a.stats.bowling.dotBalls)
      .slice(0, 10);

    const mostCatches = players
      .filter(p => p.stats.fielding.catches > 0)
      .sort((a, b) => b.stats.fielding.catches - a.stats.fielding.catches)
      .slice(0, 10);

    let mostDucks = players
      .filter(p => p.stats.batting.ducks > 0)
      .sort((a, b) => b.stats.batting.ducks - a.stats.batting.ducks || a.stats.batting.runs - b.stats.batting.runs)
      .slice(0, 10);

    if (mostDucks.length === 0) {
      mostDucks = await getMostDucksFromMatches();
    }

    const highestRunRate = players
      .filter(p => p.stats.bowling.ballsBowled > 0)
      .map(p => {
        const overs = p.stats.bowling.ballsBowled / 6;
        const runRate = parseFloat((p.stats.bowling.runsConceded / overs).toFixed(2));
        return { ...p, runRate };
      })
      .sort((a, b) => b.runRate - a.runRate || b.stats.bowling.runsConceded - a.stats.bowling.runsConceded)
      .slice(0, 10);

    const calculateMvpPoints = (p) => {
      const runs = p.stats.batting.runs || 0;
      const fours = p.stats.batting.fours || 0;
      const sixes = p.stats.batting.sixes || 0;
      const wickets = p.stats.bowling.wickets || 0;
      const maidens = p.stats.bowling.maidens || 0;
      const catches = p.stats.fielding.catches || 0;
      const stumpings = p.stats.fielding.stumpings || 0;
      const dotBalls = p.stats.bowling.dotBalls || 0;
      const runsConceded = p.stats.bowling.runsConceded || 0;

      const points = (runs * 1) + (fours * 1) + (sixes * 2) + (wickets * 20) + (maidens * 10) + (catches * 10) + (stumpings * 15) + (dotBalls * 0.5) - (runsConceded * 0.5);
      return parseFloat(points.toFixed(1));
    };

    const mvp = players
      .map(p => {
        const mvpPoints = calculateMvpPoints(p);
        return { ...p, mvpPoints };
      })
      .sort((a, b) => b.mvpPoints - a.mvpPoints)
      .slice(0, 10);

    const emergingPlayer = players
      .filter(p => p.stats.batting.innings <= 5)
      .map(p => {
        const mvpPoints = calculateMvpPoints(p);
        return { ...p, mvpPoints };
      })
      .sort((a, b) => b.mvpPoints - a.mvpPoints)
      .slice(0, 10);

    const bestAverage = players
      .filter(p => p.stats.batting.innings >= 2)
      .map(p => {
        const divisor = p.stats.batting.innings - p.stats.batting.notOuts;
        const battingAverage = divisor > 0
          ? parseFloat((p.stats.batting.runs / divisor).toFixed(2))
          : (p.stats.batting.runs > 0 ? parseFloat(p.stats.batting.runs.toFixed(2)) : 0);
        return { ...p, battingAverage };
      })
      .sort((a, b) => b.battingAverage - a.battingAverage || b.stats.batting.runs - a.stats.batting.runs)
      .slice(0, 10);

    const worstAverage = players
      .filter(p => p.stats.batting.innings >= 2)
      .map(p => {
        const divisor = p.stats.batting.innings - p.stats.batting.notOuts;
        const battingAverage = divisor > 0
          ? parseFloat((p.stats.batting.runs / divisor).toFixed(2))
          : (p.stats.batting.runs > 0 ? parseFloat(p.stats.batting.runs.toFixed(2)) : 0);
        return { ...p, battingAverage };
      })
      .sort((a, b) => a.battingAverage - b.battingAverage || a.stats.batting.runs - b.stats.batting.runs)
      .slice(0, 10);

    res.json({
      orangeCap,
      purpleCap,
      mostFours,
      mostSixes,
      bestStrikeRate,
      bestEconomy,
      mostDotBalls,
      mostCatches,
      mostDucks,
      highestRunRate,
      mvp,
      emergingPlayer,
      bestAverage,
      worstAverage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error generating leaderboards', error: error.message });
  }
};
