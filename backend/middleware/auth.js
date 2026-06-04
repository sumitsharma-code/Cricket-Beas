const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Match = require('../models/Match');

const protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cricbeas_secret_key');
      
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }
      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Role (${req.user ? req.user.role : 'Guest'}) is not authorized to access this resource` 
      });
    }
    next();
  };
};

/**
 * Ensures only the single assigned scorer or Super Admin can score the match.
 */
const authorizeScorer = async (req, res, next) => {
  try {
    const matchId = req.params.id;
    const match = await Match.findById(matchId);
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userIdStr = req.user._id.toString();
    
    // Allow Super Admins, Master Host, and Admin roles to act as scorers
    const bypassRoles = ['Super Admin', 'Master Host', 'Admin'];
    if (bypassRoles.includes(req.user.role)) {
      return next();
    }

    // Check if the user is the assigned scorer
    if (!match.assignedScorerId) {
      return res.status(400).json({ message: 'No scorer has been assigned to this match yet.' });
    }

    if (match.assignedScorerId.toString() !== userIdStr) {
      return res.status(403).json({ 
        message: 'Forbidden. You are not the assigned scorer of this match.' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Error in authorizeScorer middleware:', error);
    res.status(500).json({ message: 'Server authorization check failed' });
  }
};

module.exports = { protect, authorize, authorizeScorer };
