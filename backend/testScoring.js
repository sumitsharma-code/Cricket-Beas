const { processBallEvent } = require('./utils/scoringEngine');

class MockPlayer {
  constructor(id, name, role) {
    this._id = id;
    this.name = name;
    this.role = role;
    this.battingStyle = 'Right-hand Batsman';
    this.bowlingStyle = 'Right-arm Fast';
    this.stats = {
      batting: { runs: 0, innings: 0, highestScore: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0, ducks: 0, ballsFaced: 0, notOuts: 0 },
      bowling: { wickets: 0, runsConceded: 0, ballsBowled: 0, maidens: 0, dotBalls: 0, bestBowling: { wickets: 0, runs: 0 } },
      fielding: { catches: 0, runOuts: 0, stumpings: 0 }
    };
  }
  async save() { return this; }
}

class MockTeam {
  constructor(id, name, players) {
    this._id = id;
    this.name = name;
    this.players = players;
    this.stats = { played: 0, won: 0, lost: 0, draw: 0 };
  }
  async save() { return this; }
}

class MockMatch {
  constructor(homeTeam, awayTeam) {
    this._id = 'match123';
    this.homeTeamId = homeTeam;
    this.awayTeamId = awayTeam;
    this.status = 'Live';
    this.matchType = 'T20';
    this.totalOvers = 2;
    this.currentInnings = 1;
    this.assignedScorerId = 'scorer123'; // New field for RBAC single scorer locking
    this.innings = [{
      teamId: homeTeam._id,
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
    this.currentState = {
      strikerId: homeTeam.players[0],
      nonStrikerId: homeTeam.players[1],
      currentBowlerId: awayTeam.players[0],
      ballsBowledInOver: 0,
      runsInCurrentOver: 0,
      lastBalls: [],
      freeHit: false,
    };
    this.commentary = [];
    this.wagonWheel = [];
    this.winnerId = null;
    this.resultDescription = '';
  }
  async save() { return this; }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    console.log(`✅ PASS: ${message}`);
  } else {
    console.error(`❌ FAIL: ${message}. Expected: ${expected}, Got: ${actual}`);
  }
}

async function runTests() {
  console.log("=== CricBeas Scoring Engine Unit Tests (With Scorer Lock) ===");
  
  const p1 = new MockPlayer('p1', 'Batsman A', 'Batsman');
  const p2 = new MockPlayer('p2', 'Batsman B', 'Batsman');
  const p3 = new MockPlayer('p3', 'Batsman C', 'Batsman');
  const b1 = new MockPlayer('b1', 'Bowler A', 'Bowler');
  const b2 = new MockPlayer('b2', 'Bowler B', 'Bowler');
  
  const homeTeam = new MockTeam('t1', 'Strikers', [p1, p2, p3]);
  const awayTeam = new MockTeam('t2', 'Bowlers', [b1, b2]);
  
  const match = new MockMatch(homeTeam, awayTeam);
  
  const logScore = (step) => {
    const inn = match.innings[match.currentInnings - 1];
    console.log(`[${step}] Score: ${inn.runs}/${inn.wickets} (${inn.overs}.${inn.balls} ov). Striker: ${match.currentState.strikerId?.name}, Non-Striker: ${match.currentState.nonStrikerId?.name}. Bowler: ${match.currentState.currentBowlerId?.name}`);
  };

  // Test 1: Single run
  await processBallEvent(match, { runsScored: 1, extraType: 'None', extraRuns: 0 });
  logScore("Test 1 - Single");
  assertEqual(match.innings[0].runs, 1, "Team runs should be 1");
  assertEqual(match.innings[0].balls, 1, "Balls in over should be 1");
  assertEqual(match.currentState.strikerId._id, 'p2', "Striker should rotate to Batsman B");
  
  // Test 2: Dot
  await processBallEvent(match, { runsScored: 0, extraType: 'None', extraRuns: 0 });
  logScore("Test 2 - Dot Ball");
  assertEqual(match.innings[0].runs, 1, "Team runs should still be 1");
  assertEqual(match.innings[0].balls, 2, "Balls in over should be 2");
  
  // Test 3: Wide
  await processBallEvent(match, { runsScored: 0, extraType: 'Wide', extraRuns: 0 });
  logScore("Test 3 - Wide Delivery");
  assertEqual(match.innings[0].runs, 2, "Team runs should be 2");
  assertEqual(match.innings[0].balls, 2, "Balls in over should remain 2");

  // Test 4: Wicket
  await processBallEvent(match, { 
    runsScored: 0, 
    extraType: 'None', 
    extraRuns: 0,
    wicket: { fell: true, type: 'Caught', dismissedPlayerId: 'p2', fielderId: 'b2' }
  });
  logScore("Test 4 - Wicket (Caught)");
  assertEqual(match.innings[0].wickets, 1, "Wickets should be 1");
  assertEqual(match.currentState.strikerId, null, "Striker should be set to null for next player selection");

  // Select new striker
  match.currentState.strikerId = p3;

  // Test 5: No Ball
  await processBallEvent(match, { runsScored: 4, extraType: 'No Ball', extraRuns: 0 });
  logScore("Test 5 - No Ball + 4 runs");
  assertEqual(match.innings[0].runs, 7, "Team runs should be 7");
  assertEqual(match.currentState.freeHit, true, "Free hit flag should be active");

  // Test 6: Over End
  await processBallEvent(match, { runsScored: 0, extraType: 'None', extraRuns: 0 }); 
  await processBallEvent(match, { runsScored: 0, extraType: 'None', extraRuns: 0 }); 
  await processBallEvent(match, { runsScored: 0, extraType: 'None', extraRuns: 0 }); 
  logScore("Test 6 - Over End");
  assertEqual(match.innings[0].overs, 1, "Innings overs should be 1");
  assertEqual(match.currentState.currentBowlerId, null, "Bowler should be reset to null");
}

runTests().catch(console.error);
