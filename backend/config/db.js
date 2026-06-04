const mongoose = require('mongoose');

let connectionState = 'Disconnected';

const connectWithRetry = async (dbUri, retries = 5, delay = 5000) => {
  connectionState = 'Connecting';
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Database connection attempt ${attempt}/${retries}...`);
      const conn = await mongoose.connect(dbUri);
      connectionState = 'Connected';
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (err) {
      console.error(`Attempt ${attempt} failed. Database error: ${err.message}`);
      if (attempt === retries) {
        connectionState = 'Failed';
        console.error('All database connection attempts failed.');
        if (process.env.NODE_ENV === 'production') {
          process.exit(1);
        }
      } else {
        console.log(`Waiting ${delay / 1000}s before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
};

const connectDB = async () => {
  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cricbeas';
  
  // Set up mongoose listeners
  mongoose.connection.on('disconnected', () => {
    connectionState = 'Disconnected';
    console.log('Mongoose connection disconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error(`Mongoose connection error: ${err.message}`);
  });

  await connectWithRetry(dbUri);
};

const getDBHealth = () => {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };
  const code = mongoose.connection.readyState;
  return {
    state: states[code] || 'Unknown',
    connectionState,
    ping: code === 1 ? 'ok' : 'failed'
  };
};

module.exports = { connectDB, getDBHealth };
