import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import WagonWheelSelector from '../components/WagonWheelSelector';
import { ArrowLeft, BarChart2, FileText, ChevronRight, CornerUpLeft, Award, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MatchScoring() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Toss settings (Screen 1)
  const [tossWonBy, setTossWonBy] = useState('');
  const [tossDecision, setTossDecision] = useState('Bat');
  const [oversInput, setOversInput] = useState(16);

  // Player selector settings (Screen 2)
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [newStriker, setNewStriker] = useState('');
  const [newNonStriker, setNewNonStriker] = useState('');
  const [newBowler, setNewBowler] = useState('');

  // Ball inputs state
  const [runsInput, setRunsInput] = useState(0);
  const [extraType, setExtraType] = useState('None');
  const [extraRuns, setExtraRuns] = useState(0);
  
  // Wicket details
  const [wicketFell, setWicketFell] = useState(false);
  const [wicketType, setWicketType] = useState('Bowled');
  const [dismissedPlayerId, setDismissedPlayerId] = useState('');
  const [fielderId, setFielderId] = useState('');

  // Wagon wheel click coordinates
  const [wagonWheelCoords, setWagonWheelCoords] = useState(null);
  const [showWagonWheelModal, setShowWagonWheelModal] = useState(false);
  const [commentaryText, setCommentaryText] = useState('');

  const fetchMatchDetails = async () => {
    try {
      const data = await api.getMatch(id);
      // Ensure team player objects are populated (some backends return ObjectId array)
      const ensureTeamPlayers = async (teamObj) => {
        if (!teamObj) return teamObj;
        // If players is empty or already populated with objects, return as-is
        if (!teamObj.players || teamObj.players.length === 0) return teamObj;
        const first = teamObj.players[0];
        if (typeof first === 'object' && first.name) return teamObj;

        // Otherwise fetch player objects for each id
        try {
          const fetched = await Promise.all(teamObj.players.map(pid => api.getPlayer(pid)));
          return { ...teamObj, players: fetched };
        } catch (err) {
          // If fetch fails, return original
          return teamObj;
        }
      };

      const home = await ensureTeamPlayers(data.homeTeamId);
      const away = await ensureTeamPlayers(data.awayTeamId);
      setMatch({ ...data, homeTeamId: home, awayTeamId: away });
      if (data.status === 'Scheduled') {
        setTossWonBy(data.homeTeamId?._id || '');
        setOversInput(data.totalOvers || 16);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch match details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchDetails();
  }, [id]);

  const handleStartMatch = async (e) => {
    e.preventDefault();
    if (!tossWonBy) return;
    try {
      setLoading(true);
      // First save totalOvers if edited
      if (Number(oversInput) !== match.totalOvers) {
        // Assume startMatch handles updating totalOvers on the match model
        match.totalOvers = Number(oversInput);
      }
      await api.startMatch(id, { tossWonBy, tossDecision });
      const updated = await api.getMatch(id);
      setMatch(updated);
      
      // Immediately open the Select Opening Players screen
      setShowPlayerSelector(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPlayers = async (e) => {
    e.preventDefault();
    const needStriker = !match.currentState?.strikerId;
    const needNonStriker = !match.currentState?.nonStrikerId;
    const needBowler = !match.currentState?.currentBowlerId;

    if (needStriker && !newStriker) {
      alert("Please select striker!");
      return;
    }
    if (needNonStriker && !newNonStriker) {
      alert("Please select non-striker!");
      return;
    }
    if (needBowler && !newBowler) {
      alert("Please select bowler!");
      return;
    }

    if (needStriker && needNonStriker && newStriker === newNonStriker) {
      alert("Striker and Non-striker must be different players!");
      return;
    }
    if (needStriker && !needNonStriker && newStriker === match.currentState.nonStrikerId?._id) {
      alert("Striker cannot be the same as the current non-striker!");
      return;
    }
    if (needNonStriker && !needStriker && newNonStriker === match.currentState.strikerId?._id) {
      alert("Non-striker cannot be the same as the current striker!");
      return;
    }

    try {
      setLoading(true);
      await api.setActivePlayers(id, {
        strikerId: needStriker ? newStriker : match.currentState.strikerId._id,
        nonStrikerId: needNonStriker ? newNonStriker : match.currentState.nonStrikerId._id,
        bowlerId: needBowler ? newBowler : match.currentState.currentBowlerId._id
      });
      setShowPlayerSelector(false);
      
      // Reset selectors
      setNewStriker('');
      setNewNonStriker('');
      setNewBowler('');
      
      await fetchMatchDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordBall = async (runs) => {
    if (!match.currentState.strikerId || !match.currentState.nonStrikerId || !match.currentState.currentBowlerId) {
      setShowPlayerSelector(true);
      return;
    }

    try {
      const payload = {
        runsScored: runs,
        extraType: extraType,
        extraRuns: Number(extraRuns) || (extraType === 'Wide' || extraType === 'No Ball' ? 0 : 0),
        commentaryText: commentaryText || undefined,
      };

      if (wicketFell) {
        payload.wicket = {
          fell: true,
          type: wicketType,
          dismissedPlayerId: dismissedPlayerId || match.currentState.strikerId._id,
          fielderId: fielderId || null,
        };
      }

      if (wagonWheelCoords) {
        payload.wagonWheel = wagonWheelCoords;
      }

      const res = await api.recordBall(id, payload);
      
      // Reset ball recording state
      setRunsInput(0);
      setExtraType('None');
      setExtraRuns(0);
      setWicketFell(false);
      setWicketType('Bowled');
      setDismissedPlayerId('');
      setFielderId('');
      setWagonWheelCoords(null);
      setCommentaryText('');

      await fetchMatchDetails();

      // Check if bowler needs setting (due to over ending)
      if (res.isOverEnd) {
        alert("Over Completed! Select next bowler.");
        setShowPlayerSelector(true);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEndInnings = async () => {
    if (window.confirm("End this innings manually?")) {
      try {
        await api.endInnings(id);
        await fetchMatchDetails();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleSwapBatsmen = async () => {
    if (!match.currentState.strikerId || !match.currentState.nonStrikerId) return;
    try {
      setLoading(true);
      await api.setActivePlayers(id, {
        strikerId: match.currentState.nonStrikerId._id,
        nonStrikerId: match.currentState.strikerId._id
      });
      await fetchMatchDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !match) {
    return (
      <div className="text-center py-20 dark:bg-dark-bg min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-cricket-600 mx-auto mb-4"></div>
        <p className="text-slate-500 dark:text-dark-muted">Loading...</p>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="max-w-md mx-auto my-12 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-6 rounded-2xl">
        <ShieldAlert className="h-10 w-10 text-red-650 mx-auto mb-3" />
        <h3 className="font-bold text-red-800 dark:text-red-400">Error Loading Match</h3>
        <p className="text-sm text-red-650 mt-1 mb-4">{error || 'Match not found'}</p>
        <Link to="/" className="btn-secondary text-sm">Back to Dashboard</Link>
      </div>
    );
  }

  const homeTeam = match.homeTeamId || { name: 'Host Team' };
  const awayTeam = match.awayTeamId || { name: 'Visitor Team' };

  const getPopulatedTeam = (teamReference) => {
    if (!teamReference) return null;
    const teamIdStr = (typeof teamReference === 'object' && teamReference._id)
      ? teamReference._id.toString()
      : teamReference.toString();
    if (teamIdStr === homeTeam._id?.toString()) return homeTeam;
    if (teamIdStr === awayTeam._id?.toString()) return awayTeam;
    return null;
  };

  const battingTeam = match.currentInnings === 1 
    ? (getPopulatedTeam(match.innings[0]?.teamId) || homeTeam) 
    : (getPopulatedTeam(match.innings[1]?.teamId) || awayTeam);

  const bowlingTeam = battingTeam?._id?.toString() === homeTeam._id?.toString() ? awayTeam : homeTeam;

  // Compile players who haven't been dismissed
  const currentInningsObj = match.innings?.[match.currentInnings - 1];
  const activeBatsmenIds = [];
  if (match.currentState?.strikerId) activeBatsmenIds.push(match.currentState.strikerId._id);
  if (match.currentState?.nonStrikerId) activeBatsmenIds.push(match.currentState.nonStrikerId._id);

  const dismissedBatsmenIds = currentInningsObj 
    ? currentInningsObj.battingScorecard.filter(b => b.outStatus !== 'Not Out' && b.outStatus !== 'Retired Hurt').map(b => b.playerId?._id || b.playerId)
    : [];

  const availableBatsmen = battingTeam?.players 
    ? battingTeam.players.filter(p => !dismissedBatsmenIds.includes(p._id) && !activeBatsmenIds.includes(p._id))
    : [];

  const availableBowlers = bowlingTeam?.players 
    ? bowlingTeam.players.filter(p => p._id !== match.currentState?.currentBowlerId?._id)
    : [];

  // Helper for Strike Rate & Economy Rate
  const getStrikeRate = (runs, balls) => (balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.00');
  const getEconomy = (runs, overs, balls) => {
    const totalOvers = overs + (balls / 6);
    return totalOvers > 0 ? (runs / totalOvers).toFixed(2) : '0.00';
  };

  // Helper to check if a lock applies (only assignedScorerId can write)
  // If not scorer, we can display a read-only warning
  const isScorerLocked = match.assignedScorerId && match.assignedScorerId._id !== user?._id && match.assignedScorerId !== user?._id && user?.role !== 'Super Admin';

  if (!match.homeTeamId || !match.awayTeamId) {
    return (
      <div className="max-w-md mx-auto my-12 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-6 rounded-2xl">
        <ShieldAlert className="h-10 w-10 text-red-650 mx-auto mb-3" />
        <h3 className="font-bold text-red-800 dark:text-red-400">Match teams are missing</h3>
        <p className="text-sm text-red-650 mt-1 mb-4">This match cannot be scored until both teams exist again.</p>
        <Link to="/" className="btn-secondary text-sm">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-dark-bg text-slate-800 dark:text-dark-text pb-16 font-sans">
      
      {/* SECURITY LOCK NOTICE */}
      {isScorerLocked && (
        <div className="bg-red-600 text-white text-center py-2 text-xs font-bold sticky top-0 z-50">
          Scorer Lock Active: Only the assigned scorer ({match.assignedScorerId?.username || 'assigned user'}) can input scores.
        </div>
      )}

      {/* ========================================================
          SCREEN 1: Toss Setup & Decision (Scheduled Status)
          ======================================================== */}
      {match.status === 'Scheduled' && (
        <div className="max-w-md mx-auto p-4 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Link to="/" className="p-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-350">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold">Start Match Setup</h1>
          </div>

          <form onSubmit={handleStartMatch} className="space-y-5 bg-white dark:bg-dark-card p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-dark-border">
            {/* Teams Inputs */}
            <div className="space-y-4">
              <h3 className="text-cricket-700 dark:text-cricket-500 font-bold border-b border-cricket-100 dark:border-dark-border pb-1 text-sm uppercase">Teams</h3>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400">Host Team</label>
                <input
                  type="text"
                  readOnly
                  value={homeTeam.name}
                  className="w-full py-1.5 border-b border-slate-300 dark:border-dark-border bg-transparent text-sm font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400">Visitor Team</label>
                <input
                  type="text"
                  readOnly
                  value={awayTeam.name}
                  className="w-full py-1.5 border-b border-slate-300 dark:border-dark-border bg-transparent text-sm font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* Toss Won By */}
            <div className="space-y-2">
              <h3 className="text-cricket-700 dark:text-cricket-500 font-bold border-b border-cricket-100 dark:border-dark-border pb-1 text-sm uppercase">Toss won by?</h3>
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl flex gap-6">
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="tossWonBy"
                    value={homeTeam._id}
                    checked={tossWonBy === homeTeam._id}
                    onChange={() => setTossWonBy(homeTeam._id)}
                    className="accent-cricket-600 h-4.5 w-4.5"
                  />
                  Host Team
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="tossWonBy"
                    value={awayTeam._id}
                    checked={tossWonBy === awayTeam._id}
                    onChange={() => setTossWonBy(awayTeam._id)}
                    className="accent-cricket-600 h-4.5 w-4.5"
                  />
                  Visitor Team
                </label>
              </div>
            </div>

            {/* Opted To */}
            <div className="space-y-2">
              <h3 className="text-cricket-700 dark:text-cricket-500 font-bold border-b border-cricket-100 dark:border-dark-border pb-1 text-sm uppercase">Opted to?</h3>
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl flex gap-6">
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="tossDecision"
                    value="Bat"
                    checked={tossDecision === 'Bat'}
                    onChange={() => setTossDecision('Bat')}
                    className="accent-cricket-600 h-4.5 w-4.5"
                  />
                  Bat
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="tossDecision"
                    value="Bowl"
                    checked={tossDecision === 'Bowl'}
                    onChange={() => setTossDecision('Bowl')}
                    className="accent-cricket-600 h-4.5 w-4.5"
                  />
                  Bowl
                </label>
              </div>
            </div>

            {/* Overs */}
            <div className="space-y-2">
              <h3 className="text-cricket-700 dark:text-cricket-500 font-bold border-b border-cricket-100 dark:border-dark-border pb-1 text-sm uppercase">Overs?</h3>
              <input
                type="number"
                value={oversInput}
                onChange={(e) => setOversInput(e.target.value)}
                className="w-full py-2 border-b border-slate-300 dark:border-dark-border bg-transparent text-sm font-bold focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-3">
              <span className="text-sm font-semibold text-slate-500 cursor-pointer hover:underline">
                Advanced settings
              </span>
              <button 
                type="submit" 
                disabled={isScorerLocked}
                className="bg-cricket-650 hover:bg-cricket-750 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                Start match
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          SCREEN 2: Select Opening Players (Active Players Picker)
          ======================================================== */}
      {match.status === 'Live' && showPlayerSelector && (
        <div className="max-w-md mx-auto min-h-screen flex flex-col justify-between">
          <div>
            {/* Green Header */}
            <div className="bg-cricket-700 text-white h-14 flex items-center px-4 gap-4 shadow">
              <button 
                onClick={() => setShowPlayerSelector(false)}
                className="p-1 rounded-full hover:bg-cricket-800"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-lg font-bold">
                {!match.currentState?.strikerId && !match.currentState?.nonStrikerId && !match.currentState?.currentBowlerId
                  ? "Select Opening players"
                  : !match.currentState?.strikerId || !match.currentState?.nonStrikerId
                  ? "Select New Batsman"
                  : "Select Bowler"}
              </h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSetPlayers} className="p-4 space-y-6">
              
              {/* Striker */}
              {!match.currentState?.strikerId && (
                <div>
                  <label className="block text-sm font-bold text-cricket-750 dark:text-cricket-500 mb-1">Striker</label>
                  <select
                    required
                    value={newStriker}
                    onChange={(e) => setNewStriker(e.target.value)}
                    className="w-full py-2 border-b border-cricket-600 bg-transparent text-sm text-slate-805 dark:text-white focus:outline-none"
                  >
                    <option value="" className="dark:bg-dark-card">Choose striker...</option>
                    {availableBatsmen.filter(p => p._id !== newNonStriker).map(p => (
                      <option key={p._id} value={p._id} className="dark:bg-dark-card">{p.name} ({p.role})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Non-Striker */}
              {!match.currentState?.nonStrikerId && (
                <div>
                  <label className="block text-sm font-bold text-cricket-750 dark:text-cricket-500 mb-1">Non-striker</label>
                  <select
                    required
                    value={newNonStriker}
                    onChange={(e) => setNewNonStriker(e.target.value)}
                    className="w-full py-2 border-b border-cricket-600 bg-transparent text-sm text-slate-805 dark:text-white focus:outline-none"
                  >
                    <option value="" className="dark:bg-dark-card">Choose non-striker...</option>
                    {availableBatsmen.filter(p => p._id !== newStriker).map(p => (
                      <option key={p._id} value={p._id} className="dark:bg-dark-card">{p.name} ({p.role})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Bowler */}
              {!match.currentState?.currentBowlerId && (
                <div>
                  <label className="block text-sm font-bold text-cricket-750 dark:text-cricket-500 mb-1">Bowler</label>
                  <select
                    required
                    value={newBowler}
                    onChange={(e) => setNewBowler(e.target.value)}
                    className="w-full py-2 border-b border-cricket-600 bg-transparent text-sm text-slate-850 dark:text-white focus:outline-none"
                  >
                    <option value="" className="dark:bg-dark-card">Choose bowler...</option>
                    {availableBowlers.map(p => (
                      <option key={p._id} value={p._id} className="dark:bg-dark-card">{p.name} ({p.role})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Start match submit */}
              <button
                type="submit"
                disabled={isScorerLocked}
                className="w-full bg-cricket-650 hover:bg-cricket-750 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 mt-10"
              >
                {!match.currentState?.strikerId && !match.currentState?.nonStrikerId && !match.currentState?.currentBowlerId
                  ? "Start match"
                  : "Set Active Players"}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          SCREEN 3: Live Scoring Panel (Scoring In-Play)
          ======================================================== */}
      {match.status === 'Live' && !showPlayerSelector && (
        <div className="max-w-md mx-auto flex flex-col min-h-screen justify-between pb-8">
          
          {/* Top Green Header */}
          <div>
            <div className="bg-cricket-750 text-white h-14 flex items-center justify-between px-4 shadow">
              <div className="flex items-center gap-3">
                <Link to="/" className="p-1 rounded-full hover:bg-cricket-800">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <span className="font-extrabold text-sm tracking-wide">
                  {(homeTeam?.name || '').toLowerCase()} v/s {(awayTeam?.name || '').toLowerCase()}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <Link to={`/matches/${match._id}`} className="p-1.5 rounded-full hover:bg-cricket-800" title="Charts">
                  <BarChart2 className="h-5 w-5" />
                </Link>
                <Link to={`/matches/${match._id}`} className="p-1.5 rounded-full hover:bg-cricket-800" title="Scorecard">
                  <FileText className="h-5 w-5" />
                </Link>
              </div>
            </div>

            {/* Scorecard Card */}
            <div className="p-3">
              <div className="card shadow border-0 p-4 space-y-4">
                <div className="flex justify-between items-center text-xs text-slate-500 font-bold uppercase">
                  <span>{(battingTeam?.name || '').toLowerCase()}, 1st inning</span>
                  <span>CRR</span>
                </div>

                {currentInningsObj ? (
                  <div className="flex justify-between items-center">
                    <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                      {currentInningsObj.runs} - {currentInningsObj.wickets}
                      <span className="text-sm font-normal text-slate-500 ml-1.5">
                        ({currentInningsObj.overs}.{currentInningsObj.balls})
                      </span>
                    </div>
                    <div className="text-lg font-bold text-slate-800 dark:text-white">
                      {(currentInningsObj.runs / (currentInningsObj.overs + (currentInningsObj.balls / 6) || 1)).toFixed(2)}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400">Loading scoreboard...</p>
                )}

                <hr className="border-slate-100 dark:border-dark-border" />

                {/* Batter & Bowler mini table */}
                <div className="text-xs space-y-3 font-medium">
                  {/* Batter headers */}
                  <div className="grid grid-cols-12 text-slate-400 font-semibold uppercase">
                    <span className="col-span-5">Batsman</span>
                    <span className="col-span-1.5 text-center">R</span>
                    <span className="col-span-1.5 text-center">B</span>
                    <span className="col-span-1.5 text-center">4s</span>
                    <span className="col-span-1.5 text-center">6s</span>
                    <span className="col-span-1 text-right">SR</span>
                  </div>

                  {/* Striker batsman */}
                  {match.currentState.strikerId && (
                    <div className="grid grid-cols-12 text-slate-800 dark:text-slate-200">
                      <span className="col-span-5 font-bold text-cricket-650 truncate flex items-center">
                        {(match.currentState?.strikerId?.name || '').toLowerCase()}*
                      </span>
                      {(() => {
                        const card = currentInningsObj?.battingScorecard.find(b => b.playerId?._id === match.currentState.strikerId?._id);
                        return (
                          <>
                            <span className="col-span-1.5 text-center font-bold">{card?.runs || 0}</span>
                            <span className="col-span-1.5 text-center text-slate-500">{card?.ballsFaced || 0}</span>
                            <span className="col-span-1.5 text-center">{card?.fours || 0}</span>
                            <span className="col-span-1.5 text-center">{card?.sixes || 0}</span>
                            <span className="col-span-1 text-right font-mono text-[10px]">{getStrikeRate(card?.runs || 0, card?.ballsFaced || 0)}</span>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Non-Striker batsman */}
                  {match.currentState.nonStrikerId && (
                    <div className="grid grid-cols-12 text-slate-700 dark:text-slate-300">
                      <span className="col-span-5 truncate text-slate-650">
                        {(match.currentState?.nonStrikerId?.name || '').toLowerCase()}
                      </span>
                      {(() => {
                        const card = currentInningsObj?.battingScorecard.find(b => b.playerId?._id === match.currentState.nonStrikerId?._id);
                        return (
                          <>
                            <span className="col-span-1.5 text-center font-bold">{card?.runs || 0}</span>
                            <span className="col-span-1.5 text-center text-slate-500">{card?.ballsFaced || 0}</span>
                            <span className="col-span-1.5 text-center">{card?.fours || 0}</span>
                            <span className="col-span-1.5 text-center">{card?.sixes || 0}</span>
                            <span className="col-span-1 text-right font-mono text-[10px]">{getStrikeRate(card?.runs || 0, card?.ballsFaced || 0)}</span>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Bowler headers */}
                  <div className="grid grid-cols-12 text-slate-400 font-semibold uppercase pt-2 border-t border-slate-50 dark:border-dark-border/40">
                    <span className="col-span-5">Bowler</span>
                    <span className="col-span-1.5 text-center">O</span>
                    <span className="col-span-1.5 text-center">M</span>
                    <span className="col-span-1.5 text-center">R</span>
                    <span className="col-span-1.5 text-center">W</span>
                    <span className="col-span-2 text-right">ER</span>
                  </div>

                  {/* Active Bowler */}
                  {match.currentState.currentBowlerId && (
                    <div className="grid grid-cols-12 text-slate-800 dark:text-slate-200">
                      <span className="col-span-5 font-bold truncate text-slate-650">
                        {(match.currentState?.currentBowlerId?.name || '').toLowerCase()}
                      </span>
                      {(() => {
                        const card = currentInningsObj?.bowlingScorecard.find(b => b.playerId?._id === match.currentState.currentBowlerId?._id);
                        return (
                          <>
                            <span className="col-span-1.5 text-center font-bold">{card ? `${card.overs}.${card.balls}` : '0.0'}</span>
                            <span className="col-span-1.5 text-center">{card?.maidens || 0}</span>
                            <span className="col-span-1.5 text-center">{card?.runsConceded || 0}</span>
                            <span className="col-span-1.5 text-center text-cricket-605">{card?.wickets || 0}</span>
                            <span className="col-span-2 text-right font-mono text-[10px]">{getEconomy(card?.runsConceded || 0, card?.overs || 0, card?.balls || 0)}</span>
                          </>
                        );
                      })()}
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Over Tracker Panel */}
            <div className="px-3">
              <div className="bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-dark-border flex gap-2 items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide shrink-0">This over:</span>
                <div className="flex gap-1.5 flex-wrap items-center">
                  {match.currentState.lastBalls.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">Bowler ready...</span>
                  ) : (
                    match.currentState.lastBalls.map((b, i) => (
                      <span 
                        key={i}
                        className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          b === 'W' 
                            ? 'bg-red-500 text-white' 
                            : b.includes('wd') || b.includes('nb') 
                            ? 'bg-amber-100 text-amber-800'
                            : b === '4' || b === '6'
                            ? 'bg-cricket-100 text-cricket-800 font-extrabold'
                            : 'bg-slate-100 text-slate-800 dark:bg-dark-border dark:text-white'
                        }`}
                      >
                        {b}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Controls panel: checkboxes & action triggers */}
            <div className="p-3">
              <div className="bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-dark-border space-y-4">
                
                {/* Checkboxes row */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-350 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extraType === 'Wide'}
                      onChange={(e) => setExtraType(e.target.checked ? 'Wide' : 'None')}
                      className="accent-cricket-600 h-4 w-4"
                    />
                    Wide
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-350 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extraType === 'No Ball'}
                      onChange={(e) => setExtraType(e.target.checked ? 'No Ball' : 'None')}
                      className="accent-cricket-600 h-4 w-4"
                    />
                    No Ball
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-350 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extraType === 'Bye'}
                      onChange={(e) => setExtraType(e.target.checked ? 'Bye' : 'None')}
                      className="accent-cricket-600 h-4 w-4"
                    />
                    Byes
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-350 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extraType === 'Leg Bye'}
                      onChange={(e) => setExtraType(e.target.checked ? 'Leg Bye' : 'None')}
                      className="accent-cricket-600 h-4 w-4"
                    />
                    Leg Byes
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-red-650 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wicketFell}
                      onChange={(e) => {
                        setWicketFell(e.target.checked);
                        if (e.target.checked) {
                          setDismissedPlayerId(match.currentState.strikerId?._id || '');
                        }
                      }}
                      className="accent-red-600 h-4 w-4"
                    />
                    Wicket
                  </label>
                </div>

                {/* If Wicket checked, show dropdowns */}
                {wicketFell && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Wicket Type</label>
                      <select
                        value={wicketType}
                        onChange={(e) => setWicketType(e.target.value)}
                        className="w-full p-1 border border-slate-300 dark:border-dark-border rounded bg-white dark:bg-dark-card text-xs dark:text-white"
                      >
                        {['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Retired Hurt', 'Hit Wicket', 'Other'].map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Dismissed</label>
                      <select
                        value={dismissedPlayerId}
                        onChange={(e) => setDismissedPlayerId(e.target.value)}
                        className="w-full p-1 border border-slate-300 dark:border-dark-border rounded bg-white dark:bg-dark-card text-xs dark:text-white"
                      >
                        <option value={match.currentState.strikerId?._id}>{match.currentState.strikerId?.name}</option>
                        <option value={match.currentState.nonStrikerId?._id}>{match.currentState.nonStrikerId?.name}</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Actions row: Swap, Retire */}
                <div className="flex gap-3 justify-end">
                  <button 
                    type="button"
                    onClick={handleEndInnings}
                    disabled={isScorerLocked}
                    className="border border-cricket-600 hover:bg-cricket-50 dark:hover:bg-cricket-900/30 text-cricket-650 dark:text-cricket-400 font-bold px-4 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
                  >
                    Retire
                  </button>
                  <button
                    type="button"
                    onClick={handleSwapBatsmen}
                    disabled={isScorerLocked}
                    className="bg-cricket-650 hover:bg-cricket-750 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition-colors shadow disabled:opacity-50"
                  >
                    Swap Batsman
                  </button>
                </div>

              </div>
            </div>

          </div>

          {/* ========================================================
              BOTTOM CONTROL PADS (CIRCLE SCORE BUTTONS & ACTION SIDEBAR)
              ======================================================== */}
          <div className="px-3 mt-auto">
            <div className="grid grid-cols-4 gap-3 bg-white dark:bg-dark-card p-4 rounded-3xl shadow border border-slate-200 dark:border-dark-border">
              
              {/* Left Column Stack: Undo, Partnerships, Extras */}
              <div className="flex flex-col gap-3.5">
                <button
                  type="button"
                  onClick={() => alert("Undo function: deletes the last BallEvent to revert score.")}
                  disabled={isScorerLocked}
                  className="bg-cricket-650 hover:bg-cricket-750 text-white font-bold py-3.5 rounded-2xl text-xs shadow-sm flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                >
                  <CornerUpLeft className="h-4 w-4" />
                  Undo
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/matches/${match._id}`)}
                  className="bg-cricket-650 hover:bg-cricket-750 text-white font-bold py-3.5 rounded-2xl text-[10px] shadow-sm active:scale-95"
                >
                  Partnerships
                </button>
                <button
                  type="button"
                  onClick={() => setShowWagonWheelModal(true)}
                  className="bg-cricket-650 hover:bg-cricket-750 text-white font-bold py-3.5 rounded-2xl text-xs shadow-sm active:scale-95"
                >
                  Extras
                </button>
              </div>

              {/* Right Columns Grid: Circles 0-6 and ... */}
              <div className="col-span-3 grid grid-cols-4 gap-3.5 items-center justify-items-center">
                {/* Circle Buttons 0, 1, 2, 3 */}
                {[0, 1, 2, 3].map(runs => (
                  <button
                    key={runs}
                    type="button"
                    disabled={isScorerLocked}
                    onClick={() => handleRecordBall(runs)}
                    className="h-13 w-13 rounded-full border-2 border-cricket-600 bg-white hover:bg-slate-50 dark:bg-dark-card dark:hover:bg-slate-800 text-slate-800 dark:text-white font-extrabold text-sm flex items-center justify-center shadow transition-all active:scale-90 disabled:opacity-50"
                  >
                    {runs}
                  </button>
                ))}

                {/* Circle Buttons 4, 5, 6, ... */}
                {[4, 5, 6].map(runs => (
                  <button
                    key={runs}
                    type="button"
                    disabled={isScorerLocked}
                    onClick={() => handleRecordBall(runs)}
                    className="h-13 w-13 rounded-full border-2 border-cricket-600 bg-white hover:bg-slate-50 dark:bg-dark-card dark:hover:bg-slate-800 text-slate-800 dark:text-white font-extrabold text-sm flex items-center justify-center shadow transition-all active:scale-90 disabled:opacity-50"
                  >
                    {runs}
                  </button>
                ))}

                {/* "..." Button to toggle details or set custom parameters */}
                <button
                  type="button"
                  onClick={() => setShowWagonWheelModal(true)}
                  className="h-13 w-13 rounded-full border-2 border-cricket-600 bg-white hover:bg-slate-50 dark:bg-dark-card dark:hover:bg-slate-800 text-slate-800 dark:text-white font-black text-sm flex items-center justify-center shadow transition-all active:scale-90"
                >
                  ...
                </button>
              </div>

            </div>
          </div>

          {/* Wagon Wheel Modal Overlay */}
          {showWagonWheelModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl w-full max-w-sm p-5 relative">
                <WagonWheelSelector value={wagonWheelCoords} onChange={setWagonWheelCoords} />
                
                <div className="mt-4 space-y-2">
                  <label className="block text-xs font-semibold uppercase text-slate-500">Custom ball description</label>
                  <input
                    type="text"
                    value={commentaryText}
                    onChange={(e) => setCommentaryText(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-dark-border rounded-lg text-sm bg-transparent dark:text-white focus:outline-none"
                    placeholder="Describe delivery..."
                  />
                </div>

                <div className="flex gap-3 mt-4">
                  <button 
                    onClick={() => setShowWagonWheelModal(false)}
                    className="btn-primary grow text-xs py-2 font-bold"
                  >
                    Save & Close
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
