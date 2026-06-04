import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { User, ShieldAlert, Award, Activity, Heart, Bookmark } from 'lucide-react';

export default function PlayerDetail() {
  const { id } = useParams();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        const playerData = await api.getPlayer(id);
        setData(playerData);
      } catch (err) {
        console.error(err);
        setError('Player profile could not be loaded');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-cricket-600 mx-auto mb-4"></div>
        <p className="text-slate-500 dark:text-dark-muted">Loading player profile...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto my-12 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-6 rounded-2xl">
        <ShieldAlert className="h-10 w-10 text-red-650 mx-auto mb-3" />
        <h3 className="font-bold text-red-800 dark:text-red-400">Profile Not Found</h3>
        <p className="text-sm text-red-650 dark:text-red-450 mt-1 mb-4">{error || 'This player profile is unavailable'}</p>
        <Link to="/" className="btn-secondary text-sm">Back to Dashboard</Link>
      </div>
    );
  }

  const { player, teams } = data;
  const batting = player.stats?.batting || {};
  const bowling = player.stats?.bowling || {};
  const fielding = player.stats?.fielding || {};

  // Formatted stats
  const battingAverage = (batting.innings - batting.notOuts) > 0 
    ? (batting.runs / (batting.innings - batting.notOuts)).toFixed(2) 
    : batting.runs > 0 ? batting.runs.toFixed(2) : '0.00';
    
  const battingStrikeRate = batting.ballsFaced > 0 
    ? ((batting.runs / batting.ballsFaced) * 100).toFixed(1) 
    : '0.0';

  const oversBowled = Math.floor(bowling.ballsBowled / 6);
  const fractionalBalls = bowling.ballsBowled % 6;
  
  const bowlingEconomy = bowling.ballsBowled > 0 
    ? (bowling.runsConceded / (bowling.ballsBowled / 6)).toFixed(2) 
    : '0.00';

  const bowlingAverage = bowling.wickets > 0 
    ? (bowling.runsConceded / bowling.wickets).toFixed(2) 
    : '0.00';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 font-sans">
      
      {/* Profile Header */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 scale-150">
          <User className="w-64 h-64 text-slate-100 dark:text-slate-800" />
        </div>

        {/* Profile Pic */}
        <div className="h-20 w-20 rounded-full bg-cricket-100 text-cricket-700 dark:bg-cricket-900/30 dark:text-cricket-400 flex items-center justify-center font-extrabold text-3xl shadow">
          {player.name.substring(0, 2).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-grow text-center sm:text-left space-y-1 z-10">
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">{player.name}</h1>
          <p className="text-sm font-semibold text-slate-550 dark:text-dark-muted">
            {player.role} &bull; {player.battingStyle}
          </p>
          {player.bowlingStyle !== 'None' && (
            <p className="text-xs text-slate-400">Bowling Style: {player.bowlingStyle}</p>
          )}
        </div>

        {/* Teams List */}
        <div className="sm:border-l sm:border-slate-200 dark:sm:border-dark-border sm:pl-6 text-center sm:text-left min-w-[150px]">
          <span className="text-xs font-bold text-slate-400 uppercase">Clubs / Teams</span>
          {teams.length === 0 ? (
            <p className="text-sm italic text-slate-550 mt-1">Free Agent</p>
          ) : (
            <div className="flex flex-wrap sm:flex-col gap-1 mt-1 justify-center sm:justify-start">
              {teams.map(t => (
                <Link key={t._id} to={`/teams/${t._id}`} className="text-sm font-bold text-cricket-650 hover:underline">
                  {t.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Batting Card */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold border-b border-slate-100 dark:border-dark-border pb-3 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-cricket-650" />
            Batting Career Stats
          </h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm font-semibold">
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Innings</span>
              <span>{batting.innings}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Total Runs</span>
              <span className="font-extrabold text-cricket-600 dark:text-cricket-450">{batting.runs}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Highest Score</span>
              <span>{batting.highestScore}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Average</span>
              <span>{battingAverage}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Strike Rate</span>
              <span>{battingStrikeRate}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Not Outs</span>
              <span>{batting.notOuts}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Fours (4s)</span>
              <span>{batting.fours}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Sixes (6s)</span>
              <span>{batting.sixes}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">50s / 100s</span>
              <span>{batting.fifties} / {batting.hundreds}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Ducks (0s)</span>
              <span>{batting.ducks}</span>
            </div>
          </div>
        </div>

        {/* Bowling Card */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold border-b border-slate-100 dark:border-dark-border pb-3 mb-4 flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-cricket-650" />
            Bowling Career Stats
          </h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm font-semibold">
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Wickets</span>
              <span className="font-extrabold text-cricket-600 dark:text-cricket-455">{bowling.wickets}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Overs Bowled</span>
              <span>{oversBowled}.{fractionalBalls}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Runs Conceded</span>
              <span>{bowling.runsConceded}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Economy</span>
              <span>{bowlingEconomy}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Average</span>
              <span>{bowlingAverage}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Maiden Overs</span>
              <span>{bowling.maidens}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Dot Balls</span>
              <span>{bowling.dotBalls}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Best Figures</span>
              <span>{bowling.bestBowling?.wickets || 0} / {bowling.bestBowling?.runs || 0}</span>
            </div>
          </div>
        </div>

        {/* Fielding Card */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold border-b border-slate-100 dark:border-dark-border pb-3 mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-cricket-650" />
            Fielding Career Stats
          </h3>
          
          <div className="grid grid-cols-1 gap-4 text-sm font-semibold">
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Catches</span>
              <span>{fielding.catches}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Run Outs</span>
              <span>{fielding.runOuts}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 dark:border-dark-border/20 pb-2">
              <span className="text-slate-400">Stumpings</span>
              <span>{fielding.stumpings}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
