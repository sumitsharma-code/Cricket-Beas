const Match = require('../models/Match');
const Player = require('../models/Player');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');

/**
 * Update aggregate stats for a player when a match ends.
 */
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
    
    // Check best bowling figures
    const currentBest = player.stats.bowling.bestBowling;
    if (matchStats.wickets > currentBest.wickets || 
       (matchStats.wickets === currentBest.wickets && matchStats.runsConceded < currentBest.runs) ||
       (currentBest.wickets === 0 && currentBest.runs === 0)) {
      player.stats.bowling.bestBowling = {
        wickets: matchStats.wickets,
        runs: matchStats.runsConceded
      };
    }
  } else if (roleInMatch === 'fielding') {
    player.stats.fielding.catches += matchStats.catches || 0;
    player.stats.fielding.runOuts += matchStats.runOuts || 0;
    player.stats.fielding.stumpings += matchStats.stumpings || 0;
  }
  
  await player.save();
};

/**
 * Update the overall tournament standings / points table.
 */
const updateTournamentPointsTable = async (tournamentId) => {
  if (!tournamentId) return;
  
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) return;
  
  // Find all matches for this tournament
  const matches = await Match.find({ tournamentId, status: 'Completed' });
  
  // Reset standings
  const standings = tournament.teams.map(teamId => ({
    teamId,
    played: 0,
    won: 0,
    lost: 0,
    tied: 0,
    points: 0,
    netRunRate: 0,
    runsScored: 0,
    oversFaced: 0,
    runsConceded: 0,
    oversBowled: 0,
  }));
  
  for (const match of matches) {
    if (!match.winnerId && match.resultDescription.toLowerCase().includes('tie')) {
      // Tied Match
      const t1 = standings.find(s => s.teamId.toString() === match.homeTeamId.toString());
      const t2 = standings.find(s => s.teamId.toString() === match.awayTeamId.toString());
      if (t1 && t2) {
        t1.played += 1; t1.tied += 1; t1.points += 1;
        t2.played += 1; t2.tied += 1; t2.points += 1;
      }
    } else if (match.winnerId) {
      // Decided Match
      const winnerIdStr = match.winnerId.toString();
      const loserIdStr = (match.homeTeamId.toString() === winnerIdStr) 
        ? match.awayTeamId.toString() 
        : match.homeTeamId.toString();
      
      const winner = standings.find(s => s.teamId.toString() === winnerIdStr);
      const loser = standings.find(s => s.teamId.toString() === loserIdStr);
      
      if (winner) {
        winner.played += 1;
        winner.won += 1;
        winner.points += 2;
      }
      if (loser) {
        loser.played += 1;
        loser.lost += 1;
      }
    }
    
    // Accumulate runs and overs for NRR
    // Innings 1
    const inn1 = match.innings[0];
    const inn2 = match.innings[1];
    if (inn1 && inn2) {
      const team1Id = inn1.teamId.toString();
      const team2Id = inn2.teamId.toString();
      
      const s1 = standings.find(s => s.teamId.toString() === team1Id);
      const s2 = standings.find(s => s.teamId.toString() === team2Id);
      
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
  
  // Calculate NRR: (Runs Scored / Overs Faced) - (Runs Conceded / Overs Bowled)
  standings.forEach(s => {
    const runRateScored = s.oversFaced > 0 ? (s.runsScored / s.oversFaced) : 0;
    const runRateConceded = s.oversBowled > 0 ? (s.runsConceded / s.oversBowled) : 0;
    s.netRunRate = parseFloat((runRateScored - runRateConceded).toFixed(3));
  });
  
  // Sort standings by points desc, NRR desc
  standings.sort((a, b) => b.points - a.points || b.netRunRate - a.netRunRate);
  
  tournament.pointsTable = standings;
  await tournament.save();
};

/**
 * Process a ball event and update the match document.
 */
exports.processBallEvent = async (match, ballData) => {
  const { runsScored, extraRuns, extraType, wicket, wagonWheel, commentaryText } = ballData;
  const innNo = match.currentInnings;
  const innings = match.innings[innNo - 1];
  
  const strikerId = match.currentState.strikerId;
  const nonStrikerId = match.currentState.nonStrikerId;
  const bowlerId = match.currentState.currentBowlerId;
  
  if (!strikerId || !nonStrikerId || !bowlerId) {
    throw new Error('Striker, Non-striker, and Bowler must be selected');
  }

  // 1. Find or initialize batsman & bowler scorecards in the current innings
  let batsmanCard = innings.battingScorecard.find(c => c.playerId.toString() === strikerId.toString());
  if (!batsmanCard) {
    batsmanCard = { playerId: strikerId, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, outStatus: 'Not Out' };
    innings.battingScorecard.push(batsmanCard);
    batsmanCard = innings.battingScorecard[innings.battingScorecard.length - 1];
  }
  
  let nonStrikerCard = innings.battingScorecard.find(c => c.playerId.toString() === nonStrikerId.toString());
  if (!nonStrikerCard) {
    nonStrikerCard = { playerId: nonStrikerId, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, outStatus: 'Not Out' };
    innings.battingScorecard.push(nonStrikerCard);
  }

  let bowlerCard = innings.bowlingScorecard.find(c => c.playerId.toString() === bowlerId.toString());
  if (!bowlerCard) {
    bowlerCard = { playerId: bowlerId, overs: 0, balls: 0, maidens: 0, runsConceded: 0, wickets: 0, dotBalls: 0 };
    innings.bowlingScorecard.push(bowlerCard);
    bowlerCard = innings.bowlingScorecard[innings.bowlingScorecard.length - 1];
  }

  // Find or initialize active partnership
  let activePartnership = innings.partnerships.find(
    p => (p.batsman1Id.toString() === strikerId.toString() && p.batsman2Id.toString() === nonStrikerId.toString()) ||
         (p.batsman1Id.toString() === nonStrikerId.toString() && p.batsman2Id.toString() === strikerId.toString())
  );
  if (!activePartnership) {
    activePartnership = { batsman1Id: strikerId, batsman2Id: nonStrikerId, runs: 0, balls: 0, extras: 0 };
    innings.partnerships.push(activePartnership);
    activePartnership = innings.partnerships[innings.partnerships.length - 1];
  }

  // 2. Initialize ball details
  let isLegalBall = true;
  let teamRunsThisBall = 0;
  let batsmanRunsThisBall = 0;
  let bowlerRunsThisBall = 0;
  let extraTypeStr = extraType || 'None';
  let ballDisplay = '0';

  if (extraTypeStr === 'Wide') {
    isLegalBall = false;
    teamRunsThisBall = 1 + (extraRuns || 0);
    bowlerRunsThisBall = 1 + (extraRuns || 0);
    innings.extras.wides += teamRunsThisBall;
    innings.extras.total += teamRunsThisBall;
    ballDisplay = `${teamRunsThisBall}wd`;
    activePartnership.extras += teamRunsThisBall;
  } else if (extraTypeStr === 'No Ball') {
    isLegalBall = false;
    // Off the bat runs go to batsman, otherwise go to byes/leg-byes
    batsmanRunsThisBall = runsScored || 0;
    teamRunsThisBall = 1 + batsmanRunsThisBall + (extraRuns || 0);
    bowlerRunsThisBall = 1 + batsmanRunsThisBall + (extraRuns || 0);
    innings.extras.noballs += 1 + (extraRuns || 0);
    innings.extras.total += 1 + (extraRuns || 0);
    
    // Batsman faces a ball
    batsmanCard.ballsFaced += 1;
    batsmanCard.runs += batsmanRunsThisBall;
    if (batsmanRunsThisBall === 4) batsmanCard.fours += 1;
    if (batsmanRunsThisBall === 6) batsmanCard.sixes += 1;
    
    activePartnership.runs += batsmanRunsThisBall;
    activePartnership.balls += 1;
    activePartnership.extras += 1 + (extraRuns || 0);
    
    ballDisplay = `${runsScored || 0}nb`;
    match.currentState.freeHit = true;
  } else {
    // Legal Ball (None, Bye, Leg Bye)
    batsmanCard.ballsFaced += 1;
    activePartnership.balls += 1;
    
    if (extraTypeStr === 'Bye') {
      teamRunsThisBall = extraRuns || 0;
      innings.extras.byes += teamRunsThisBall;
      innings.extras.total += teamRunsThisBall;
      ballDisplay = `${teamRunsThisBall}b`;
      activePartnership.extras += teamRunsThisBall;
    } else if (extraTypeStr === 'Leg Bye') {
      teamRunsThisBall = extraRuns || 0;
      innings.extras.legbyes += teamRunsThisBall;
      innings.extras.total += teamRunsThisBall;
      ballDisplay = `${teamRunsThisBall}lb`;
      activePartnership.extras += teamRunsThisBall;
    } else {
      // Normal runs scored off the bat
      batsmanRunsThisBall = runsScored || 0;
      teamRunsThisBall = batsmanRunsThisBall;
      bowlerRunsThisBall = batsmanRunsThisBall;
      
      batsmanCard.runs += batsmanRunsThisBall;
      if (batsmanRunsThisBall === 4) batsmanCard.fours += 1;
      if (batsmanRunsThisBall === 6) batsmanCard.sixes += 1;
      
      activePartnership.runs += batsmanRunsThisBall;
      
      ballDisplay = `${batsmanRunsThisBall}`;
    }
  }

  // Update team totals
  innings.runs += teamRunsThisBall;
  
  // Bowler updates
  bowlerCard.runsConceded += bowlerRunsThisBall;
  if (isLegalBall) {
    bowlerCard.balls += 1;
    if (teamRunsThisBall === 0) {
      bowlerCard.dotBalls += 1;
    }
    
    if (bowlerCard.balls === 6) {
      bowlerCard.overs += 1;
      bowlerCard.balls = 0;
    }
  }

  // 3. Process Wicket if fell
  let dismissedPlayerId = null;
  if (wicket && wicket.fell) {
    dismissedPlayerId = wicket.dismissedPlayerId || strikerId;
    innings.wickets += 1;
    
    const wType = wicket.type || 'Bowled';
    const fielderId = wicket.fielderId || null;
    
    // Update batsman scorecard who got out
    let outBatsmanCard = innings.battingScorecard.find(c => c.playerId.toString() === dismissedPlayerId.toString());
    if (outBatsmanCard) {
      outBatsmanCard.outStatus = wType;
      outBatsmanCard.bowlerId = bowlerId;
      outBatsmanCard.fielderId = fielderId;
      
      // Generate dismissal text
      let dText = '';
      if (wType === 'Bowled') dText = `b ${match.currentState.currentBowlerId ? 'Bowler' : 'Bowler'}`; // will replace in details
      else if (wType === 'Caught') dText = `c ${fielderId ? 'Fielder' : 'Fielder'} b Bowler`;
      else if (wType === 'LBW') dText = `lbw b Bowler`;
      else if (wType === 'Run Out') dText = `run out (${fielderId ? 'Fielder' : 'Fielder'})`;
      else if (wType === 'Stumped') dText = `st ${fielderId ? 'Fielder' : 'Fielder'} b Bowler`;
      else dText = `${wType}`;
      outBatsmanCard.dismissalText = dText;
    }

    // Bowler gets credit if it's not a run out/retired hurt/other
    if (['Bowled', 'Caught', 'LBW', 'Stumped', 'Hit Wicket'].includes(wType)) {
      bowlerCard.wickets += 1;
    }

    // Add to Fall of Wickets
    innings.fallOfWickets.push({
      wicketNo: innings.wickets,
      runs: innings.runs,
      overs: innings.overs,
      balls: innings.balls + (isLegalBall ? 1 : 0),
      playerId: dismissedPlayerId,
    });

    ballDisplay = 'W';
    
    // Clear the dismissed batsman from current state safely comparing IDs
    const strikerIdStr = strikerId._id ? strikerId._id.toString() : strikerId.toString();
    const dismissedPlayerIdStr = dismissedPlayerId._id ? dismissedPlayerId._id.toString() : dismissedPlayerId.toString();
    
    if (dismissedPlayerIdStr === strikerIdStr) {
      match.currentState.strikerId = null;
    } else {
      match.currentState.nonStrikerId = null;
    }
    
    // If a batsman is out, partnership ends
    // (A new partnership starts when the next batsman comes in)
  }

  // 4. Update overs for the innings
  if (isLegalBall) {
    innings.balls += 1;
    match.currentState.ballsBowledInOver += 1;
    
    if (innings.balls === 6) {
      innings.overs += 1;
      innings.balls = 0;
    }
  }

  match.currentState.runsInCurrentOver += teamRunsThisBall;
  match.currentState.lastBalls.push(ballDisplay);

  // 5. Strike Rotation
  // Normal runs strike rotation
  const totalRunsMovingStrike = extraTypeStr === 'Wide' ? (extraRuns || 0) : (runsScored || 0) + (extraRuns || 0);
  if (totalRunsMovingStrike % 2 !== 0 && !dismissedPlayerId) {
    // Swap striker and non-striker
    const temp = match.currentState.strikerId;
    match.currentState.strikerId = match.currentState.nonStrikerId;
    match.currentState.nonStrikerId = temp;
  }

  // End of Over checks
  let isOverEnd = false;
  if (match.currentState.ballsBowledInOver === 6) {
    isOverEnd = true;
    // Rotate strike at the end of the over
    const temp = match.currentState.strikerId;
    match.currentState.strikerId = match.currentState.nonStrikerId;
    match.currentState.nonStrikerId = temp;
    
    // Reset over state
    match.currentState.ballsBowledInOver = 0;
    match.currentState.runsInCurrentOver = 0;
    match.currentState.lastBalls = [];
    match.currentState.currentBowlerId = null; // Forces new bowler selection
  }

  // 6. Wagon Wheel coordinates
  if (wagonWheel && wagonWheel.x !== undefined && wagonWheel.y !== undefined) {
    match.wagonWheel.push({
      batsmanId: strikerId,
      runs: batsmanRunsThisBall,
      x: wagonWheel.x,
      y: wagonWheel.y,
    });
  }

  // 7. Add Commentary
  const currentOverFloat = innings.overs + (innings.balls / 6);
  match.commentary.unshift({
    over: innings.overs,
    ball: innings.balls || 6, // if 0 balls in over, it was the 6th ball of previous over
    batsmanId: strikerId,
    bowlerId,
    eventType: wicket?.fell ? 'wicket' : (extraTypeStr !== 'None' ? 'extra' : 'run'),
    runs: teamRunsThisBall,
    description: commentaryText || `Delivery by bowler to batsman. ${teamRunsThisBall} runs.`,
  });

  // Remove free hit flag if it was active
  if (isLegalBall && extraTypeStr !== 'No Ball') {
    match.currentState.freeHit = false;
  }

  // 8. Check Innings / Match Completion
  const totalBallsAllowed = match.totalOvers * 6;
  const currentBallsInnings1 = (match.innings[0].overs * 6) + match.innings[0].balls;
  
  if (match.currentInnings === 1) {
    // Inning 1 Ends if 10 wickets are down or overs are complete
    if (innings.wickets === 10 || currentBallsInnings1 >= totalBallsAllowed) {
      // Innings complete!
      // Add Innings 2 layout if not present
      if (match.innings.length === 1) {
        match.innings.push({
          teamId: match.homeTeamId.toString() === match.innings[0].teamId.toString() ? match.awayTeamId : match.homeTeamId,
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
      }
      match.currentInnings = 2;
      match.currentState.strikerId = null;
      match.currentState.nonStrikerId = null;
      match.currentState.currentBowlerId = null;
      match.currentState.ballsBowledInOver = 0;
      match.currentState.runsInCurrentOver = 0;
      match.currentState.lastBalls = [];
    }
  } else if (match.currentInnings === 2) {
    const target = match.innings[0].runs + 1;
    const currentBallsInnings2 = (match.innings[1].overs * 6) + match.innings[1].balls;
    
    // Inning 2 Ends if:
    // a. Batting team scores target runs (Chased)
    // b. Batting team is all out
    // c. Overs are complete
    if (match.innings[1].runs >= target) {
      match.status = 'Completed';
      match.winnerId = match.innings[1].teamId;
      match.resultDescription = `Team won by ${10 - match.innings[1].wickets} wickets`;
    } else if (match.innings[1].wickets === 10 || currentBallsInnings2 >= totalBallsAllowed) {
      match.status = 'Completed';
      if (match.innings[1].runs === match.innings[0].runs) {
        match.resultDescription = 'Match Tied!';
      } else {
        match.winnerId = match.innings[0].teamId;
        match.resultDescription = `Team won by ${match.innings[0].runs - match.innings[1].runs} runs`;
      }
    }
  }

  // Save the match
  await match.save();

  // If completed, trigger career stats recalculations and tournament points table updates
  if (match.status === 'Completed') {
    await updateMatchFinalStatistics(match);
  }

  return { match, isOverEnd };
};

/**
 * Recalculate and update database stats when a match completes
 */
async function updateMatchFinalStatistics(match) {
  // Update Team stats
  const homeTeam = await Team.findById(match.homeTeamId);
  const awayTeam = await Team.findById(match.awayTeamId);

  if (homeTeam && awayTeam) {
    homeTeam.stats.played += 1;
    awayTeam.stats.played += 1;
    
    if (match.winnerId) {
      if (match.winnerId.toString() === homeTeam._id.toString()) {
        homeTeam.stats.won += 1;
        awayTeam.stats.lost += 1;
      } else {
        awayTeam.stats.won += 1;
        homeTeam.stats.lost += 1;
      }
    } else {
      homeTeam.stats.draw += 1;
      awayTeam.stats.draw += 1;
    }
    
    await homeTeam.save();
    await awayTeam.save();
  }

  // Update Player career stats
  for (const innings of match.innings) {
    // 1. Batting Career Stats
    for (const batsman of innings.battingScorecard) {
      const player = await Player.findById(batsman.playerId);
      if (player) {
        await updatePlayerCareerStats(player, batsman, 'batting');
      }
    }

    // 2. Bowling Career Stats
    for (const bowler of innings.bowlingScorecard) {
      const player = await Player.findById(bowler.playerId);
      if (player) {
        await updatePlayerCareerStats(player, bowler, 'bowling');
      }
    }

    // 3. Fielding Career Stats (Extract from outStatus)
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

  // Update Tournament Standings
  if (match.tournamentId) {
    await updateTournamentPointsTable(match.tournamentId);
  }
}
