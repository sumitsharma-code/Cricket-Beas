import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { Award, Zap, ShieldAlert, Sparkles, Heart, Eye } from 'lucide-react';

export default function Leaderboards() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLeaderboardData = async () => {
    try {
      const lbData = await api.getLeaderboards();
      setData(lbData);
    } catch (err) {
      console.error(err);
      setError('Leaderboard data could not be computed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-cricket-600 mx-auto mb-4"></div>
        <p className="text-slate-500 dark:text-dark-muted">Computing tournament leaderboards...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto my-12 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-6 rounded-2xl">
        <ShieldAlert className="h-10 w-10 text-red-650 mx-auto mb-3" />
        <h3 className="font-bold text-red-800 dark:text-red-400">Leaderboard Error</h3>
        <p className="text-sm text-red-655 dark:text-red-450 mt-1 mb-4">{error || 'Data computation failed'}</p>
        <button onClick={fetchLeaderboardData} className="btn-secondary text-sm">Retry Load</button>
      </div>
    );
  }

  const {
    orangeCap = [],
    purpleCap = [],
    mostFours = [],
    mostSixes = [],
    bestStrikeRate = [],
    bestEconomy = [],
    mostDotBalls = [],
    mostCatches = [],
    mostDucks = [],
    highestRunRate = [],
    mvp = [],
    emergingPlayer = []
  } = data;

  const orangeLeader = orangeCap[0];
  const purpleLeader = purpleCap[0];
  const mvpLeader = mvp[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10 font-sans">
      
      {/* Page Title */}
      <div className="text-center max-w-xl mx-auto space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white flex items-center justify-center gap-2">
          <Award className="h-8 w-8 text-cricket-600 dark:text-cricket-500" />
          CricBeas Leaderboards
        </h1>
        <p className="text-sm text-slate-500 dark:text-dark-muted">
          Real-time aggregates of player performances across all local tournament matches.
        </p>
      </div>

      {/* 1. Premium Award Headers (Orange Cap, Purple Cap, MVP) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Orange Cap (Most Runs) */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute right-0 top-0 opacity-15 transform translate-x-6 -translate-y-6 scale-150 font-black text-6xl">
            🏆
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/20 tracking-wider">
              Orange Cap Winner
            </span>
            <h2 className="text-2xl font-black mt-3">
              {orangeLeader ? orangeLeader.name : 'TBD'}
            </h2>
            <p className="text-xs text-white/80 mt-0.5">
              {orangeLeader ? `${orangeLeader.role} &bull; ${orangeLeader.battingStyle}` : 'No matches played yet'}
            </p>
          </div>
          <div className="flex justify-between items-baseline border-t border-white/20 pt-4 mt-6">
            <span className="text-sm text-white/80">Most Runs</span>
            <span className="text-3xl font-black">{orangeLeader ? orangeLeader.stats.batting.runs : 0} <span className="text-sm font-normal">runs</span></span>
          </div>
        </div>

        {/* Purple Cap (Most Wickets) */}
        <div className="bg-gradient-to-br from-purple-650 to-indigo-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute right-0 top-0 opacity-15 transform translate-x-6 -translate-y-6 scale-150 font-black text-6xl">
            🥎
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/20 tracking-wider">
              Purple Cap Winner
            </span>
            <h2 className="text-2xl font-black mt-3">
              {purpleLeader ? purpleLeader.name : 'TBD'}
            </h2>
            <p className="text-xs text-white/80 mt-0.5">
              {purpleLeader ? `${purpleLeader.role} &bull; ${purpleLeader.bowlingStyle}` : 'No matches played yet'}
            </p>
          </div>
          <div className="flex justify-between items-baseline border-t border-white/20 pt-4 mt-6">
            <span className="text-sm text-white/80">Most Wickets</span>
            <span className="text-3xl font-black">{purpleLeader ? purpleLeader.stats.bowling.wickets : 0} <span className="text-sm font-normal">wkts</span></span>
          </div>
        </div>

        {/* MVP (Most Valuable Player) */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute right-0 top-0 opacity-15 transform translate-x-6 -translate-y-6 scale-150 font-black text-6xl">
            ⭐
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/20 tracking-wider">
              Tournament MVP
            </span>
            <h2 className="text-2xl font-black mt-3">
              {mvpLeader ? mvpLeader.name : 'TBD'}
            </h2>
            <p className="text-xs text-white/80 mt-0.5">
              {mvpLeader ? `${mvpLeader.role} &bull; Points: ${mvpLeader.mvpPoints}` : 'No matches played yet'}
            </p>
          </div>
          <div className="flex justify-between items-baseline border-t border-white/20 pt-4 mt-6">
            <span className="text-sm text-white/80">MVP Index Points</span>
            <span className="text-3xl font-black">{mvpLeader ? mvpLeader.mvpPoints : 0} <span className="text-sm font-normal">pts</span></span>
          </div>
        </div>

      </div>

      {/* 2. Top-10 Category Sub-Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        
        {/* Most Runs */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold mb-4 border-b border-slate-100 dark:border-dark-border pb-3 flex items-center gap-1.5">
            <Sparkles className="h-4.5 w-4.5 text-amber-500" />
            Most Runs (Top 10)
          </h3>
          <div className="space-y-3">
            {orangeCap.map((p, idx) => (
              <div key={p._id} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 dark:border-dark-border/20 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-5 font-bold text-slate-400">{idx + 1}</span>
                  <Link to={`/players/${p._id}`} className="font-bold text-slate-850 dark:text-slate-200 hover:underline">{p.name}</Link>
                </div>
                <span className="font-black text-slate-900 dark:text-white">{p.stats.batting.runs} runs</span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Wickets */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold mb-4 border-b border-slate-100 dark:border-dark-border pb-3 flex items-center gap-1.5">
            <Zap className="h-4.5 w-4.5 text-purple-500" />
            Most Wickets (Top 10)
          </h3>
          <div className="space-y-3">
            {purpleCap.map((p, idx) => (
              <div key={p._id} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 dark:border-dark-border/20 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-5 font-bold text-slate-400">{idx + 1}</span>
                  <Link to={`/players/${p._id}`} className="font-bold text-slate-850 dark:text-slate-200 hover:underline">{p.name}</Link>
                </div>
                <span className="font-black text-slate-900 dark:text-white">{p.stats.bowling.wickets} wkts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Best Strike Rate (Min 15 balls) */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold mb-4 border-b border-slate-100 dark:border-dark-border pb-3 flex items-center gap-1.5">
            <Sparkles className="h-4.5 w-4.5 text-teal-500" />
            Highest Strike Rates (Min 15 balls)
          </h3>
          <div className="space-y-3">
            {bestStrikeRate.map((p, idx) => (
              <div key={p._id} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 dark:border-dark-border/20 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-5 font-bold text-slate-400">{idx + 1}</span>
                  <Link to={`/players/${p._id}`} className="font-bold text-slate-850 dark:text-slate-200 hover:underline">{p.name}</Link>
                </div>
                <span className="font-mono text-slate-900 dark:text-white font-bold">{p.strikeRate} %</span>
              </div>
            ))}
          </div>
        </div>

        {/* Best Economy (Min 12 balls) */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold mb-4 border-b border-slate-100 dark:border-dark-border pb-3 flex items-center gap-1.5">
            <Zap className="h-4.5 w-4.5 text-lime-500" />
            Best Economy Rates (Min 12 balls)
          </h3>
          <div className="space-y-3">
            {bestEconomy.map((p, idx) => (
              <div key={p._id} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 dark:border-dark-border/20 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-5 font-bold text-slate-400">{idx + 1}</span>
                  <Link to={`/players/${p._id}`} className="font-bold text-slate-850 dark:text-slate-200 hover:underline">{p.name}</Link>
                </div>
                <span className="font-mono text-slate-900 dark:text-white font-bold">{p.economyRate} rpo</span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Fours & Sixes */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold mb-4 border-b border-slate-100 dark:border-dark-border pb-3">
            Most Boundaries
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Total Fours (4s)</h4>
              <div className="space-y-2">
                {mostFours.slice(0, 5).map((p, i) => (
                  <div key={p._id} className="flex justify-between text-xs py-1 border-b border-slate-50 dark:border-dark-border/20 last:border-0">
                    <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{p.name}</span>
                    <span className="font-bold">{p.stats.batting.fours}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Total Sixes (6s)</h4>
              <div className="space-y-2">
                {mostSixes.slice(0, 5).map((p, i) => (
                  <div key={p._id} className="flex justify-between text-xs py-1 border-b border-slate-50 dark:border-dark-border/20 last:border-0">
                    <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{p.name}</span>
                    <span className="font-bold">{p.stats.batting.sixes}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Emerging Players */}
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold mb-4 border-b border-slate-100 dark:border-dark-border pb-3 flex items-center gap-1.5">
            <Heart className="h-4.5 w-4.5 text-rose-500" />
            Emerging Players (Top 5 MVP, &le; 5 Innings)
          </h3>
          <div className="space-y-3">
            {emergingPlayer.slice(0, 5).map((p, idx) => (
              <div key={p._id} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 dark:border-dark-border/20 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-5 font-bold text-slate-400">{idx + 1}</span>
                  <Link to={`/players/${p._id}`} className="font-bold text-slate-850 dark:text-slate-200 hover:underline">{p.name}</Link>
                </div>
                <span className="font-bold text-slate-905 dark:text-white">{p.mvpPoints} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hall of Shame */}
        <div className="bg-red-950/5 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/60 rounded-[32px] p-6 shadow-[0_24px_80px_-40px_rgba(220,38,38,0.55)] col-span-1 md:col-span-2">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-red-950 dark:text-red-100">Hall of Shame</h3>
              <p className="text-sm text-red-700/80 dark:text-red-200/70">Top 3 worst offenders for ducks and expensive bowling.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-red-100/80 px-3 py-1 text-sm font-semibold text-red-800 dark:border-red-700/50 dark:bg-red-900/30 dark:text-red-200">
              <ShieldAlert className="h-4 w-4" />
              Badges of infamy
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-red-200/80 bg-white dark:bg-red-950/80 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.24em] text-red-600">Most Ducks</h4>
                  <p className="text-[11px] text-red-700 dark:text-red-300 mt-1">Only the top 3 make it here.</p>
                </div>
                <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-800 dark:bg-red-800/70 dark:text-red-100">Shame Level</span>
              </div>
              <div className="space-y-3">
                {mostDucks.length === 0 ? (
                  <p className="text-sm text-slate-500">No duck data available yet.</p>
                ) : (
                  mostDucks.slice(0, 3).map((p, idx) => (
                    <div key={p._id} className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/80 p-3 text-sm text-red-950 dark:border-red-700/50 dark:bg-red-900/50 dark:text-red-100">
                      <span className="min-w-[24px] text-lg font-black text-red-600">{idx + 1}</span>
                      <div className="min-w-0 grow">
                        <Link to={`/players/${p._id}`} className="block truncate font-bold hover:underline">{p.name || p.player?.name || 'Unknown Player'}</Link>
                        <p className="text-[11px] text-red-700/80 dark:text-red-200/70">Duck count: <span className="font-semibold">{p.ducks ?? p.stats?.batting?.ducks ?? '-'}</span></p>
                      </div>
                      <span className="rounded-full bg-red-600 px-2 py-1 text-[11px] font-semibold text-white">{p.ducks ?? p.stats?.batting?.ducks ?? '-'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-red-200/80 bg-white dark:bg-red-950/80 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.24em] text-red-600">Most Expensive Economy</h4>
                  <p className="text-[11px] text-red-700 dark:text-red-300 mt-1">Worst runs per over conceded, top 3 only.</p>
                </div>
                <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-800 dark:bg-red-800/70 dark:text-red-100">RPO Pain</span>
              </div>
              <div className="space-y-3">
                {highestRunRate.length === 0 ? (
                  <p className="text-sm text-slate-500">No run rate data available yet.</p>
                ) : (
                  highestRunRate.slice(0, 3).map((p, idx) => (
                    <div key={p._id} className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50/80 p-3 text-sm text-red-950 dark:border-red-700/50 dark:bg-red-900/50 dark:text-red-100">
                      <span className="min-w-[24px] text-lg font-black text-red-600">{idx + 1}</span>
                      <div className="min-w-0 grow">
                        <Link to={`/players/${p._id}`} className="block truncate font-bold hover:underline">{p.name || p.player?.name || 'Unknown Player'}</Link>
                        <p className="text-[11px] text-red-700/80 dark:text-red-200/70">Runs per over: <span className="font-semibold">{p.runRate ?? (p.stats?.bowling?.ballsBowled ? parseFloat((p.stats.bowling.runsConceded / (p.stats.bowling.ballsBowled / 6)).toFixed(2)) : '-')}</span></p>
                      </div>
                      <span className="rounded-full bg-red-600 px-2 py-1 text-[11px] font-semibold text-white">{p.runRate ?? (p.stats?.bowling?.ballsBowled ? parseFloat((p.stats.bowling.runsConceded / (p.stats.bowling.ballsBowled / 6)).toFixed(2)) : '-')}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
