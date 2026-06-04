import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Phone, Lock, ArrowRight } from 'lucide-react';

export default function Login() {
  const { login, error: authError } = useAuth();
  const [phoneOrUsername, setPhoneOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phoneOrUsername || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await login(phoneOrUsername, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-dark-card p-8 rounded-2xl border border-slate-200 dark:border-dark-border shadow-xl">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cricket-100 dark:bg-cricket-900/30 text-cricket-600 dark:text-cricket-500 mb-3">
            <Trophy className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-805 dark:text-white">
            Welcome back to CricBeas
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-dark-muted">
            Log in to manage tournaments and track live scores.
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-950/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Username / Phone */}
            <div>
              <label htmlFor="phoneOrUsername" className="block text-sm font-semibold text-slate-650 dark:text-dark-text mb-1">
                Username or Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="h-5 w-5" />
                </div>
                <input
                  id="phoneOrUsername"
                  name="phoneOrUsername"
                  type="text"
                  required
                  value={phoneOrUsername}
                  onChange={(e) => setPhoneOrUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white dark:bg-slate-900 dark:hover:bg-slate-850 dark:focus:bg-dark-card border border-slate-300 dark:border-dark-border rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cricket-500 focus:border-transparent transition-all"
                  placeholder="Enter phone or username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-650 dark:text-dark-text mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white dark:bg-slate-900 dark:hover:bg-slate-850 dark:focus:bg-dark-card border border-slate-300 dark:border-dark-border rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cricket-500 focus:border-transparent transition-all"
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-1.5"
            >
              {loading ? 'Logging in...' : 'Log In'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>

        <div className="text-center text-sm text-slate-500 dark:text-dark-muted pt-4 border-t border-slate-100 dark:border-dark-border/50">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-cricket-600 dark:text-cricket-500 hover:underline">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
