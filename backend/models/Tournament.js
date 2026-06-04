const mongoose = require('mongoose');

const PointsTableSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  played: { type: Number, default: 0 },
  won: { type: Number, default: 0 },
  lost: { type: Number, default: 0 },
  tied: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  netRunRate: { type: Number, default: 0 },
  runsScored: { type: Number, default: 0 },
  oversFaced: { type: Number, default: 0 },  
  runsConceded: { type: Number, default: 0 },
  oversBowled: { type: Number, default: 0 },
});

const TournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  logo: {
    type: String,
    default: '',
  },
  organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  format: {
    type: String,
    enum: ['League', 'Knockout', 'League + Knockout'],
    default: 'League',
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Ongoing', 'Completed'],
    default: 'Scheduled',
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
  }],
  fixtures: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
  }],
  pointsTable: [PointsTableSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

TournamentSchema.index({ status: 1 });
TournamentSchema.index({ organizerId: 1 });

module.exports = mongoose.model('Tournament', TournamentSchema);
