import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Trophy, Sun, Moon, Menu, X, User, LogOut, Award, Calendar, Users, Activity, ShieldAlert } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Matches', path: '/', icon: Activity },
    { name: 'Tournaments', path: '/tournaments', icon: Calendar },
    { name: 'Leaderboards', path: '/leaderboards', icon: Award },
    { name: 'Teams', path: '/teams', icon: Users },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* 1. Desktop Top Header (Hidden on Mobile) */}
      <nav className="sticky top-0 z-40 bg-white/95 dark:bg-dark-card/95 backdrop-blur border-b border-slate-200 dark:border-dark-border transition-colors duration-200 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2">
                <Trophy className="h-8 w-8 text-cricket-600 dark:text-cricket-500" />
                <span className="font-extrabold text-xl tracking-wider text-slate-800 dark:text-white">
                  CRIC<span className="text-cricket-600 dark:text-cricket-500">BEAS</span>
                </span>
              </Link>
            </div>

            {/* Desktop Nav Links */}
            <div className="flex items-center gap-6">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`flex items-center gap-1.5 font-semibold transition-colors ${
                      isActive(link.path)
                        ? 'text-cricket-600 dark:text-cricket-500'
                        : 'text-slate-600 dark:text-slate-300 hover:text-cricket-600 dark:hover:text-cricket-500'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.name}
                  </Link>
                );
              })}
            </div>

            {/* Desktop Actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-350">{user.username}</span>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    {user.role}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="btn btn-secondary py-1.5 px-3 flex items-center gap-1 text-sm text-red-650 border-red-200 dark:border-red-900/30 dark:text-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/login" className="text-slate-650 dark:text-slate-300 hover:text-cricket-600 font-medium">
                    Login
                  </Link>
                  <Link to="/register" className="btn-primary py-1.5 px-4 text-sm">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 2. Mobile Header Title Bar (Sticky at Top on Mobile) */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-dark-card/95 backdrop-blur border-b border-slate-200 dark:border-dark-border h-14 flex items-center justify-between px-4 md:hidden">
        <Link to="/" className="flex items-center gap-1.5">
          <Trophy className="h-6 w-6 text-cricket-650 dark:text-cricket-500" />
          <span className="font-extrabold text-md tracking-wider text-slate-805 dark:text-white">
            CRIC<span className="text-cricket-650 dark:text-cricket-500">BEAS</span>
          </span>
        </Link>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          
          {user && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Mobile Persistent Sticky Bottom Nav Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-dark-card border-t border-slate-200 dark:border-dark-border flex justify-around items-center py-2 md:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              to={link.path}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
                isActive(link.path)
                  ? 'text-cricket-600 dark:text-cricket-500'
                  : 'text-slate-500 dark:text-dark-muted hover:text-slate-700'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{link.name}</span>
            </Link>
          );
        })}

        {/* Profile/Auth Button */}
        {user ? (
          <Link
            to={user.playerId ? `/players/${typeof user.playerId === 'object' ? user.playerId._id : user.playerId}` : '#'}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive(`/players/${user.playerId?._id || user.playerId}`)
                ? 'text-cricket-600 dark:text-cricket-500'
                : 'text-slate-500 dark:text-dark-muted hover:text-slate-700'
            }`}
          >
            <User className="h-5 w-5" />
            <span>Profile</span>
          </Link>
        ) : (
          <Link
            to="/login"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${
              isActive('/login') ? 'text-cricket-600 dark:text-cricket-500' : 'text-slate-500'
            }`}
          >
            <User className="h-5 w-5" />
            <span>Login</span>
          </Link>
        )}
      </div>
    </>
  );
}
