const Match = require('../models/Match');
const Team = require('../models/Team');
const Player = require('../models/Player');
const BallEvent = require('../models/BallEvent');
const Tournament = require('../models/Tournament');
const { processBallEvent } = require('../utils/scoringEngine');

exports.createMatch = async (req, res) => {
  try {
    const { tournamentId, homeTeamId, awayTeamId, matchType, totalOvers, toss, assignedScorerId } = req.body;

    if (!homeTeamId || !awayTeamId) {
      return res.status(400).json({ message: 'Home and Away teams are required' });
    }

    // Check if teams exist
    const homeTeam = await Team.findById(homeTeamId);
    const awayTeam = await Team.findById(awayTeamId);
    if (!homeTeam || !awayTeam) {
      return res.status(404).json({ message: 'One or both teams not found' });
    }

    const match = new Match({
      tournamentId: tournamentId || null,
      homeTeamId,
      awayTeamId,
      matchType: matchType || 'T20',
      totalOvers: totalOvers || 20,
      toss: toss || { wonBy: null, decision: 'Bat' },
      status: 'Scheduled',
      currentInnings: 1,
      innings: [],
      assignedScorerId: assignedScorerId || req.user.id, // Defaults to the master host scheduling the match
    });

    const savedMatch = await match.save();
    res.status(201).json(savedMatch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating match', error: error.message });
  }
};

exports.getMatches = async (req, res) => {
  try {
    const { status, tournamentId } = req.query;
    let query = {};
    if (status) query.status = status;
    if (tournamentId) query.tournamentId = tournamentId;

    const matches = await Match.find(query)
      .populate('homeTeamId', 'name logo')
      .populate('awayTeamId', 'name logo')
      .populate('winnerId', 'name logo')
      .sort({ createdAt: -1 });

    res.json(matches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching matches' });
  }
};

exports.getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate({ path: 'homeTeamId', populate: { path: 'players', select: 'name role _id' } })
      .populate({ path: 'awayTeamId', populate: { path: 'players', select: 'name role _id' } })
      .populate('winnerId')
      .populate('playerOfTheMatchId')
      .populate('assignedScorerId', 'username phone')
      .populate('currentState.strikerId')
      .populate('currentState.nonStrikerId')
      .populate('currentState.currentBowlerId')
      .populate('commentary.batsmanId')
      .populate('commentary.bowlerId')
      .populate('innings.battingScorecard.playerId')
      .populate('innings.battingScorecard.bowlerId')
      .populate('innings.battingScorecard.fielderId')
      .populate('innings.bowlingScorecard.playerId')
      .populate('innings.fallOfWickets.playerId')
      .populate('innings.partnerships.batsman1Id')
      .populate('innings.partnerships.batsman2Id')
      .populate('wagonWheel.batsmanId');

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    res.json(match);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching match details' });
  }
};

exports.startMatch = async (req, res) => {
  try {
    const { tossWonBy, tossDecision, totalOvers } = req.body;
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    match.status = 'Live';
    match.toss = { wonBy: tossWonBy, decision: tossDecision };
    match.currentInnings = 1;
    if (totalOvers) {
      match.totalOvers = Number(totalOvers);
    }

    const battingTeamId = tossDecision === 'Bat' ? tossWonBy : (match.homeTeamId.toString() === tossWonBy ? match.awayTeamId : match.homeTeamId);

    match.innings = [{
      teamId: battingTeamId,
      runs: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0, total: 0 },
      battingScorecard: [],
      bowlingScorecard: [],
      fallOfWickets: [],
      partnerships: [],
    }];

    await match.save();
    res.json(match);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error starting match', error: error.message });
  }
};

exports.setActivePlayers = async (req, res) => {
  try {
    const { strikerId, nonStrikerId, bowlerId } = req.body;
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (strikerId) match.currentState.strikerId = strikerId;
    if (nonStrikerId) match.currentState.nonStrikerId = nonStrikerId;
    if (bowlerId) match.currentState.currentBowlerId = bowlerId;

    await match.save();

    const io = req.app.get('socketio');
    if (io) {
      io.to(`match:${match._id}`).emit('match-update', match);
    }

    res.json(match);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error setting active players' });
  }
};

