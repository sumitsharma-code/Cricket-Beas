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
      password, 
      name,
      photo,
      playerRole,
      battingStyle,
      bowlingStyle 
    } = req.body;

    // Ignore any client-provided role to prevent privilege escalation.
    const serverRole = 'Player';

    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this username' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let linkedPlayerId = null;

    // If explicit player info is provided (name), create a Player document
    if (name) {
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
      password: hashedPassword,
      role: serverRole,
      playerId: linkedPlayerId,
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
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

    // Treat incoming identifier as username (phone removed)
    const user = await User.findOne({ username: phoneOrUsername }).populate('playerId');

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
