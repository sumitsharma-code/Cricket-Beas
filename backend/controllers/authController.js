const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Player = require('../models/Player');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'cricbeas_secret_key', {
    expiresIn: '30d',
  });
};

exports.register = async (req, res) => {
  try {
    const { 
      username, 
      phone, 
      password, 
      role,
      name,
      photo,
      playerRole,
      battingStyle,
      bowlingStyle 
    } = req.body;

    const userExists = await User.findOne({ $or: [{ phone }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this phone number or username' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let linkedPlayerId = null;

    // If the role is Player, or player info is provided, create a Player document
    if (role === 'Player' || name) {
      const player = new Player({
        name: name || username,
        photo: photo || '',
        role: playerRole || 'Batsman',
        battingStyle: battingStyle || 'Right-hand Batsman',
        bowlingStyle: bowlingStyle || 'None',
      });
      const savedPlayer = await player.save();
      linkedPlayerId = savedPlayer._id;
    }

    const user = await User.create({
      username,
      phone,
      password: hashedPassword,
      role: role || 'Player',
      playerId: linkedPlayerId,
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      phone: user.phone,
      role: user.role,
      playerId: user.playerId,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { phoneOrUsername, password } = req.body;

    const user = await User.findOne({
      $or: [{ phone: phoneOrUsername }, { username: phoneOrUsername }]
    }).populate('playerId');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({
      _id: user._id,
      username: user.username,
      phone: user.phone,
      role: user.role,
      playerId: user.playerId ? user.playerId._id : null,
      playerProfile: user.playerId,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('playerId');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching user details' });
  }
};