exports.recordBall = async (req, res) => {
  try {
    const { runsScored, extraRuns, extraType, wicket, wagonWheel, commentaryText } = req.body;
    let match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.status !== 'Live') {
      return res.status(400).json({ message: 'Match is not live' });
    }

    const currentOver = match.innings[match.currentInnings - 1].overs;
    const currentBall = match.innings[match.currentInnings - 1].balls + 1;

    const { match: updatedMatch, isOverEnd } = await processBallEvent(match, {
      runsScored,
      extraRuns,
      extraType,
      wicket,
      wagonWheel,
      commentaryText,
    });

    const ballEvent = new BallEvent({
      matchId: updatedMatch._id,
      inningsNo: updatedMatch.currentInnings,
      over: currentOver,
      ball: currentBall,
      batsmanId: updatedMatch.currentState.strikerId || (wicket?.dismissedPlayerId ? wicket.dismissedPlayerId : updatedMatch.currentState.strikerId),
      bowlerId: updatedMatch.currentState.currentBowlerId,
      runsScored: runsScored || 0,
      extraRuns: extraRuns || 0,
      extraType: extraType || 'None',
      wicket: wicket || { fell: false },
      wagonWheel: wagonWheel || { x: null, y: null },
      commentary: commentaryText || '',
    });
    
    if (!ballEvent.batsmanId) {
      ballEvent.batsmanId = wicket?.dismissedPlayerId || updatedMatch.currentState.strikerId;
    }
    if (!ballEvent.bowlerId) {
      const inn = updatedMatch.innings[updatedMatch.currentInnings - 1];
      if (inn.bowlingScorecard.length > 0) {
        ballEvent.bowlerId = inn.bowlingScorecard[inn.bowlingScorecard.length - 1].playerId;
      }
    }
    await ballEvent.save();

    const io = req.app.get('socketio');
    if (io) {
      io.to(`match:${updatedMatch._id}`).emit('match-update', updatedMatch);

      if (wicket?.fell) {
        io.emit('match-alert', { 
          type: 'wicket', 
          message: `Wicket fell in Match!`, 
          matchId: updatedMatch._id 
        });
      } else if (runsScored === 4 || runsScored === 6) {
        io.emit('match-alert', { 
          type: 'boundary', 
          message: `${runsScored === 6 ? 'SIX' : 'FOUR'} scored!`, 
          matchId: updatedMatch._id 
        });
      }
    }

    res.json({ match: updatedMatch, isOverEnd });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error recording ball' });
  }
};

exports.endInnings = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.currentInnings === 1) {
      match.currentInnings = 2;
      const battingTeamId = match.homeTeamId.toString() === match.innings[0].teamId.toString() ? match.awayTeamId : match.homeTeamId;
      match.innings.push({
        teamId: battingTeamId,
        runs: 0,
        wickets: 0,
        overs: 0,
        balls: 0,
        extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0, total: 0 },
        battingScorecard: [],
        bowlingScorecard: [],
        fallOfWickets: [],
        partnerships: [],
      });
      match.currentState.strikerId = null;
      match.currentState.nonStrikerId = null;
      match.currentState.currentBowlerId = null;
      match.currentState.ballsBowledInOver = 0;
      match.currentState.runsInCurrentOver = 0;
      match.currentState.lastBalls = [];
    } else {
      match.status = 'Completed';
      const inn1 = match.innings[0];
      const inn2 = match.innings[1];
      if (inn2.runs > inn1.runs) {
        match.winnerId = inn2.teamId;
        match.resultDescription = `Team won by ${10 - inn2.wickets} wickets`;
      } else if (inn1.runs > inn2.runs) {
        match.winnerId = inn1.teamId;
        match.resultDescription = `Team won by ${inn1.runs - inn2.runs} runs`;
      } else {
        match.resultDescription = `Match Tied!`;
      }
    }

    await match.save();
    
    const io = req.app.get('socketio');
    if (io) {
      io.to(`match:${match._id}`).emit('match-update', match);
    }

    res.json(match);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error manually ending innings' });
  }
};

