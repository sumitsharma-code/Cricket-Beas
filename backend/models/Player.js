const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  photo: {
    type: String,
    default: '',
  },
  role: {
    type: String,
    enum: ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'],
    required: true,
  },
  battingStyle: {
    type: String,
    enum: ['Right-hand Batsman', 'Left-hand Batsman'],
    required: true,
  },
  bowlingStyle: {
    type: String,
    enum: ['Right-arm Fast', 'Right-arm Spin', 'Left-arm Fast', 'Left-arm Spin', 'None'],
    default: 'None',
  },
  stats: {
    batting: {
      runs: { type: Number, default: 0 },
      innings: { type: Number, default: 0 },
      highestScore: { type: Number, default: 0 },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
      fifties: { type: Number, default: 0 },
      hundreds: { type: Number, default: 0 },
      ducks: { type: Number, default: 0 },
      ballsFaced: { type: Number, default: 0 },
      notOuts: { type: Number, default: 0 },
    },
    bowling: {
      wickets: { type: Number, default: 0 },
      runsConceded: { type: Number, default: 0 },
      ballsBowled: { type: Number, default: 0 },
      maidens: { type: Number, default: 0 },
      dotBalls: { type: Number, default: 0 },
      bestBowling: {
        wickets: { type: Number, default: 0 },
        runs: { type: Number, default: 0 },
      },
    },
    fielding: {
      catches: { type: Number, default: 0 },
      runOuts: { type: Number, default: 0 },
      stumpings: { type: Number, default: 0 },
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Configure Performance Indexes
PlayerSchema.index({ name: 1 });
PlayerSchema.index({ 'stats.batting.runs': -1 });
PlayerSchema.index({ 'stats.bowling.wickets': -1 });

module.exports = mongoose.model('Player', PlayerSchema);
