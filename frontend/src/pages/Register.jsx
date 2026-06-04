import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Phone, Lock, User, Shield, Info } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Player');
  
  // Player specific states
  const [name, setName] = useState('');
  const [playerRole, setPlayerRole] = useState('Batsman');
  const [battingStyle, setBattingStyle] = useState('Right-hand Batsman');
  const [bowlingStyle, setBowlingStyle] = useState('None');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !phone || !password) {
      setError('Please fill in all basic fields');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      username,
      phone,
      password,
      role,
    };

    if (role === 'Player') {
      payload.name = name || username;
      payload.playerRole = playerRole;
      payload.battingStyle = battingStyle;
      payload.bowlingStyle = bowlingStyle;
    }

    try {
      await register(payload);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-lg w-full space-y-6 bg-white dark:bg-dark-card p-8 rounded-2xl border border-slate-200 dark:border-dark-border shadow-xl">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cricket-100 dark:bg-cricket-900/30 text-cricket-600 dark:text-cricket-500 mb-3">
            <Trophy className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
            Create your CricBeas Account
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-dark-muted">
            Organize matches, build teams, and track career statistics.
          </p>
        </div>

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-950/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-slate-650 dark:text-dark-text mb-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 dark:border-dark-border rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cricket-500 dark:bg-slate-900"
                  placeholder="username"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-semibold text-slate-650 dark:text-dark-text mb-1">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 dark:border-dark-border rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cricket-500 dark:bg-slate-900"
                  placeholder="e.g. +1234567890"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-650 dark:text-dark-text mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 dark:border-dark-border rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cricket-500 dark:bg-slate-900"
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-semibold text-slate-650 dark:text-dark-text mb-1">
                Account Role
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Shield className="h-4 w-4" />
                </div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 dark:border-dark-border rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cricket-500 dark:bg-slate-900"
                >
                  <option value="Player">Player</option>
                  <option value="Manager">Team Manager</option>
                  <option value="Organizer">Tournament Organizer</option>
                  <option value="Admin">Administrator</option>
                </select>
              </div>
            </div>
          </div>

          {/* Conditional Player Details Section */}
          {role === 'Player' && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-dark-border rounded-xl space-y-3 mt-4">
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-250">
                <Info className="h-4 w-4 text-cricket-600" />
                Player Profile Details
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-3 py-1.5 border border-slate-300 dark:border-dark-border rounded-lg text-sm bg-white dark:bg-dark-card text-slate-900 dark:text-white"
                  placeholder="Enter full display name"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Player Role</label>
                  <select
                    value={playerRole}
                    onChange={(e) => setPlayerRole(e.target.value)}
                    className="block w-full p-1.5 border border-slate-300 dark:border-dark-border rounded-lg text-xs bg-white dark:bg-dark-card text-slate-900 dark:text-white"
                  >
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All-Rounder">All-Rounder</option>
                    <option value="Wicket-Keeper">Wicket-Keeper</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Batting Style</label>
                  <select
                    value={battingStyle}
                    onChange={(e) => setBattingStyle(e.target.value)}
                    className="block w-full p-1.5 border border-slate-300 dark:border-dark-border rounded-lg text-xs bg-white dark:bg-dark-card text-slate-900 dark:text-white"
                  >
                    <option value="Right-hand Batsman">Right Hand</option>
                    <option value="Left-hand Batsman">Left Hand</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Bowling Style</label>
                  <select
                    value={bowlingStyle}
                    onChange={(e) => setBowlingStyle(e.target.value)}
                    className="block w-full p-1.5 border border-slate-300 dark:border-dark-border rounded-lg text-xs bg-white dark:bg-dark-card text-slate-900 dark:text-white"
                  >
                    <option value="None">None</option>
                    <option value="Right-arm Fast">Right-arm Fast</option>
                    <option value="Right-arm Spin">Right-arm Spin</option>
                    <option value="Left-arm Fast">Left-arm Fast</option>
                    <option value="Left-arm Spin">Left-arm Spin</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-4"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>
        </form>

        <div className="text-center text-sm text-slate-500 dark:text-dark-muted pt-4 border-t border-slate-100 dark:border-dark-border/50">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-cricket-600 dark:text-cricket-500 hover:underline">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
