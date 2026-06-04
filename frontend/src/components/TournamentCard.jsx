import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Award, Shield } from 'lucide-react';

export default function TournamentCard({ tournament }) {
  const teamCount = tournament.teams ? tournament.teams.length : 0;
  const fixtureCount = tournament.fixtures ? tournament.fixtures.length : 0;

  return (
    <div className="card hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
      <div className="p-5 flex-grow">
        {/* Format Badge */}
        <div className="flex justify-between items-start mb-3">
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-cricket-100 text-cricket-800 dark:bg-cricket-900/30 dark:text-cricket-400">
            {tournament.format} Format
          </span>
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
            tournament.status === 'Ongoing' 
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 animate-pulse'
              : tournament.status === 'Completed'
              ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
          }`}>
            {tournament.status}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-800 dark:text-white line-clamp-1 mb-2 font-sans">
          {tournament.name}
        </h3>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm text-slate-500 dark:text-slate-400 my-4">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-slate-400" />
            <span>{teamCount} Teams</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>{fixtureCount} Matches</span>
          </div>
        </div>

        {/* Organizer */}
        {tournament.organizerId && (
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span>Organized by {tournament.organizerId.username}</span>
          </div>
        )}
      </div>

      {/* Button */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/10 border-t border-slate-100 dark:border-dark-border">
        <Link 
          to={`/tournaments/${tournament._id}`} 
          className="btn-secondary w-full py-1.5 text-xs text-center block"
        >
          View Standings & Matches
        </Link>
      </div>
    </div>
  );
}
