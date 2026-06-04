import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Lock, User } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  
  // Player specific states (removed: use username as display name)

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      username,
      password,
      role: 'Player',
    };

    // Use username as display name
    payload.name = username;

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
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z]/g, ''))}
                  className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 dark:border-dark-border rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cricket-500 dark:bg-slate-900"
                  placeholder="username (lowercase letters only)"
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

            
          </div>

          

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-4"
            >
              {loading ? 'Creating User...' : 'Create User'}
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
