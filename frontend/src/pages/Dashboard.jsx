import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MatchCard from '../components/MatchCard';
import TournamentCard from '../components/TournamentCard';
import { Plus, Calendar, Trophy, Users, User, RefreshCw, Activity, UserPlus } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  
  // Data lists
  const [matches, setMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matches');

  // Modals state
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  // New Match fields
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [matchType, setMatchType] = useState('T20');
  const [totalOvers, setTotalOvers] = useState(20);
  const [matchTournamentId, setMatchTournamentId] = useState('');

  // New Tournament fields
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentFormat, setTournamentFormat] = useState('League');
  const [selectedTeams, setSelectedTeams] = useState([]);

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
      
      const tourData = await api.getTournaments();
      setTournaments(tourData);
      
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
        tournamentId: matchTournamentId || null,
      });
      setShowMatchModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    if (!tournamentName) return;
    try {
      await api.createTournament({
        name: tournamentName,
        format: tournamentFormat,
        teamIds: selectedTeams,
      });
      setShowTournamentModal(false);
      setTournamentName('');
      setSelectedTeams([]);
      fetchData();
    } catch (err) {
      alert(err.message);
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
      {/* Top Banner */}
      <div className="bg-linear-to-r from-cricket-600 to-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg mb-8 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4 scale-150">
          <Trophy className="w-96 h-96" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
            Local Cricket, Real-Time Scores
          </h1>
          <p className="text-slate-100 text-sm sm:text-base mb-6">
            Track runs, wickets, points tables, and career statistics on CricBeas, the premium platform for local tournaments.
          </p>
          <div className="flex flex-wrap gap-3">
            {isAdmin && (
              <button 
                onClick={() => setShowUserModal(true)}
                className="bg-emerald-500 text-white hover:bg-emerald-600 font-bold px-4 py-2 rounded-xl text-sm transition-colors shadow flex items-center gap-1.5"
              >
                <UserPlus className="h-4 w-4" /> Add User
              </button>
            )}
            {isModerator && (
              <>
                <button 
                  onClick={() => setShowMatchModal(true)}
                  className="bg-white text-cricket-700 hover:bg-slate-50 font-bold px-4 py-2 rounded-xl text-sm transition-colors shadow flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Schedule Match
                </button>
                <button 
                  onClick={() => setShowTournamentModal(true)}
                  className="bg-cricket-800 text-white hover:bg-cricket-900 border border-cricket-700 font-bold px-4 py-2 rounded-xl text-sm transition-colors shadow flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Start Tournament
                </button>
              </>
            )}
            <button 
              onClick={fetchData}
              className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors border border-white/20 flex items-center gap-1.5"
            >
              <RefreshCw className="h-4 w-4" /> Refresh Scores
            </button>
          </div>
        </div>
      </div>

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
          onClick={() => setActiveTab('tournaments')}
          className={`py-3 px-6 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'tournaments'
              ? 'border-cricket-500 text-cricket-600 dark:text-cricket-400'
              : 'border-transparent text-slate-500 dark:text-dark-muted hover:text-slate-700'
          }`}
        >
          <Trophy className="h-4 w-4" /> Tournaments
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
                  <h3 className="font-bold text-slate-800 dark:text-white">No matches scheduled</h3>
                  <p className="text-sm text-slate-500 mt-1 mb-4">Get started by creating your first match.</p>
                  {isModerator && (
                    <button onClick={() => setShowMatchModal(true)} className="btn-primary py-1.5 px-4 text-sm">
                      Schedule Match
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {matches.map(m => (
                    <MatchCard key={m._id} match={m} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tournaments Tab */}
          {activeTab === 'tournaments' && (
            <div>
              {tournaments.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl">
                  <Trophy className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-800 dark:text-white">No tournaments created yet</h3>
                  <p className="text-sm text-slate-500 mt-1 mb-4">Run full league series or knockouts.</p>
                  {isModerator && (
                    <button onClick={() => setShowTournamentModal(true)} className="btn-primary py-1.5 px-4 text-sm">
                      Create Tournament
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tournaments.map(t => (
                    <TournamentCard key={t._id} tournament={t} />
                  ))}
                </div>
              )}
            </div>
          )}

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
                  {isModerator && (
                    <button 
                      onClick={() => setShowTeamModal(true)}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      title="Add Team"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
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
                  {isModerator && (
                    <button 
                      onClick={() => setShowPlayerModal(true)}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      title="Add Player"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-500 mb-1">Match Format</label>
                  <select
                    value={matchType}
                    onChange={(e) => setMatchType(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-dark-border rounded-xl bg-transparent text-slate-900 dark:text-white"
                  >
                    <option value="T20">T20</option>
                    <option value="T10">T10</option>
                    <option value="ODI">ODI</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-500 mb-1">Overs</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={totalOvers}
                    onChange={(e) => setTotalOvers(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-dark-border rounded-xl bg-transparent text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Tournament (Optional)</label>
                <select
                  value={matchTournamentId}
                  onChange={(e) => setMatchTournamentId(e.target.value)}
                  className="w-full p-2 border border-slate-300 dark:border-dark-border rounded-xl bg-transparent text-slate-900 dark:text-white"
                >
                  <option value="">Friendly Match (No Tournament)</option>
                  {tournaments.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>

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

      {/* Tournament Creator Modal */}
      {showTournamentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-md p-6 relative">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Create New Tournament</h3>
            <form onSubmit={handleCreateTournament} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Tournament Name</label>
                <input
                  type="text"
                  required
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  className="w-full p-2 border border-slate-300 dark:border-dark-border rounded-xl bg-transparent text-slate-900 dark:text-white"
                  placeholder="e.g. CricBeas Premier Cup 2026"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Format</label>
                <select
                  value={tournamentFormat}
                  onChange={(e) => setTournamentFormat(e.target.value)}
                  className="w-full p-2 border border-slate-300 dark:border-dark-border rounded-xl bg-transparent text-slate-900 dark:text-white"
                >
                  <option value="League">League (Round-Robin)</option>
                  <option value="Knockout">Knockout Brackets</option>
                  <option value="League + Knockout">League + Knockout</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-500 mb-1">Select Participating Teams</label>
                <div className="border border-slate-300 dark:border-dark-border rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                  {teams.map(t => (
                    <label key={t._id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={selectedTeams.includes(t._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTeams([...selectedTeams, t._id]);
                          } else {
                            setSelectedTeams(selectedTeams.filter(id => id !== t._id));
                          }
                        }}
                        className="rounded text-cricket-500 focus:ring-cricket-500"
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 py-2 text-sm">Create League</button>
                <button 
                  type="button" 
                  onClick={() => setShowTournamentModal(false)}
                  className="btn-secondary py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
