import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Eye, Settings, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function MatchCard({ match }) {
  const { user } = useAuth();
  
  const homeTeam = match.homeTeamId || { name: 'Home Team' };
  const awayTeam = match.awayTeamId || { name: 'Away Team' };

  // Calculate quick score displays
  const getScoreDisplay = (inningsIndex) => {
    const inn = match.innings[inningsIndex];
    if (!inn) return null;
    return (
      <div className="flex items-center justify-between font-sans">
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {inn.teamId === homeTeam._id ? homeTeam.name : awayTeam.name}
        </span>
        <span className="font-bold text-slate-900 dark:text-white">
          {inn.runs}/{inn.wickets} <span className="text-xs font-normal text-slate-500">({inn.overs}.{inn.balls} ov)</span>
        </span>
      </div>
    );
  };

  const isUserModerator = user && (['Super Admin', 'Master Host', 'Admin', 'Organizer'].includes(user.role));

  return (
    <div className="card hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-55/40 dark:bg-slate-900/30 border-b border-slate-100 dark:border-dark-border flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {match.matchType} &bull; {match.totalOvers} Overs
        </span>
        {match.status === 'Live' ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-pulse dark:bg-red-950/40 dark:text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-650 dark:bg-red-500"></span>
            LIVE
          </span>
        ) : match.status === 'Completed' ? (
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold dark:bg-slate-800 dark:text-slate-300">
            COMPLETED
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold dark:bg-blue-950/20 dark:text-blue-400">
            <Calendar className="h-3 w-3" />
            SCHEDULED
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex-grow flex flex-col justify-center gap-3">
        {match.status === 'Scheduled' ? (
          <div className="flex items-center justify-between text-center py-2">
            <div className="w-5/12">
              <div className="h-12 w-12 bg-cricket-100 dark:bg-dark-border rounded-full flex items-center justify-center mx-auto text-cricket-700 dark:text-cricket-500 font-bold text-lg">
                {homeTeam.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="mt-1 font-semibold text-sm truncate text-slate-800 dark:text-slate-200">{homeTeam.name}</div>
            </div>
            <div className="w-2/12 font-bold text-slate-400">VS</div>
            <div className="w-5/12">
              <div className="h-12 w-12 bg-teal-100 dark:bg-dark-border rounded-full flex items-center justify-center mx-auto text-teal-700 dark:text-teal-500 font-bold text-lg">
                {awayTeam.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="mt-1 font-semibold text-sm truncate text-slate-800 dark:text-slate-200">{awayTeam.name}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 py-1">
            {getScoreDisplay(0) || (
              <div className="flex items-center justify-between font-sans text-slate-400 text-sm">
                <span>{homeTeam.name}</span>
                <span>Yet to Bat</span>
              </div>
            )}
            {getScoreDisplay(1) || (
              <div className="flex items-center justify-between font-sans text-slate-400 text-sm">
                <span>{awayTeam.name}</span>
                <span>Yet to Bat</span>
              </div>
            )}
          </div>
        )}

        {/* Result Description / Toss Info */}
        <div className="text-xs text-slate-500 dark:text-slate-400 italic border-t border-slate-100 dark:border-dark-border/50 pt-2.5">
          {match.status === 'Completed' ? (
            <span className="font-semibold text-cricket-600 dark:text-cricket-500">{match.resultDescription}</span>
          ) : match.toss?.wonBy ? (
            <span>Toss won by Team, elected to {match.toss.decision}</span>
          ) : (
            <span>Toss pending</span>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/10 border-t border-slate-100 dark:border-dark-border flex gap-2">
        {match.status === 'Live' ? (
          <>
            <Link to={`/matches/${match._id}`} className="btn-primary flex-1 py-1.5 text-xs">
              <Eye className="h-3.5 w-3.5" />
              Watch Live
            </Link>
            {isUserModerator && (
              <Link to={`/matches/${match._id}/scoring`} className="btn bg-amber-500 hover:bg-amber-600 text-white py-1.5 px-3 text-xs">
                <Settings className="h-3.5 w-3.5" />
                Score
              </Link>
            )}
          </>
        ) : match.status === 'Completed' ? (
          <Link to={`/matches/${match._id}`} className="btn-secondary flex-1 py-1.5 text-xs text-slate-700 dark:text-slate-200">
            <Eye className="h-3.5 w-3.5" />
            View Scorecard
          </Link>
        ) : (
          <>
              {isUserModerator ? (
                <StartButton match={match} homeTeam={homeTeam} />
              ) : (
                <Link to={`/matches/${match._id}`} className="btn-secondary flex-1 py-1.5 text-xs">
                  <Eye className="h-3.5 w-3.5" />
                  Preview Details
                </Link>
              )}
          </>
        )}
      </div>
    </div>
  );
}

function StartButton({ match, homeTeam }) {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    // Navigate to the Points page where toss/overs are collected
    navigate(`/matches/${match._id}/points`);
  };

  return (
    <button onClick={handleStart} disabled={starting} className="btn-primary flex-1 py-1.5 text-xs">
      <Play className="h-3.5 w-3.5" />
      {starting ? 'Starting...' : 'Start Match'}
    </button>
  );
}
