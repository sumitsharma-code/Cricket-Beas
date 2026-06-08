const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

require('../models/Player');
require('../models/Team');
require('../models/Match');

const Player = require('../models/Player');
const Team = require('../models/Team');
const Match = require('../models/Match');

const matchData = {
  "match": {
    "team1": "Aryan ke Fuddu",
    "team2": "Sumit ke Chuddu",
    "result": "Aryan ke Fuddu won by 22 runs"
  },
  "innings": [
    {
      "innings": 1,
      "battingTeam": "Aryan ke Fuddu",
      "bowlingTeam": "Sumit ke Chuddu",
      "score": 51,
      "wickets": 2,
      "overs": 7.0,
      "extras": {
        "total": 9,
        "wides": 7,
        "noBalls": 2,
        "byes": 0,
        "legByes": 0
      },
      "batting": [
        {
          "name": "X",
          "runs": 2,
          "balls": 11,
          "fours": 0,
          "sixes": 0,
          "strikeRate": 18.2,
          "dismissal": "b Sumit"
        },
        {
          "name": "Shabad",
          "runs": 4,
          "balls": 12,
          "fours": 0,
          "sixes": 0,
          "strikeRate": 33.3,
          "dismissal": "b Darshil"
        },
        {
          "name": "Abhijot",
          "runs": 33,
          "balls": 16,
          "fours": 1,
          "sixes": 4,
          "strikeRate": 206.3,
          "dismissal": "not out"
        },
        {
          "name": "Aryan",
          "runs": 3,
          "balls": 5,
          "fours": 0,
          "sixes": 0,
          "strikeRate": 60.0,
          "dismissal": "not out"
        }
      ],
      "bowling": [
        {
          "name": "Sumit",
          "overs": 2.0,
          "maidens": 0,
          "runs": 4,
          "wickets": 1,
          "economy": 2.0
        },
        {
          "name": "Mohit",
          "overs": 1.0,
          "maidens": 0,
          "runs": 3,
          "wickets": 0,
          "economy": 3.0
        },
        {
          "name": "Anurag",
          "overs": 1.0,
          "maidens": 0,
          "runs": 8,
          "wickets": 0,
          "economy": 8.0
        },
        {
          "name": "Darshil",
          "overs": 2.0,
          "maidens": 0,
          "runs": 32,
          "wickets": 1,
          "economy": 16.0
        },
        {
          "name": "Yuvraj",
          "overs": 1.0,
          "maidens": 0,
          "runs": 4,
          "wickets": 0,
          "economy": 4.0
        }
      ],
      "fallOfWickets": [
        {
          "score": "1-6",
          "batsman": "X",
          "over": 2.5
        },
        {
          "score": "2-19",
          "batsman": "Shabad",
          "over": 4.5
        }
      ]
    },
    {
      "innings": 2,
      "battingTeam": "Sumit ke Chuddu",
      "bowlingTeam": "Aryan ke Fuddu",
      "score": 29,
      "wickets": 3,
      "overs": 6.1,
      "extras": {
        "total": 11,
        "wides": 11,
        "noBalls": 0,
        "byes": 0,
        "legByes": 0
      },
      "batting": [
        {
          "name": "Y",
          "runs": 11,
          "balls": 18,
          "fours": 1,
          "sixes": 1,
          "strikeRate": 61.1,
          "dismissal": "Retired - Not Out"
        },
        {
          "name": "Mohit",
          "runs": 0,
          "balls": 2,
          "fours": 0,
          "sixes": 0,
          "strikeRate": 0.0,
          "dismissal": "b Aryan"
        },
        {
          "name": "Darshil",
          "runs": 6,
          "balls": 16,
          "fours": 0,
          "sixes": 0,
          "strikeRate": 37.5,
          "dismissal": "Retired - Not Out"
        },
        {
          "name": "Yuvraj",
          "runs": 0,
          "balls": 1,
          "fours": 0,
          "sixes": 0,
          "strikeRate": 0.0,
          "dismissal": "b Aman"
        },
        {
          "name": "Sumit",
          "runs": 0,
          "balls": 2,
          "fours": 0,
          "sixes": 0,
          "strikeRate": 0.0,
          "dismissal": "c Shabad b Aman"
        },
        {
          "name": "Anurag",
          "runs": 1,
          "balls": 3,
          "fours": 0,
          "sixes": 0,
          "strikeRate": 33.3,
          "dismissal": "not out"
        }
      ],
      "bowling": [
        {
          "name": "Abhijot",
          "overs": 2.0,
          "maidens": 0,
          "runs": 13,
          "wickets": 0,
          "economy": 6.5
        },
        {
          "name": "Aryan",
          "overs": 2.0,
          "maidens": 0,
          "runs": 7,
          "wickets": 1,
          "economy": 3.5
        },
        {
          "name": "Shabad",
          "overs": 2.0,
          "maidens": 0,
          "runs": 4,
          "wickets": 0,
          "economy": 2.0
        },
        {
          "name": "Aman",
          "overs": 1.0,
          "maidens": 0,
          "runs": 5,
          "wickets": 2,
          "economy": 5.0
        }
      ],
      "fallOfWickets": [
        {
          "score": "1-2",
          "batsman": "Mohit",
          "over": 1.2
        },
        {
          "score": "2-27",
          "batsman": "Yuvraj",
          "over": 6.4
        },
        {
          "score": "3-27",
          "batsman": "Sumit",
          "over": 6.5
        }
      ]
    }
  ]
};

