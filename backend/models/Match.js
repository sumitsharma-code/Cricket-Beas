const mongoose = require('mongoose');

const BattingScorecardSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  runs: { type: Number, default: 0 },
  ballsFaced: { type: Number, default: 0 },
  fours: { type: Number, default: 0 },
  sixes: { type: Number, default: 0 },
  outStatus: { 
    type: String, 
    enum: ['DNB', 'Not Out', 'Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Retired Hurt', 'Hit Wicket', 'Other'], 
    default: 'DNB' 
  },
  bowlerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  fielderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  dismissalText: { type: String, default: '' },
});

const BowlingScorecardSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  overs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 }, 
  maidens: { type: Number, default: 0 },
  runsConceded: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  dotBalls: { type: Number, default: 0 },
});

const FallOfWicketSchema = new mongoose.Schema({
  wicketNo: { type: Number, required: true },
  runs: { type: Number, required: true },
  overs: { type: Number, required: true },
  balls: { type: Number, required: true },
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
});

const PartnershipSchema = new mongoose.Schema({
  batsman1Id: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  batsman2Id: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  runs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 },
  extras: { type: Number, default: 0 },
});

const InningsSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  overs: { type: Number, default: 0 },
  balls: { type: Number, default: 0 }, 
  extras: {
    wides: { type: Number, default: 0 },
    noballs: { type: Number, default: 0 },
    byes: { type: Number, default: 0 },
    legbyes: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  battingScorecard: [BattingScorecardSchema],
  bowlingScorecard: [BowlingScorecardSchema],
  fallOfWickets: [FallOfWicketSchema],
  partnerships: [PartnershipSchema],
});

const CommentarySchema = new mongoose.Schema({
  over: { type: Number, required: true },
  ball: { type: Number, required: true },
  batsmanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  bowlerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  eventType: { type: String, enum: ['run', 'wicket', 'extra', 'info'], default: 'run' },
  runs: { type: Number, default: 0 },
  description: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const WagonWheelSchema = new mongoose.Schema({
  batsmanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  runs: { type: Number, default: 0 },
  x: { type: Number, required: true }, 
  y: { type: Number, required: true }, 
});

const MatchSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', default: null },
  homeTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  awayTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  status: { 
    type: String, 
    enum: ['Scheduled', 'Live', 'Completed'], 
    default: 'Scheduled' 
  },
  matchType: { 
    type: String, 
    enum: ['T10', 'T20', 'ODI', 'Custom'], 
    default: 'T20' 
  },
  totalOvers: { type: Number, default: 20 },
  toss: {
    wonBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    decision: { type: String, enum: ['Bat', 'Bowl'], default: 'Bat' },
  },
  currentInnings: { type: Number, default: 1 }, 
  innings: [InningsSchema],
  currentState: {
    strikerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    nonStrikerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    currentBowlerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    ballsBowledInOver: { type: Number, default: 0 }, 
    runsInCurrentOver: { type: Number, default: 0 },
    lastBalls: [{ type: String }], 
    freeHit: { type: Boolean, default: false },
  },
  commentary: [CommentarySchema],
  wagonWheel: [WagonWheelSchema],
  playerOfTheMatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  resultDescription: { type: String, default: '' },
  assignedScorerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
});

// Configure Performance Indexes
MatchSchema.index({ tournamentId: 1 });
MatchSchema.index({ status: 1 });
MatchSchema.index({ assignedScorerId: 1 });
MatchSchema.index({ homeTeamId: 1, awayTeamId: 1 });

module.exports = mongoose.model('Match', MatchSchema);
