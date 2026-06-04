const mongoose = require('mongoose');

const BallEventSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true,
  },
  inningsNo: {
    type: Number,
    required: true,
  },
  over: {
    type: Number,
    required: true,
  },
  ball: {
    type: Number, // legal ball number in the over (1-6)
    required: true,
  },
  batsmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
  },
  bowlerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
  },
  runsScored: {
    type: Number,
    default: 0, // batsman runs
  },
  extraRuns: {
    type: Number,
    default: 0,
  },
  extraType: {
    type: String,
    enum: ['Wide', 'No Ball', 'Bye', 'Leg Bye', 'None'],
    default: 'None',
  },
  wicket: {
    fell: { type: Boolean, default: false },
    type: { 
      type: String, 
      enum: ['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Retired Hurt', 'Hit Wicket', 'Other', null], 
      default: null 
    },
    dismissedPlayerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    fielderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  },
  wagonWheel: {
    x: { type: Number, default: null },
    y: { type: Number, default: null },
  },
  commentary: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('BallEvent', BallEventSchema);
