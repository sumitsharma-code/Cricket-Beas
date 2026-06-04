import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MatchCard from '../components/MatchCard';
import { Plus, Calendar, Users, User, Activity, UserPlus } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  
  // Data lists
  const [matches, setMatches] = useState([]);
  
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matches');

  // Modals state
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showAdminMatchModal, setShowAdminMatchModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  // New Match fields
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [matchType, setMatchType] = useState('Custom');
  const [totalOvers, setTotalOvers] = useState(0);
  // Admin add-match (custom teams) fields
  const [homeTeamName, setHomeTeamName] = useState('');
  const [homeTeamMembers, setHomeTeamMembers] = useState([]);
  const [awayTeamName, setAwayTeamName] = useState('');
  const [awayTeamMembers, setAwayTeamMembers] = useState([]);

  // Deduplicate players by _id to avoid duplicates showing in the modal
  const uniquePlayers = useMemo(() => {
    const map = new Map();
    (players || []).forEach(p => {
      if (p && p._id && !map.has(p._id)) map.set(p._id, p);
    });
    return Array.from(map.values());
  }, [players]);
  // (tournaments removed — matches are custom only)

  // Dashboard stats and recent matches
  const totalMatches = matches.length;
  const totalTeams = teams.length;
  const totalPlayers = players.length;

  const recentMatches = useMemo(() => {
    const copy = Array.isArray(matches) ? [...matches] : [];
    copy.sort((a, b) => {
      const aTime = new Date(a?.createdAt || a?.startTime || a?.date || 0).getTime();
      const bTime = new Date(b?.createdAt || b?.startTime || b?.date || 0).getTime();
      return bTime - aTime;
    });
    return copy.slice(0, 5);
  }, [matches]);

  // New Team fields
  const [teamName, setTeamName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState([]);

  // New Player fields
  const [playerName, setPlayerName] = useState('');
  const [playerRole, setPlayerRole] = useState('Batsman');
  const [battingStyle, setBattingStyle] = useState('Right-hand Batsman');
  const [bowlingStyle, setBowlingStyle] = useState('None');

  const isModerator = user && ['Super Admin', 'Master Host', 'Admin', 'Organizer'].includes(user.role);
  const isAdmin = user && ['Super Admin', 'Master Host', 'Admin'].includes(user.role);

  const fetchData = async () => {
    setLoading(true);
    try {
      const matchData = await api.getMatches();
      setMatches(matchData);
      const teamData = await api.getTeams();
      setTeams(teamData);
      
      const playerData = await api.getPlayers();
      setPlayers(playerData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    if (!homeTeamId || !awayTeamId) return;
    if (homeTeamId === awayTeamId) {
      alert("Home and Away teams must be different!");
      return;
    }
    try {
      await api.createMatch({
        homeTeamId,
        awayTeamId,
        matchType,
        totalOvers: Number(totalOvers),
        tournamentId: null,
      });
      setShowMatchModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAdminCreateMatch = async (e) => {
    e.preventDefault();
    if (!homeTeamName || !awayTeamName) return alert('Please provide both team names');
    if (homeTeamName.trim() === awayTeamName.trim()) return alert('Teams must have different names');

    try {
      // Create teams from provided names + selected player ids
      const homeTeam = await api.createTeam({ name: homeTeamName.trim(), playerIds: homeTeamMembers });
      const awayTeam = await api.createTeam({ name: awayTeamName.trim(), playerIds: awayTeamMembers });

      await api.createMatch({
        homeTeamId: homeTeam._id,
        awayTeamId: awayTeam._id,
        matchType: 'Custom',
        totalOvers: 0,
        tournamentId: null,
      });

      setShowAdminMatchModal(false);
      setHomeTeamName('');
      setAwayTeamName('');
      setHomeTeamMembers([]);
      setAwayTeamMembers([]);
      fetchData();
    } catch (err) {
      alert(err.message || 'Error creating match');
    }
  };

  

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName) return;
    try {
      await api.createTeam({
        name: teamName,
        playerIds: selectedPlayers,
      });
      setShowTeamModal(false);
      setTeamName('');
      setSelectedPlayers([]);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreatePlayer = async (e) => {
    e.preventDefault();
    if (!playerName) return;
    try {
      await api.createPlayer({
        name: playerName,
        role: playerRole,
        battingStyle,
        bowlingStyle,
      });
      setShowPlayerModal(false);
      setPlayerName('');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  

  const handleCreateUser = async (e) => {
    e.preventDefault();

    const trimmedUsername = newUsername.trim();
    if (!trimmedUsername || !newPassword) {
      alert('Username and password are required');
      return;
    }

    try {
      await api.createUser({
        username: trimmedUsername.toLowerCase(),
        password: newPassword,
        role: 'Player',
        name: trimmedUsername.toLowerCase(),
      });

      setShowUserModal(false);
      setNewUsername('');
      setNewPassword('');
      fetchData();
      alert('User created successfully');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Compact Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between bg-transparent">
          <div>
            <h1 className="text-2xl font-bold">CricBeas — Live Scores</h1>
            <p className="text-sm text-slate-500">Fast mobile-first scoring for local cricket</p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button 
                onClick={() => setShowUserModal(true)}
                className="bg-emerald-500 text-white hover:bg-emerald-600 font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" /> Add User
              </button>
            )}
            {isAdmin && (
              <button 
                onClick={() => setShowAdminMatchModal(true)}
                className="bg-white text-cricket-700 hover:bg-slate-50 font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Add Match
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats & Recent Matches */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-cricket-600 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">Matches</div>
            <div className="text-xl font-bold">{totalMatches}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-cricket-600 text-white">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">Teams</div>
            <div className="text-xl font-bold">{totalTeams}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-4 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-cricket-600 text-white">
            <User className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500">Players</div>
            <div className="text-xl font-bold">{totalPlayers}</div>
          </div>
        </div>
      </div>

      {recentMatches.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3">Recent Matches</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentMatches.map(m => (
              <MatchCard key={m._id} match={m} />
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-dark-border mb-6">
        <button
          onClick={() => setActiveTab('matches')}
          className={`py-3 px-6 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'matches'
              ? 'border-cricket-500 text-cricket-600 dark:text-cricket-400'
              : 'border-transparent text-slate-500 dark:text-dark-muted hover:text-slate-700'
          }`}
        >
          <Activity className="h-4 w-4" /> Live & Scheduled Matches
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`py-3 px-6 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'teams'
              ? 'border-cricket-500 text-cricket-600 dark:text-cricket-400'
              : 'border-transparent text-slate-500 dark:text-dark-muted hover:text-slate-700'
          }`}
        >
          <Users className="h-4 w-4" /> Teams & Players
        </button>
      </div>
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-cricket-600 mx-auto mb-4"></div>
          <p className="text-slate-500 dark:text-dark-muted">Loading dashboard details...</p>
        </div>
      ) : (
        <>
          {/* Matches Tab */}
          {activeTab === 'matches' && (
            <div>
              {matches.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl">
                  <Calendar className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-800 dark:text-white">No matches recorded</h3>
                  <p className="text-sm text-slate-500 mt-1 mb-4">Create a match using Add Match.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {matches.map(m => (
                      <MatchCard key={m._id} match={m} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tournaments removed — matches will be custom only */}

          {/* Teams & Players Tab */}
          {activeTab === 'teams' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Teams Roster */}
              <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-cricket-600" />
                    Teams List
                  </h3>
                  {/* Add Team button removed */}
                </div>

                {teams.length === 0 ? (
                  <p className="text-sm text-slate-500 italic py-4 text-center">No teams registered</p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-dark-border">
                    {teams.map(t => (
                      <div key={t._id} className="py-3 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-850 dark:text-white">{t.name}</div>
                          <div className="text-xs text-slate-500">{t.players?.length || 0} squad members</div>
                        </div>
                        <a href={`/teams/${t._id}`} className="text-xs font-semibold text-cricket-650 hover:underline">
                          View details
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Players Roster */}
              <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <User className="h-5 w-5 text-cricket-600" />
                    Players List
                  </h3>
                  {/* Add Player button removed */}
                </div>

                {players.length === 0 ? (
                  <p className="text-sm text-slate-500 italic py-4 text-center">No players registered</p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-dark-border max-h-96 overflow-y-auto pr-1">
                    {players.map(p => (
                      <div key={p._id} className="py-3 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-850 dark:text-white">{p.name}</div>
                          <div className="text-xs text-slate-500">{p.role} &bull; {p.battingStyle}</div>
                        </div>
                        <a href={`/players/${p._id}`} className="text-xs font-semibold text-cricket-650 hover:underline">
                          Stats
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Admin Add Match Modal (create teams by name + members) */}
      {showAdminMatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-2xl p-6 relative">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Add Match (Custom Teams)</h3>
            <form onSubmit={handleAdminCreateMatch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-500 mb-1">Home Team Name</label>
                  <input
                    type="text"
                    required
                    value={homeTeamName}
                    onChange={(e) => setHomeTeamName(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-dark-border rounded-xl bg-transparent text-slate-900 dark:text-white"
                    placeholder="e.g. Royal Strikers"
                  />

                  <label className="block text-sm font-semibold text-slate-500 mb-1 mt-3">Select Home Members</label>
                  <div className="border border-slate-300 dark:border-dark-border rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                    {uniquePlayers
                      .filter(p => !awayTeamMembers.includes(p._id))
                      .map(p => (
                      <label key={p._id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={homeTeamMembers.includes(p._id)}
                          onChange={(e) => {
                            const pid = p._id;
                            if (e.target.checked) {
                              setHomeTeamMembers(prev => prev.includes(pid) ? prev : [...prev, pid]);
                              setAwayTeamMembers(prev => prev.filter(id => id !== pid));
                            } else {
                              setHomeTeamMembers(prev => prev.filter(id => id !== pid));
                            }
                          }}
                          className="rounded text-cricket-500 focus:ring-cricket-500"
                        />
                        {p.name} ({p.role})
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-500 mb-1">Away Team Name</label>
                  <input
                    type="text"
                    required
                    value={awayTeamName}
                    onChange={(e) => setAwayTeamName(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-dark-border rounded-xl bg-transparent text-slate-900 dark:text-white"
                    placeholder="e.g. Desert Warriors"
                  />

                  <label className="block text-sm font-semibold text-slate-500 mb-1 mt-3">Select Away Members</label>
                  <div className="border border-slate-300 dark:border-dark-border rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                      {uniquePlayers
                        .filter(p => !homeTeamMembers.includes(p._id))
                        .map(p => (
                        <label key={p._id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={awayTeamMembers.includes(p._id)}
                            onChange={(e) => {
                              const pid = p._id;
                              if (e.target.checked) {
                                setAwayTeamMembers(prev => prev.includes(pid) ? prev : [...prev, pid]);
                                setHomeTeamMembers(prev => prev.filter(id => id !== pid));
                              } else {
                                setAwayTeamMembers(prev => prev.filter(id => id !== pid));
                              }
                            }}
                            className="rounded text-cricket-500 focus:ring-cricket-500"
                          />
                          {p.name} ({p.role})
                        </label>
                      ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 py-2 text-sm">Create Match</button>
                <button 
                  type="button" 
                  onClick={() => setShowAdminMatchModal(false)}
                  className="btn-secondary py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Match Scheduler Modal */}
      {showMatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-md p-6 relative">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Schedule New Match</h3>
            <form onSubmit={handleCreateMatch} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Home Team</label>
                <select
                  required
                  value={homeTeamId}
                  onChange={(e) => setHomeTeamId(e.target.value)}
                  className="w-full p-2 border border-slate-300 dark:border-dark-border rounded-xl bg-transparent text-slate-900 dark:text-white"
                >
                  <option value="">Select Home Team</option>
                  {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Away Team</label>
                <select
                  required
                  value={awayTeamId}
                  onChange={(e) => setAwayTeamId(e.target.value)}
                  className="w-full p-2 border border-slate-300 dark:border-dark-border rounded-xl bg-transparent text-slate-900 dark:text-white"
                >
                  <option value="">Select Away Team</option>
                  {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <p className="text-sm text-slate-500">Match type: Custom (no T20/ODI selection)</p>
              </div>

              {/* Matches are custom-only; tournament association removed */}

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 py-2 text-sm">Create Match</button>
                <button 
                  type="button" 
                  onClick={() => setShowMatchModal(false)}
                  className="btn-secondary py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tournament UI removed per request */}

      {/* Team Creator Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-md p-6 relative">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Create New Team</h3>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full p-2 border border-slate-300 dark:border-dark-border rounded-xl bg-transparent text-slate-900 dark:text-white"
                  placeholder="e.g. Royal Strikers"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Select Players</label>
                <div className="border border-slate-300 dark:border-dark-border rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                  {players.map(p => (
                    <label key={p._id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={selectedPlayers.includes(p._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPlayers([...selectedPlayers, p._id]);
                          } else {
                            setSelectedPlayers(selectedPlayers.filter(id => id !== p._id));
                          }
                        }}
                        className="rounded text-cricket-500 focus:ring-cricket-500"
                      />
                      {p.name} ({p.role})
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 py-2 text-sm">Create Team</button>
                <button 
                  type="button" 
                  onClick={() => setShowTeamModal(false)}
                  className="btn-secondary py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Player Creator Modal */}
      {showPlayerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-md p-6 relative">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Create New Player</h3>
            <form onSubmit={handleCreatePlayer} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Player Name</label>
                <input
                  type="text"
                  required
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full p-2 border border-slate-300 dark:border-dark-border rounded-xl bg-transparent text-slate-905 dark:text-white"
                  placeholder="e.g. MS Dhoni"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-550 mb-1">Role</label>
                  <select
                    value={playerRole}
                    onChange={(e) => setPlayerRole(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 dark:border-dark-border rounded-lg text-xs bg-transparent dark:text-white"
                  >
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All-Rounder">All-Rounder</option>
                    <option value="Wicket-Keeper">Wicket-Keeper</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-550 mb-1">Batting Style</label>
                  <select
                    value={battingStyle}
                    onChange={(e) => setBattingStyle(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 dark:border-dark-border rounded-lg text-xs bg-transparent dark:text-white"
                  >
                    <option value="Right-hand Batsman">Right Hand</option>
                    <option value="Left-hand Batsman">Left Hand</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-550 mb-1">Bowling Style</label>
                  <select
                    value={bowlingStyle}
                    onChange={(e) => setBowlingStyle(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 dark:border-dark-border rounded-lg text-xs bg-transparent dark:text-white"
                  >
                    <option value="None">None</option>
                    <option value="Right-arm Fast">Right-arm Fast</option>
                    <option value="Right-arm Spin">Right-arm Spin</option>
                    <option value="Left-arm Fast">Left-arm Fast</option>
                    <option value="Left-arm Spin">Left-arm Spin</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 py-2 text-sm">Create Profile</button>
                <button 
                  type="button" 
                  onClick={() => setShowPlayerModal(false)}
                  className="btn-secondary py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Creator Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-lg p-6 relative">
            <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">Add New User</h3>
            <p className="text-sm text-slate-500 dark:text-dark-muted mb-4">
              Create a login and profile. Username will be used as the display name.
            </p>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-500 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z]/g, ''))}
                    className="w-full p-2 border border-slate-300 dark:border-dark-border rounded-xl bg-transparent text-slate-900 dark:text-white"
                    placeholder="lowercase letters only"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-500 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-dark-border rounded-xl bg-transparent text-slate-900 dark:text-white"
                    placeholder="Temporary password"
                  />
                </div>
              </div>

              {/* Profile details removed for admin add-user flow; only credentials are required */}

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 py-2 text-sm">Create User</button>
                <button 
                  type="button" 
                  onClick={() => setShowUserModal(false)}
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
