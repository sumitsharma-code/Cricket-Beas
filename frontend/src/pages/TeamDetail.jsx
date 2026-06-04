import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Users, UserMinus, Plus, ShieldAlert, Award, UserCheck } from 'lucide-react';

export default function TeamDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [team, setTeam] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Roster states
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [isManaging, setIsManaging] = useState(false);

  const fetchTeamDetails = async () => {
    try {
      const teamData = await api.getTeam(id);
      setTeam(teamData);

      const playersData = await api.getPlayers();
      setAllPlayers(playersData);
    } catch (err) {
      console.error(err);
      setError('Team details could not be loaded');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamDetails();
  }, [id]);

  const isManager = team && user && (team.managerId?._id === user._id || team.managerId === user._id || user.role === 'Admin' || user.role === 'Organizer');

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!selectedPlayerId) return;

    try {
      setLoading(true);
      await api.addPlayerToTeam(id, selectedPlayerId);
      setSelectedPlayerId('');
      await fetchTeamDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePlayer = async (playerId) => {
    if (window.confirm("Remove this player from the squad?")) {
      try {
        setLoading(true);
        await api.removePlayerFromTeam(id, playerId);
        await fetchTeamDetails();
      } catch (err) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading && !team) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-cricket-600 mx-auto mb-4"></div>
        <p className="text-slate-500 dark:text-dark-muted">Loading team details...</p>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="max-w-md mx-auto my-12 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-6 rounded-2xl">
        <ShieldAlert className="h-10 w-10 text-red-650 mx-auto mb-3" />
        <h3 className="font-bold text-red-800 dark:text-red-400">Team Not Found</h3>
        <p className="text-sm text-red-650 dark:text-red-450 mt-1 mb-4">{error || 'This team profile is unavailable'}</p>
        <Link to="/" className="btn-secondary text-sm">Back to Dashboard</Link>
      </div>
    );
  }

  const squad = team.players || [];
  
  // Players who are not in this team already
  const playersNotInTeam = allPlayers.filter(player => 
    !squad.some(s => s._id === player._id)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 font-sans">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 scale-150">
          <Users className="w-64 h-64 text-slate-100 dark:text-slate-800" />
        </div>
        
        <div className="flex items-center gap-4 z-10">
          <div className="h-16 w-16 bg-cricket-100 text-cricket-750 dark:bg-cricket-900/30 dark:text-cricket-400 font-black text-2xl rounded-2xl flex items-center justify-center shadow">
            {team.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">{team.name}</h1>
            {team.managerId && (
              <p className="text-xs text-slate-400 mt-1">
                Manager: <span className="font-semibold">{team.managerId.username}</span> ({team.managerId.phone})
              </p>
            )}
          </div>
        </div>

        {/* Stats overlay */}
        <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-dark-border rounded-2xl p-4 flex gap-6 text-center z-10 min-w-[250px] justify-around">
          <div>
            <span className="text-xl font-black text-slate-800 dark:text-white">{team.stats?.played || 0}</span>
            <span className="block text-xs font-semibold text-slate-400 uppercase">Played</span>
          </div>
          <div className="border-l border-slate-200 dark:border-dark-border pl-4">
            <span className="text-xl font-black text-cricket-600 dark:text-cricket-500">{team.stats?.won || 0}</span>
            <span className="block text-xs font-semibold text-slate-400 uppercase">Won</span>
          </div>
          <div className="border-l border-slate-200 dark:border-dark-border pl-4">
            <span className="text-xl font-black text-red-600">{team.stats?.lost || 0}</span>
            <span className="block text-xs font-semibold text-slate-400 uppercase">Lost</span>
          </div>
        </div>
      </div>

      {/* Grid: Squad Members */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Squad List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-dark-border pb-3 mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-cricket-650" />
                Squad Roster ({squad.length} Players)
              </h2>
            </div>

            {squad.length === 0 ? (
              <p className="text-center py-12 text-slate-500 italic text-sm">No players added to squad yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-dark-border">
                {squad.map((player, index) => (
                  <div key={player._id} className="py-3.5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 w-4">{index + 1}</span>
                      <div>
                        <Link to={`/players/${player._id}`} className="font-bold text-slate-800 dark:text-slate-200 hover:text-cricket-600 transition-colors">
                          {player.name}
                        </Link>
                        <span className="block text-xs text-slate-450">{player.role} &bull; {player.battingStyle}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <Link to={`/players/${player._id}`} className="text-xs font-semibold text-cricket-650 hover:underline">
                        View Stats
                      </Link>
                      {isManager && (
                        <button
                          onClick={() => handleRemovePlayer(player._id)}
                          className="p-1 rounded text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20"
                          title="Remove Player"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Manager panel (Right sidebar) */}
        {isManager && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-md font-bold flex items-center gap-2 border-b border-slate-100 dark:border-dark-border pb-3">
                <UserCheck className="h-5 w-5 text-cricket-600" />
                Roster Management
              </h3>
              
              <form onSubmit={handleAddPlayer} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Add Player to Squad</label>
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-dark-border rounded-xl bg-transparent dark:text-white text-sm"
                  >
                    <option value="">Select a player...</option>
                    {playersNotInTeam.map(p => (
                      <option key={p._id} value={p._id}>{p.name} ({p.role})</option>
                    ))}
                  </select>
                </div>
                
                <button
                  type="submit"
                  disabled={!selectedPlayerId}
                  className="w-full btn-primary py-2 text-xs font-bold disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Add Player
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
