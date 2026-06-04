const Player = require('../models/Player');
const Team = require('../models/Team');

exports.createPlayer = async (req, res) => {
  try {
    const { name, photo, role, battingStyle, bowlingStyle } = req.body;
    
    if (!name || !role || !battingStyle) {
      return res.status(400).json({ message: 'Name, Role, and Batting Style are required' });
    }

    const player = new Player({
      name,
      photo: photo || '',
      role,
      battingStyle,
      bowlingStyle: bowlingStyle || 'None',
    });

    const savedPlayer = await player.save();
    res.status(201).json(savedPlayer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating player', error: error.message });
  }
};

exports.getPlayers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    const players = await Player.find(query).limit(50);
    res.json(players);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching players' });
  }
};

exports.getPlayerById = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    
    // Find teams this player belongs to
    const teams = await Team.find({ players: player._id }).select('name logo');
    
    res.json({
      player,
      teams,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching player by ID' });
  }
};

exports.updatePlayer = async (req, res) => {
  try {
    const { name, photo, role, battingStyle, bowlingStyle } = req.body;
    const player = await Player.findById(req.params.id);
    
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    if (name) player.name = name;
    if (photo !== undefined) player.photo = photo;
    if (role) player.role = role;
    if (battingStyle) player.battingStyle = battingStyle;
    if (bowlingStyle) player.bowlingStyle = bowlingStyle;

    const updatedPlayer = await player.save();
    res.json(updatedPlayer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating player', error: error.message });
  }
};