const updatePlayerCareerStatsHelper = async (player, matchStats, roleInMatch) => {
  if (roleInMatch === 'batting') {
    player.stats.batting.runs += matchStats.runs;
    player.stats.batting.ballsFaced += matchStats.ballsFaced;
    player.stats.batting.fours += matchStats.fours;
    player.stats.batting.sixes += matchStats.sixes;
    if (matchStats.runs >= 100) player.stats.batting.hundreds += 1;
    else if (matchStats.runs >= 50) player.stats.batting.fifties += 1;
    if (matchStats.outStatus !== 'DNB') {
      player.stats.batting.innings += 1;
      if (matchStats.outStatus === 'Not Out' || matchStats.outStatus === 'Retired Hurt') player.stats.batting.notOuts += 1;
      if (matchStats.runs === 0 && matchStats.outStatus !== 'Not Out' && matchStats.outStatus !== 'Retired Hurt') player.stats.batting.ducks += 1;
    }
    if (matchStats.runs > player.stats.batting.highestScore) player.stats.batting.highestScore = matchStats.runs;
  } else if (roleInMatch === 'bowling') {
    player.stats.bowling.runsConceded += matchStats.runsConceded;
    player.stats.bowling.ballsBowled += (matchStats.overs * 6) + matchStats.balls;
    player.stats.bowling.wickets += matchStats.wickets;
    player.stats.bowling.maidens += matchStats.maidens;
    player.stats.bowling.dotBalls += matchStats.dotBalls;
    const currentBest = player.stats.bowling.bestBowling;
    if (matchStats.wickets > currentBest.wickets || 
       (matchStats.wickets === currentBest.wickets && matchStats.runsConceded < currentBest.runs) ||
       (currentBest.wickets === 0 && currentBest.runs === 0)) {
      player.stats.bowling.bestBowling = { wickets: matchStats.wickets, runs: matchStats.runsConceded };
    }
  } else if (roleInMatch === 'fielding') {
    player.stats.fielding.catches += matchStats.catches || 0;
    player.stats.fielding.runOuts += matchStats.runOuts || 0;
    player.stats.fielding.stumpings += matchStats.stumpings || 0;
  }
  await player.save();
};

