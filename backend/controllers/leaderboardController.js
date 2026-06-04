const Player = require('../models/Player');

exports.getLeaderboards = async (req, res) => {
  try {
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

    // 9. MVP / Player of the Tournament
    // Points = runs * 1 + fours * 1 + sixes * 2 + wickets * 20 + maidenOvers * 10 + catches * 10 + stumpings * 15 + dotBalls * 0.5 - runsConceded * 0.5
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

    // 10. Emerging Player (MVP points but played 5 or fewer innings)
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

    res.json({
      orangeCap,
      purpleCap,
      mostFours,
      mostSixes,
      bestStrikeRate,
      bestEconomy,
      mostDotBalls,
      mostCatches,
      mvp,
      emergingPlayer,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error generating leaderboards', error: error.message });
  }
};
