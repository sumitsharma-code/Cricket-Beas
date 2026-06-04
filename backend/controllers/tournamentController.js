const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const Match = require('../models/Match');

exports.createTournament = async (req, res) => {
  try {
    const { name, logo, format, teamIds } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Tournament name is required' });
    }

    const pointsTable = (teamIds || []).map(teamId => ({
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

    const tournament = new Tournament({
      name,
      logo: logo || '',
      organizerId: req.user.id,
      format: format || 'League',
      status: 'Scheduled',
      teams: teamIds || [],
      pointsTable,
    });

    const savedTournament = await tournament.save();
    res.status(201).json(savedTournament);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating tournament', error: error.message });
  }
};

exports.getTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.find()
      .populate('teams', 'name logo')
      .populate('organizerId', 'username phone');
    res.json(tournaments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching tournaments' });
  }
};

exports.getTournamentById = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('teams')
      .populate({
        path: 'fixtures',
        populate: [
          { path: 'homeTeamId', select: 'name logo' },
          { path: 'awayTeamId', select: 'name logo' },
          { path: 'winnerId', select: 'name logo' }
        ]
      })
      .populate('pointsTable.teamId', 'name logo');

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    
    res.json(tournament);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching tournament details' });
  }
};

exports.addTeamsToTournament = async (req, res) => {
  try {
    const { teamIds } = req.body;
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.organizerId.toString() !== req.user.id && req.user.role !== 'Super Admin' && req.user.role !== 'Master Host') {
      return res.status(403).json({ message: 'Not authorized to manage this tournament' });
    }

    teamIds.forEach(teamId => {
      if (!tournament.teams.includes(teamId)) {
        tournament.teams.push(teamId);
        tournament.pointsTable.push({
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
        });
      }
    });

    await tournament.save();
    res.json(tournament);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error adding teams to tournament' });
  }
};

exports.generateFixtures = async (req, res) => {
  try {
    const { matchType, totalOvers } = req.body;
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (tournament.organizerId.toString() !== req.user.id && req.user.role !== 'Super Admin' && req.user.role !== 'Master Host') {
      return res.status(403).json({ message: 'Not authorized to generate fixtures' });
    }

    const teams = tournament.teams;
    if (teams.length < 2) {
      return res.status(400).json({ message: 'At least 2 teams are required to generate fixtures' });
    }

    const fixtures = [];
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        fixtures.push({
          tournamentId: tournament._id,
          homeTeamId: teams[i],
          awayTeamId: teams[j],
          matchType: matchType || 'T20',
          totalOvers: totalOvers || 20,
          status: 'Scheduled',
          assignedScorerId: req.user.id, // default to tournament organizer
        });
      }
    }

    const createdMatches = await Match.insertMany(fixtures);
    
    tournament.fixtures = tournament.fixtures.concat(createdMatches.map(m => m._id));
    tournament.status = 'Ongoing';
    await tournament.save();

    res.status(201).json({
      message: `${createdMatches.length} fixtures generated successfully`,
      matches: createdMatches,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error generating fixtures', error: error.message });
  }
};