const recalculateAllStatsHelper = async () => {
  const zeroPlayerStats = {
    batting: { runs: 0, innings: 0, highestScore: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0, ducks: 0, ballsFaced: 0, notOuts: 0 },
    bowling: { wickets: 0, runsConceded: 0, ballsBowled: 0, maidens: 0, dotBalls: 0, bestBowling: { wickets: 0, runs: 0 } },
    fielding: { catches: 0, runOuts: 0, stumpings: 0 }
  };
  const zeroTeamStats = { played: 0, won: 0, lost: 0, draw: 0 };

  await Player.updateMany({}, { $set: { stats: zeroPlayerStats } });
  await Team.updateMany({}, { $set: { stats: zeroTeamStats } });

  const completedMatches = await Match.find({ status: 'Completed' }).sort({ createdAt: 1 });
  for (const match of completedMatches) {
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
        if (player) await updatePlayerCareerStatsHelper(player, batsman, 'batting');
      }
      for (const bowler of innings.bowlingScorecard) {
        const player = await Player.findById(bowler.playerId);
        if (player) await updatePlayerCareerStatsHelper(player, bowler, 'bowling');
      }
      for (const batsman of innings.battingScorecard) {
        if (batsman.fielderId) {
          const player = await Player.findById(batsman.fielderId);
          if (player) {
            const matchStats = { catches: 0, runOuts: 0, stumpings: 0 };
            if (batsman.outStatus === 'Caught') matchStats.catches = 1;
            else if (batsman.outStatus === 'Run Out') matchStats.runOuts = 1;
            else if (batsman.outStatus === 'Stumped') matchStats.stumpings = 1;
            await updatePlayerCareerStatsHelper(player, matchStats, 'fielding');
          }
        }
      }
    }
  }

  // Recalculate all tournament points tables
  const tournaments = await Tournament.find();
  for (const t of tournaments) {
    const matches = await Match.find({ tournamentId: t._id, status: 'Completed' });
    const standings = t.teams.map(teamId => ({
      teamId, played: 0, won: 0, lost: 0, tied: 0, points: 0, netRunRate: 0, runsScored: 0, oversFaced: 0, runsConceded: 0, oversBowled: 0
    }));

    for (const match of matches) {
      if (!match.winnerId && match.resultDescription.toLowerCase().includes('tie')) {
        const t1 = standings.find(s => s.teamId.toString() === match.homeTeamId.toString());
        const t2 = standings.find(s => s.teamId.toString() === match.awayTeamId.toString());
        if (t1 && t2) {
          t1.played += 1; t1.tied += 1; t1.points += 1;
          t2.played += 1; t2.tied += 1; t2.points += 1;
        }
      } else if (match.winnerId) {
        const winnerIdStr = match.winnerId.toString();
        const loserIdStr = (match.homeTeamId.toString() === winnerIdStr) ? match.awayTeamId.toString() : match.homeTeamId.toString();
        const winner = standings.find(s => s.teamId.toString() === winnerIdStr);
        const loser = standings.find(s => s.teamId.toString() === loserIdStr);
        if (winner) { winner.played += 1; winner.won += 1; winner.points += 2; }
        if (loser) { loser.played += 1; loser.lost += 1; }
      }
      const inn1 = match.innings[0];
      const inn2 = match.innings[1];
      if (inn1 && inn2) {
        const s1 = standings.find(s => s.teamId.toString() === inn1.teamId.toString());
        const s2 = standings.find(s => s.teamId.toString() === inn2.teamId.toString());
        if (s1 && s2) {
          s1.runsScored += inn1.runs;
          s1.oversFaced += inn1.overs + (inn1.balls / 6);
          s1.runsConceded += inn2.runs;
          s1.oversBowled += inn2.overs + (inn2.balls / 6);
          s2.runsScored += inn2.runs;
          s2.oversFaced += inn2.overs + (inn2.balls / 6);
          s2.runsConceded += inn1.runs;
          s2.oversBowled += inn1.overs + (inn1.balls / 6);
        }
      }
    }

    standings.forEach(s => {
      const runRateScored = s.oversFaced > 0 ? (s.runsScored / s.oversFaced) : 0;
      const runRateConceded = s.oversBowled > 0 ? (s.runsConceded / s.oversBowled) : 0;
      s.netRunRate = parseFloat((runRateScored - runRateConceded).toFixed(3));
    });

    standings.sort((a, b) => b.points - a.points || b.netRunRate - a.netRunRate);
    t.pointsTable = standings;
    await t.save();
  }
};

