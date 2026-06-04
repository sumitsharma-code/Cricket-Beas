const Team = require('../models/Team');
const Player = require('../models/Player');

exports.createTeam = async (req, res) => {
  try {
    const { name, logo, playerIds } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    const teamExists = await Team.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (teamExists) {
      return res.status(400).json({ message: 'Team with this name already exists' });
    }

    const team = new Team({
      name,
      logo: logo || '',
      managerId: req.user.id,
      players: playerIds || [],
    });

    const savedTeam = await team.save();
    res.status(201).json(savedTeam);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating team', error: error.message });
  }
};

exports.getTeams = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    const teams = await Team.find(query).populate('players', 'name role');
    res.json(teams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching teams' });
  }
};

exports.getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('players')
      .populate('managerId', 'username phone');
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    res.json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching team by ID' });
  }
};

exports.addPlayerToTeam = async (req, res) => {
  try {
    const { playerId } = req.body;
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check authorization (only manager, Master Host, or Super Admin can manage)
    if (team.managerId?.toString() !== req.user.id && req.user.role !== 'Super Admin' && req.user.role !== 'Master Host') {
      return res.status(403).json({ message: 'Not authorized to add players to this team' });
    }

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    if (team.players.includes(playerId)) {
      return res.status(400).json({ message: 'Player is already in this team' });
    }

    team.players.push(playerId);
    await team.save();
    
    res.json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error adding player to team' });
  }
};

exports.removePlayerFromTeam = async (req, res) => {
  try {
    const { playerId } = req.body;
    const team = await Team.findById(req.params.id);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check authorization
    if (team.managerId?.toString() !== req.user.id && req.user.role !== 'Super Admin' && req.user.role !== 'Master Host') {
      return res.status(403).json({ message: 'Not authorized to remove players from this team' });
    }

    team.players = team.players.filter(p => p.toString() !== playerId);
    await team.save();
    
    res.json(team);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error removing player from team' });
  }
};
