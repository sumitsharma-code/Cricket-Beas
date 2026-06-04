import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Trophy, Calendar, Users, ShieldAlert, Plus, Play, Sparkles } from 'lucide-react';
import MatchCard from '../components/MatchCard';

export default function TournamentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  
  const [tournament, setTournament] = useState(null);
  const [allTeams, setAllTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Organizer state
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [selectedTeamsToAdd, setSelectedTeamsToAdd] = useState([]);
  const [matchFormat, setMatchFormat] = useState('T20');
  const [totalOvers, setTotalOvers] = useState(20);

  const isOrganizer = tournament && user && (tournament.organizerId === user._id || tournament.organizerId?._id === user._id || user.role === 'Admin');

  const fetchTournamentData = async () => {
    try {
      const data = await api.getTournament(id);
      setTournament(data);
      
      const teamsData = await api.getTeams();
      setAllTeams(teamsData);
    } catch (err) {
      console.error(err);
      setError('Failed to load tournament details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournamentData();
  }, [id]);

  const handleAddTeams = async (e) => {
    e.preventDefault();
    if (selectedTeamsToAdd.length === 0) return;
    
    try {
      await api.addTeamsToTournament(id, selectedTeamsToAdd);
      setShowAddTeamModal(false);
      setSelectedTeamsToAdd([]);
      fetchTournamentData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGenerateFixtures = async () => {
    if (window.confirm("This will generate a round-robin schedule for all registered teams. Proceed?")) {
      try {
        await api.generateFixtures(id, {
          matchType: matchFormat,
          totalOvers: Number(totalOvers)
        });
        fetchTournamentData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-cricket-600 mx-auto mb-4"></div>
        <p className="text-slate-500 dark:text-dark-muted">Loading tournament details...</p>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="max-w-md mx-auto my-12 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-6 rounded-2xl">
        <ShieldAlert className="h-10 w-10 text-red-600 mx-auto mb-3" />
        <h3 className="font-bold text-red-800 dark:text-red-400">Error Loading Tournament</h3>
        <p className="text-sm text-red-650 dark:text-red-450 mt-1 mb-4">{error || 'Tournament not found'}</p>
        <Link to="/" className="btn-secondary text-sm">Back to Dashboard</Link>
      </div>
    );
  }

  const unregisteredTeams = allTeams.filter(team => 
    !tournament.teams.some(t => t._id === team._id)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 bg-cricket-100 dark:bg-cricket-900/30 text-cricket-600 dark:text-cricket-500 rounded-2xl flex items-center justify-center">
            <Trophy className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-805 dark:text-white">{tournament.name}</h1>
            <p className="text-slate-500 dark:text-dark-muted text-sm mt-1">
              Format: <span className="font-semibold text-slate-700 dark:text-slate-300">{tournament.format}</span> &bull; Status: <span className="font-semibold">{tournament.status}</span>
            </p>
          </div>
        </div>

        {/* Organizer Options */}
        {isOrganizer && (
          <div className="flex flex-wrap gap-2.5">
            <button 
              onClick={() => setShowAddTeamModal(true)}
              className="btn btn-secondary py-1.5 px-4 text-xs font-semibold"
            >
              <Plus className="h-4 w-4" /> Add Teams
            </button>
            {tournament.fixtures.length === 0 && tournament.teams.length >= 2 && (
              <button 
                onClick={handleGenerateFixtures}
                className="btn-primary py-1.5 px-4 text-xs font-semibold flex items-center gap-1"
              >
                <Sparkles className="h-4 w-4" /> Generate Fixtures
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grid: Left: Points Table, Right: Fixtures */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Standings / Points Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm overflow-hidden">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-cricket-650" />
              Tournament Standings
            </h2>
            
            {tournament.pointsTable.length === 0 ? (
              <div className="text-center py-12 text-slate-450 dark:text-dark-muted italic text-sm">
                No teams registered yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-dark-border text-slate-450 font-semibold uppercase text-xs">
                      <th className="py-3 px-2">Pos</th>
                      <th className="py-3 px-2">Team</th>
                      <th className="py-3 px-2 text-center">P</th>
                      <th className="py-3 px-2 text-center">W</th>
                      <th className="py-3 px-2 text-center">L</th>
                      <th className="py-3 px-2 text-center">T</th>
                      <th className="py-3 px-2 text-center">Pts</th>
                      <th className="py-3 px-2 text-right">NRR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
                    {tournament.pointsTable.map((standing, index) => (
                      <tr 
                        key={standing._id || index}
                        className={`${
                          index < 4 
                            ? 'bg-cricket-50/10 dark:bg-cricket-900/5' // top 4 qualification highlighting
                            : ''
                        }`}
                      >
                        <td className="py-3.5 px-2 font-bold text-slate-500">
                          {index + 1}
                        </td>
                        <td className="py-3.5 px-2 font-bold text-slate-800 dark:text-slate-200">
                          {standing.teamId ? (
                            <Link to={`/teams/${standing.teamId._id}`} className="hover:text-cricket-600 transition-colors">
                              {standing.teamId.name}
                            </Link>
                          ) : (
                            'Unknown Team'
                          )}
                          {index < 4 && (
                            <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-cricket-500" title="In qualification zone"></span>
                          )}
                        </td>
                        <td className="py-3.5 px-2 text-center">{standing.played}</td>
                        <td className="py-3.5 px-2 text-center text-cricket-600 dark:text-cricket-500 font-semibold">{standing.won}</td>
                        <td className="py-3.5 px-2 text-center text-red-650">{standing.lost}</td>
                        <td className="py-3.5 px-2 text-center text-slate-500">{standing.tied}</td>
                        <td className="py-3.5 px-2 text-center font-bold text-slate-900 dark:text-white">{standing.points}</td>
                        <td className={`py-3.5 px-2 text-right font-medium ${standing.netRunRate >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {standing.netRunRate >= 0 ? `+${standing.netRunRate.toFixed(3)}` : standing.netRunRate.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {tournament.pointsTable.length > 0 && (
              <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                <span className="h-2 w-2 rounded-full bg-cricket-500"></span>
                <span>Top 4 teams qualify for semi-finals knockout stage.</span>
              </div>
            )}
          </div>
        </div>

        {/* Fixtures List */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-cricket-650" />
              Match Fixtures
            </h2>

            {tournament.fixtures.length === 0 ? (
              <div className="text-center py-12 text-slate-450 dark:text-dark-muted italic text-sm">
                No fixtures scheduled.
                {isOrganizer && tournament.teams.length >= 2 && (
                  <button 
                    onClick={handleGenerateFixtures} 
                    className="mt-4 w-full btn-primary py-2 text-xs"
                  >
                    Generate Round Robin Schedule
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {tournament.fixtures.map(match => (
                  <MatchCard key={match._id} match={match} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Teams Modal */}
      {showAddTeamModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-md p-6 relative">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Register Teams for Tournament</h3>
            <form onSubmit={handleAddTeams} className="space-y-4">
              {unregisteredTeams.length === 0 ? (
                <p className="text-sm text-slate-500 italic text-center py-4">
                  No other teams available to register. Create a team from the dashboard first.
                </p>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-slate-500 mb-1">Select Teams</label>
                  <div className="border border-slate-300 dark:border-dark-border rounded-xl p-3 max-h-56 overflow-y-auto space-y-2">
                    {unregisteredTeams.map(t => (
                      <label key={t._id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={selectedTeamsToAdd.includes(t._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTeamsToAdd([...selectedTeamsToAdd, t._id]);
                            } else {
                              setSelectedTeamsToAdd(selectedTeamsToAdd.filter(id => id !== t._id));
                            }
                          }}
                          className="rounded text-cricket-500 focus:ring-cricket-500"
                        />
                        {t.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={unregisteredTeams.length === 0}
                  className="btn-primary flex-1 py-2 text-sm disabled:opacity-50"
                >
                  Register Selected Teams
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddTeamModal(false)}
                  className="btn-secondary py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
