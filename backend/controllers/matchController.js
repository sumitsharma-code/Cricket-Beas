const Match = require('../models/Match');
const Team = require('../models/Team');
const Player = require('../models/Player');
const BallEvent = require('../models/BallEvent');
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
      .populate('homeTeamId')
      .populate('awayTeamId')
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
    const { tossWonBy, tossDecision } = req.body;
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    match.status = 'Live';
    match.toss = { wonBy: tossWonBy, decision: tossDecision };
    match.currentInnings = 1;

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