async function findOrCreatePlayer(name) {
  if (!name) return null;
  const cleaned = name.trim();
  const q = { name: new RegExp('^' + cleaned.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') };
  let p = await Player.findOne(q);
  if (!p) {
    p = new Player({
      name: cleaned,
      role: 'Batsman',
      battingStyle: 'Right-hand bat',
      bowlingStyle: 'None',
      stats: {
        batting: { runs: 0, innings: 0, highestScore: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0, ducks: 0, ballsFaced: 0, notOuts: 0 },
        bowling: { wickets: 0, runsConceded: 0, ballsBowled: 0, maidens: 0, dotBalls: 0, bestBowling: { wickets: 0, runs: 0 } },
        fielding: { catches: 0, runOuts: 0, stumpings: 0 }
      }
    });
    await p.save();
    console.log('Created missing player:', p.name);
  }
  return p;
}

async function findOrCreateTeam(name) {
  if (!name) return null;
  const cleaned = name.trim();
  let t = await Team.findOne({ name: new RegExp('^' + cleaned.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') });
  if (!t && (cleaned.toLowerCase().includes('chuddu') || cleaned.toLowerCase().includes('chhudu'))) {
    t = await Team.findOne({ name: /ch[udh]+/i });
  }
  if (!t) {
    t = new Team({
      name: cleaned,
      stats: { played: 0, won: 0, lost: 0, draw: 0 }
    });
    await t.save();
    console.log('Created missing team:', t.name);
  }
  return t;
}

async function parseDismissal(text) {
  if (!text) {
    return { outStatus: 'DNB', bowlerId: null, fielderId: null };
  }
  const cleanText = text.trim();
  const lower = cleanText.toLowerCase();
  
  if (lower === 'not out' || lower === 'retired - not out') {
    return { outStatus: 'Not Out', bowlerId: null, fielderId: null };
  }
  
  // Example: c Shabad b Aman
  const cMatch = cleanText.match(/c\s+([^b]+?)\s+b\s+(.+)$/i);
  if (cMatch) {
    const fielder = await findOrCreatePlayer(cMatch[1]);
    const bowler = await findOrCreatePlayer(cMatch[2]);
    return { outStatus: 'Caught', bowlerId: bowler._id, fielderId: fielder._id };
  }

  // Example: b Sumit
  const bMatch = cleanText.match(/b\s+(.+)$/i);
  if (bMatch) {
    const bowler = await findOrCreatePlayer(bMatch[1]);
    return { outStatus: 'Bowled', bowlerId: bowler._id, fielderId: null };
  }

  return { outStatus: 'Other', bowlerId: null, fielderId: null };
}

function splitOvers(oversDecimal) {
  const s = String(oversDecimal || '0');
  if (!s.includes('.')) return { overs: parseInt(s, 10) || 0, balls: 0 };
  const [o, b] = s.split('.');
  return { overs: parseInt(o, 10) || 0, balls: parseInt(b, 10) || 0 };
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const team1 = await findOrCreateTeam(matchData.match.team1);
  const team2 = await findOrCreateTeam(matchData.match.team2);

  const inningsArr = [];
  for (const inn of matchData.innings) {
    const battingScorecard = [];
    for (const b of inn.batting) {
      const player = await findOrCreatePlayer(b.name);
      const { outStatus, bowlerId, fielderId } = await parseDismissal(b.dismissal);
      battingScorecard.push({
        playerId: player._id,
        runs: b.runs,
        ballsFaced: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        outStatus,
        bowlerId,
        fielderId,
        dismissalText: b.dismissal || ''
      });
    }

    const bowlingScorecard = [];
    for (const bw of inn.bowling) {
      const player = await findOrCreatePlayer(bw.name);
      const { overs, balls } = splitOvers(bw.overs);
      bowlingScorecard.push({
        playerId: player._id,
        overs,
        balls,
        maidens: bw.maidens || 0,
        runsConceded: bw.runs || 0,
        wickets: bw.wickets || 0,
        dotBalls: bw.dotBalls || 0
      });
    }

    const { overs, balls } = splitOvers(inn.overs);
    const battingTeam = await findOrCreateTeam(inn.battingTeam);
    const fallOfWickets = [];
    if (inn.fallOfWickets && Array.isArray(inn.fallOfWickets)) {
      for (const fow of inn.fallOfWickets) {
        const batsmanPlayer = await findOrCreatePlayer(fow.batsman);
        const { overs: fowOvers, balls: fowBalls } = splitOvers(fow.over);
        const parts = fow.score.split('-');
        const wicketNo = parseInt(parts[0], 10);
        const runs = parseInt(parts[1], 10);
        fallOfWickets.push({
          wicketNo,
          runs,
          overs: fowOvers,
          balls: fowBalls,
          playerId: batsmanPlayer._id
        });
      }
    }

    inningsArr.push({
      teamId: battingTeam._id,
      runs: inn.score,
      wickets: inn.wickets,
      overs,
      balls,
      extras: {
        total: inn.extras.total || 0,
        wides: inn.extras.wides || 0,
        noballs: inn.extras.noBalls || 0,
        byes: inn.extras.byes || 0,
        legbyes: inn.extras.legByes || 0
      },
      battingScorecard,
      bowlingScorecard,
      fallOfWickets,
      partnerships: []
    });
  }

  const matchDoc = new Match({
    homeTeamId: team1._id,
    awayTeamId: team2._id,
    status: 'Completed',
    matchType: 'Custom',
    totalOvers: 20,
    innings: inningsArr,
    currentInnings: inningsArr.length,
    winnerId: team1._id, // Aryan ke Fuddu won
    resultDescription: matchData.match.result,
    careerStatsApplied: false,
    createdAt: new Date()
  });

  await matchDoc.save();
  console.log('Saved match with ID:', matchDoc._id.toString());
  await mongoose.disconnect();
  console.log('Disconnected.');
}

run().catch(console.error);