exports.undoLastBall = async (req, res) => {
  try {
    const matchId = req.params.id;
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    const lastBall = await BallEvent.findOne({ matchId }).sort({ createdAt: -1 });
    if (!lastBall) {
      return res.status(400).json({ message: 'No balls to undo' });
    }

    const wasCompleted = match.status === 'Completed';

    await BallEvent.deleteOne({ _id: lastBall._id });

    const innNo = lastBall.inningsNo;
    const innings = match.innings[innNo - 1];

    if (wasCompleted) {
      match.status = 'Live';
      match.winnerId = null;
      match.resultDescription = '';
    }

    match.currentInnings = innNo;

    let teamRunsThisBall = 0;
    let batsmanRunsThisBall = 0;
    let bowlerRunsThisBall = 0;
    const isLegalBall = lastBall.extraType !== 'Wide' && lastBall.extraType !== 'No Ball';

    if (lastBall.extraType === 'Wide') {
      teamRunsThisBall = 1 + lastBall.extraRuns;
      bowlerRunsThisBall = 1 + lastBall.extraRuns;
      innings.extras.wides = Math.max(0, innings.extras.wides - teamRunsThisBall);
      innings.extras.total = Math.max(0, innings.extras.total - teamRunsThisBall);
    } else if (lastBall.extraType === 'No Ball') {
      batsmanRunsThisBall = lastBall.runsScored || 0;
      teamRunsThisBall = 1 + batsmanRunsThisBall + lastBall.extraRuns;
      bowlerRunsThisBall = 1 + batsmanRunsThisBall + lastBall.extraRuns;
      innings.extras.noballs = Math.max(0, innings.extras.noballs - (1 + lastBall.extraRuns));
      innings.extras.total = Math.max(0, innings.extras.total - (1 + lastBall.extraRuns));
    } else {
      if (lastBall.extraType === 'Bye') {
        teamRunsThisBall = lastBall.extraRuns;
        innings.extras.byes = Math.max(0, innings.extras.byes - teamRunsThisBall);
        innings.extras.total = Math.max(0, innings.extras.total - teamRunsThisBall);
      } else if (lastBall.extraType === 'Leg Bye') {
        teamRunsThisBall = lastBall.extraRuns;
        innings.extras.legbyes = Math.max(0, innings.extras.legbyes - teamRunsThisBall);
        innings.extras.total = Math.max(0, innings.extras.total - teamRunsThisBall);
      } else {
        batsmanRunsThisBall = lastBall.runsScored || 0;
        teamRunsThisBall = batsmanRunsThisBall;
        bowlerRunsThisBall = batsmanRunsThisBall;
      }
    }

    innings.runs = Math.max(0, innings.runs - teamRunsThisBall);
    if (lastBall.wicket && lastBall.wicket.fell) {
      innings.wickets = Math.max(0, innings.wickets - 1);
      innings.fallOfWickets.pop();
    }

    if (isLegalBall) {
      if (innings.balls === 0) {
        if (innings.overs > 0) {
          innings.overs -= 1;
          innings.balls = 5;
        }
      } else {
        innings.balls -= 1;
      }
    }

    const batsmanCard = innings.battingScorecard.find(c => c.playerId.toString() === lastBall.batsmanId.toString());
    if (batsmanCard) {
      batsmanCard.runs = Math.max(0, batsmanCard.runs - batsmanRunsThisBall);
      if (lastBall.extraType !== 'Wide') {
        batsmanCard.ballsFaced = Math.max(0, batsmanCard.ballsFaced - 1);
      }
      if (batsmanRunsThisBall === 4) batsmanCard.fours = Math.max(0, batsmanCard.fours - 1);
      if (batsmanRunsThisBall === 6) batsmanCard.sixes = Math.max(0, batsmanCard.sixes - 1);

      if (lastBall.wicket && lastBall.wicket.fell && lastBall.wicket.dismissedPlayerId && lastBall.wicket.dismissedPlayerId.toString() === lastBall.batsmanId.toString()) {
        batsmanCard.outStatus = 'Not Out';
        batsmanCard.bowlerId = null;
        batsmanCard.fielderId = null;
        batsmanCard.dismissalText = '';
      }
    }

    if (lastBall.wicket && lastBall.wicket.fell && lastBall.wicket.dismissedPlayerId && lastBall.wicket.dismissedPlayerId.toString() !== lastBall.batsmanId.toString()) {
      const dismissedCard = innings.battingScorecard.find(c => c.playerId.toString() === lastBall.wicket.dismissedPlayerId.toString());
      if (dismissedCard) {
        dismissedCard.outStatus = 'Not Out';
        dismissedCard.bowlerId = null;
        dismissedCard.fielderId = null;
        dismissedCard.dismissalText = '';
      }
    }

    const bowlerCard = innings.bowlingScorecard.find(c => c.playerId.toString() === lastBall.bowlerId.toString());
    if (bowlerCard) {
      bowlerCard.runsConceded = Math.max(0, bowlerCard.runsConceded - bowlerRunsThisBall);
      if (lastBall.wicket && lastBall.wicket.fell && ['Bowled', 'Caught', 'LBW', 'Stumped', 'Hit Wicket'].includes(lastBall.wicket.type)) {
        bowlerCard.wickets = Math.max(0, bowlerCard.wickets - 1);
      }
      if (isLegalBall) {
        if (bowlerCard.balls === 0) {
          if (bowlerCard.overs > 0) {
            bowlerCard.overs -= 1;
            bowlerCard.balls = 5;
          }
        } else {
          bowlerCard.balls -= 1;
        }
        if (teamRunsThisBall === 0) {
          bowlerCard.dotBalls = Math.max(0, bowlerCard.dotBalls - 1);
        }
      }
    }

    const strikerIdStr = match.currentState.strikerId ? match.currentState.strikerId.toString() : '';
    let otherBatsmanId = null;
    if (lastBall.wicket && lastBall.wicket.fell && lastBall.wicket.dismissedPlayerId) {
      otherBatsmanId = lastBall.wicket.dismissedPlayerId.toString() === lastBall.batsmanId.toString()
        ? (match.currentState.strikerId || match.currentState.nonStrikerId)
        : lastBall.batsmanId;
    } else {
      otherBatsmanId = lastBall.batsmanId.toString() === strikerIdStr ? match.currentState.nonStrikerId : match.currentState.strikerId;
    }

    if (otherBatsmanId) {
      const otherIdStr = otherBatsmanId._id ? otherBatsmanId._id.toString() : otherBatsmanId.toString();
      const pship = innings.partnerships.find(
        p => (p.batsman1Id.toString() === lastBall.batsmanId.toString() && p.batsman2Id.toString() === otherIdStr) ||
             (p.batsman1Id.toString() === otherIdStr && p.batsman2Id.toString() === lastBall.batsmanId.toString())
      );
      if (pship) {
        pship.runs = Math.max(0, pship.runs - batsmanRunsThisBall);
        if (lastBall.extraType !== 'Wide') {
          pship.balls = Math.max(0, pship.balls - 1);
        }
        if (lastBall.extraType !== 'None') {
          pship.extras = Math.max(0, pship.extras - (teamRunsThisBall - batsmanRunsThisBall));
        }
      }
    }

    match.commentary.shift();
    if (lastBall.wagonWheel && lastBall.wagonWheel.x !== null && lastBall.wagonWheel.y !== null) {
      match.wagonWheel.pop();
    }

    if (lastBall.wicket && lastBall.wicket.fell && lastBall.wicket.dismissedPlayerId) {
      const dismissedPlayerId = lastBall.wicket.dismissedPlayerId;
      if (dismissedPlayerId.toString() === lastBall.batsmanId.toString()) {
        match.currentState.strikerId = dismissedPlayerId;
      } else {
        match.currentState.nonStrikerId = dismissedPlayerId;
      }
    }

    if (totalRunsMovingStrike % 2 !== 0) {
      const temp = match.currentState.strikerId;
      match.currentState.strikerId = match.currentState.nonStrikerId;
      match.currentState.nonStrikerId = temp;
    }

    const overBalls = await BallEvent.find({ matchId, inningsNo: innNo, over: innings.overs }).sort({ createdAt: 1 });
    match.currentState.ballsBowledInOver = overBalls.filter(b => b.extraType !== 'Wide' && b.extraType !== 'No Ball').length;
    match.currentState.runsInCurrentOver = overBalls.reduce((sum, b) => sum + b.runsScored + b.extraRuns + (b.extraType === 'Wide' || b.extraType === 'No Ball' ? 1 : 0), 0);
    match.currentState.lastBalls = overBalls.map(b => b.wicket.fell ? 'W' : (b.extraType === 'Wide' ? `${1+b.extraRuns}wd` : (b.extraType === 'No Ball' ? `${b.runsScored}nb` : (b.extraType === 'Bye' ? `${b.extraRuns}b` : (b.extraType === 'Leg Bye' ? `${b.extraRuns}lb` : `${b.runsScored}`)))));
    match.currentState.currentBowlerId = lastBall.bowlerId;

    await match.save();

    if (wasCompleted) {
      await recalculateAllStatsHelper();
    }

    const io = req.app.get('socketio');
    if (io) {
      io.to(`match:${match._id}`).emit('match-update', match);
    }

    res.json(match);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error undoing ball', error: error.message });
  }
};

exports.deleteMatch = async (req, res) => {
  try {
    const matchId = req.params.id;
    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    await BallEvent.deleteMany({ matchId });
    await Match.deleteOne({ _id: matchId });
    await recalculateAllStatsHelper();

    res.json({ message: 'Match and all associated statistics deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error deleting match', error: error.message });
  }
};
