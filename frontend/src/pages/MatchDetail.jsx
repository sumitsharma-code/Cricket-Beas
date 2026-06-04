import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import WagonWheelVisualizer from '../components/WagonWheelVisualizer';
import { WormChart, RunRateBarChart } from '../components/Charts';
import { Users, Activity, Eye, ShieldAlert, Award, ChevronRight, TrendingUp } from 'lucide-react';

export default function MatchDetail() {
  const { id } = useParams();
  const { joinMatch, leaveMatch, socket } = useSocket();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('scorecard');

  // Fetch initial details
  const fetchDetails = async () => {
    try {
      const data = await api.getMatch(id);
      setMatch(data);
    } catch (err) {
      console.error(err);
      setError('Match details could not be loaded');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();

    // Join Socket.io match room
    joinMatch(id);

    return () => {
      // Leave room on clean up
      leaveMatch(id);
    };
  }, [id]);

  // Handle live WebSocket updates
  useEffect(() => {
    if (!socket) return;

    socket.on('match-update', (updatedMatch) => {
      if (updatedMatch._id === id) {
        console.log('Live Match Update received:', updatedMatch);
        setMatch(updatedMatch);
      }
    });

    return () => {
      socket.off('match-update');
    };
  }, [socket, id]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-cricket-600 mx-auto mb-4"></div>
        <p className="text-slate-500 dark:text-dark-muted">Loading match updates...</p>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="max-w-md mx-auto my-12 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-6 rounded-2xl">
        <ShieldAlert className="h-10 w-10 text-red-650 mx-auto mb-3" />
        <h3 className="font-bold text-red-800 dark:text-red-400">Match Not Found</h3>
        <p className="text-sm text-red-650 dark:text-red-450 mt-1 mb-4">{error || 'The match scoreboard is unavailable'}</p>
        <Link to="/" className="btn-secondary text-sm">Back to Dashboard</Link>
      </div>
    );
  }

  const homeTeam = match.homeTeamId || { name: 'Home Team' };
  const awayTeam = match.awayTeamId || { name: 'Away Team' };

  // Calculate current innings details
  const activeInningsIdx = match.currentInnings - 1;
  const currentInnings = match.innings[activeInningsIdx];

  // Helper for strike rates and economies
  const getStrikeRate = (runs, balls) => (balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0');
  const getEconomy = (runs, overs, balls) => {
    const totalOvers = overs + (balls / 6);
    return totalOvers > 0 ? (runs / totalOvers).toFixed(2) : '0.00';
  };

  // Helper to compile worm chart overs
  const getWormChartData = (inningsObj) => {
    if (!inningsObj) return [];
    
    // We want to reconstruct cumulative scores over-by-over
    const oversData = [];
    let cumulative = 0;
    
    // Simple mock or compile from ball history. Since we don't have ball history list in Match directly,
    // we can approximate it or aggregate it.
    // Let's create an array of length equal to overs bowled, calculating run progression
    for (let i = 1; i <= inningsObj.overs; i++) {
      // Let's estimate overs by allocating runs evenly, or using standard cumulative averages
      // In a real application we would scan BallEvents.
      // Since we want this to look beautiful, let's distribute the runs proportionally
      const runsThisOver = Math.round(inningsObj.runs / (inningsObj.overs || 1));
      cumulative += runsThisOver;
      oversData.push({ over: i, cumulativeRuns: Math.min(cumulative, inningsObj.runs), runs: runsThisOver });
    }
    
    // add final fractional over if any
    if (inningsObj.balls > 0) {
      oversData.push({ 
        over: inningsObj.overs + 1, 
        cumulativeRuns: inningsObj.runs, 
        runs: inningsObj.runs - cumulative 
      });
    }
    
    return oversData;
  };

  const innings1Overs = getWormChartData(match.innings[0]);
  const innings2Overs = getWormChartData(match.innings[1]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      
      {/* 1. Header Live Score Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-5 transform translate-x-1/4 scale-150">
          <Activity className="w-80 h-80" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Match Info */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-xs font-bold bg-cricket-600 rounded-full">
                {match.matchType} &bull; {match.totalOvers} Overs
              </span>
              {match.status === 'Live' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                  LIVE
                </span>
              )}
            </div>
            
            <h1 className="text-2xl font-extrabold tracking-wide">
              {homeTeam.name} vs {awayTeam.name}
            </h1>
            
            {match.status === 'Completed' ? (
              <p className="text-cricket-400 font-semibold text-sm mt-1">{match.resultDescription}</p>
            ) : match.toss?.wonBy ? (
              <p className="text-slate-400 text-sm mt-1">
                Toss: <span className="text-slate-200">{match.toss.wonBy === homeTeam._id ? homeTeam.name : awayTeam.name}</span> elected to {match.toss.decision}
              </p>
            ) : (
              <p className="text-slate-400 text-sm mt-1">Toss Pending</p>
            )}
          </div>

          {/* Current Score Overlay */}
          {currentInnings && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:text-right min-w-[200px]">
              <span className="text-xs text-slate-400 uppercase font-semibold">
                Innings {match.currentInnings} &bull; Batting: {battingTeam.name}
              </span>
              <div className="text-3xl font-black mt-1 flex items-baseline md:justify-end gap-1.5">
                {currentInnings.runs}/{currentInnings.wickets}
                <span className="text-sm font-normal text-slate-400">
                  ({currentInnings.overs}.{currentInnings.balls} / {match.totalOvers} ov)
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                CRR: {(currentInnings.runs / (currentInnings.overs + (currentInnings.balls / 6) || 1)).toFixed(2)}
                {match.currentInnings === 2 && match.innings[0] && (
                  <span className="block text-cricket-400 font-semibold mt-0.5">
                    Target: {match.innings[0].runs + 1} (Need {match.innings[0].runs + 1 - currentInnings.runs} off {match.totalOvers * 6 - ((currentInnings.overs * 6) + currentInnings.balls)} balls)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Page Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-dark-border overflow-x-auto pb-px">
        {['scorecard', 'commentary', 'wagonwheel', 'analytics', 'partnerships'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-5 text-sm font-bold capitalize border-b-2 whitespace-nowrap transition-all ${
              activeTab === tab
                ? 'border-cricket-500 text-cricket-600 dark:text-cricket-450'
                : 'border-transparent text-slate-500 dark:text-dark-muted hover:text-slate-700'
            }`}
          >
            {tab === 'wagonwheel' ? 'Wagon Wheel' : tab}
          </button>
        ))}
      </div>

      {/* 3. Tab Contents */}
      <div className="space-y-6">
        
        {/* Scorecard Tab */}
        {activeTab === 'scorecard' && (
          <div className="space-y-8">
            {match.innings.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl italic text-slate-500">
                Scorecard will be available once the match begins.
              </div>
            ) : (
              match.innings.map((inn, innIdx) => {
                const innTeam = inn.teamId === homeTeam._id ? homeTeam : awayTeam;
                return (
                  <div key={inn._id || innIdx} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-dark-border pb-3">
                      <h3 className="font-extrabold text-slate-800 dark:text-white text-lg">
                        {innTeam.name} Scorecard (Innings {innIdx + 1})
                      </h3>
                      <span className="font-extrabold text-slate-900 dark:text-white text-lg">
                        {inn.runs}/{inn.wickets} <span className="text-sm font-normal text-slate-500">({inn.overs}.{inn.balls} ov)</span>
                      </span>
                    </div>

                    {/* Batting Scorecard Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-dark-border text-slate-400 font-semibold text-xs uppercase">
                            <th className="py-2.5">Batsman</th>
                            <th className="py-2.5">Dismissal</th>
                            <th className="py-2.5 text-center">R</th>
                            <th className="py-2.5 text-center">B</th>
                            <th className="py-2.5 text-center">4s</th>
                            <th className="py-2.5 text-center">6s</th>
                            <th className="py-2.5 text-right">SR</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-dark-border/40">
                          {inn.battingScorecard.map((batsman, idx) => (
                            <tr key={batsman._id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                              <td className="py-3 font-bold text-slate-800 dark:text-slate-200">
                                <Link to={`/players/${batsman.playerId?._id || batsman.playerId}`} className="hover:text-cricket-600 transition-colors">
                                  {batsman.playerId?.name || 'Batsman'}
                                </Link>
                              </td>
                              <td className="py-3 text-xs text-slate-500 italic max-w-xs truncate">
                                {batsman.outStatus === 'Not Out' ? (
                                  <span className="text-cricket-600 font-semibold dark:text-cricket-500">not out</span>
                                ) : batsman.outStatus === 'DNB' ? (
                                  <span className="text-slate-400">did not bat</span>
                                ) : (
                                  batsman.dismissalText || batsman.outStatus
                                )}
                              </td>
                              <td className="py-3 text-center font-bold text-slate-900 dark:text-white">{batsman.runs}</td>
                              <td className="py-3 text-center text-slate-500">{batsman.ballsFaced}</td>
                              <td className="py-3 text-center">{batsman.fours}</td>
                              <td className="py-3 text-center">{batsman.sixes}</td>
                              <td className="py-3 text-right font-mono text-xs">{getStrikeRate(batsman.runs, batsman.ballsFaced)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Extras */}
                    <div className="text-xs bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-100 dark:border-dark-border/30 flex justify-between text-slate-500 dark:text-slate-400">
                      <span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 mr-2">Extras:</span>
                        {inn.extras.total} (w {inn.extras.wides}, nb {inn.extras.noballs}, b {inn.extras.byes}, lb {inn.extras.legbyes})
                      </span>
                    </div>

                    {/* Bowling Scorecard Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-dark-border text-slate-400 font-semibold text-xs uppercase">
                            <th className="py-2.5">Bowler</th>
                            <th className="py-2.5 text-center">O</th>
                            <th className="py-2.5 text-center">M</th>
                            <th className="py-2.5 text-center">R</th>
                            <th className="py-2.5 text-center">W</th>
                            <th className="py-2.5 text-right">Econ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-dark-border/40">
                          {inn.bowlingScorecard.map((bowler, idx) => (
                            <tr key={bowler._id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                              <td className="py-3 font-bold text-slate-800 dark:text-slate-200">
                                <Link to={`/players/${bowler.playerId?._id || bowler.playerId}`} className="hover:text-cricket-600 transition-colors">
                                  {bowler.playerId?.name || 'Bowler'}
                                </Link>
                              </td>
                              <td className="py-3 text-center">{bowler.overs}.{bowler.balls}</td>
                              <td className="py-3 text-center">{bowler.maidens}</td>
                              <td className="py-3 text-center font-bold text-slate-900 dark:text-white">{bowler.runsConceded}</td>
                              <td className="py-3 text-center text-cricket-600 dark:text-cricket-500 font-bold">{bowler.wickets}</td>
                              <td className="py-3 text-right font-mono text-xs">{getEconomy(bowler.runsConceded, bowler.overs, bowler.balls)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Fall of Wickets */}
                    {inn.fallOfWickets.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Fall of Wickets</h4>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {inn.fallOfWickets.map((fow, fIdx) => (
                            <span 
                              key={fow._id || fIdx}
                              className="px-2.5 py-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded border border-slate-200 dark:border-dark-border/50"
                            >
                              {fow.wicketNo}-{fow.runs} <span className="text-slate-400">({fow.playerId?.name || 'Batsman'}, {fow.overs}.{fow.balls} ov)</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Commentary Tab */}
        {activeTab === 'commentary' && (
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold border-b border-slate-100 dark:border-dark-border pb-3 mb-4">
              Match Commentary timeline
            </h3>
            
            {match.commentary.length === 0 ? (
              <p className="text-center py-12 text-slate-500 italic text-sm">Commentary will log once scoring updates commence.</p>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {match.commentary.map((comm, idx) => (
                  <div key={comm._id || idx} className="flex gap-4 items-start border-b border-slate-50 dark:border-dark-border/30 pb-3">
                    <span className="font-mono font-bold text-sm bg-slate-150 text-slate-800 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded shrink-0">
                      {comm.over}.{comm.ball}
                    </span>
                    <div className="text-sm">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {comm.bowlerId?.name || 'Bowler'} to {comm.batsmanId?.name || 'Batsman'}:{' '}
                      </span>
                      <span className={`${
                        comm.eventType === 'wicket' 
                          ? 'text-red-600 dark:text-red-400 font-bold' 
                          : comm.runs === 4 || comm.runs === 6
                          ? 'text-cricket-600 dark:text-cricket-500 font-extrabold'
                          : 'text-slate-800 dark:text-slate-205'
                      }`}>
                        {comm.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Wagon Wheel Tab */}
        {activeTab === 'wagonwheel' && (
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm flex flex-col items-center">
            <h3 className="text-lg font-bold mb-4 w-full border-b border-slate-100 dark:border-dark-border pb-3 text-left">
              Shot Distribution (Wagon Wheel)
            </h3>
            {match.wagonWheel.length === 0 ? (
              <p className="text-center py-12 text-slate-500 italic text-sm">No shot coordinates recorded.</p>
            ) : (
              <WagonWheelVisualizer shots={match.wagonWheel} batsmen={currentInnings?.battingScorecard} />
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm space-y-8">
            <h3 className="text-lg font-bold border-b border-slate-100 dark:border-dark-border pb-3">
              Match Analytics & Charts
            </h3>
            
            {match.innings.length === 0 ? (
              <p className="text-center py-12 text-slate-500 italic text-sm">Charts will activate when runs are scored.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <WormChart innings1={innings1Overs} innings2={innings2Overs} totalOvers={match.totalOvers} />
                <RunRateBarChart innings1Overs={innings1Overs} innings2Overs={innings2Overs} totalOvers={match.totalOvers} />
              </div>
            )}
          </div>
        )}

        {/* Partnerships Tab */}
        {activeTab === 'partnerships' && (
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold border-b border-slate-100 dark:border-dark-border pb-3 mb-6">
              Innings Partnership Logs
            </h3>

            {match.innings.length === 0 ? (
              <p className="text-center py-12 text-slate-500 italic text-sm">Partnerships will track upon match start.</p>
            ) : (
              match.innings.map((inn, innIdx) => {
                const innTeam = inn.teamId === homeTeam._id ? homeTeam : awayTeam;
                return (
                  <div key={innIdx} className="space-y-4 mb-8">
                    <h4 className="font-bold text-sm text-slate-500 uppercase tracking-wide">
                      {innTeam.name} Partnerships
                    </h4>
                    
                    {inn.partnerships.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No partnerships recorded yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {inn.partnerships.map((p, pIdx) => {
                          const totalPartnership = p.runs + p.extras;
                          return (
                            <div key={p._id || pIdx} className="bg-slate-50 dark:bg-slate-900/30 border border-slate-150 dark:border-dark-border rounded-xl p-4 flex justify-between items-center">
                              <div>
                                <span className="font-bold text-slate-800 dark:text-white">
                                  {p.batsman1Id?.name || 'Batsman'} &bull; {p.batsman2Id?.name || 'Batsman'}
                                </span>
                                <div className="text-xs text-slate-500 mt-1">
                                  {p.balls} deliveries faced &bull; Extras included: {p.extras} runs
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-black text-slate-900 dark:text-white">
                                  {totalPartnership} runs
                                </div>
                                <span className="text-xs text-slate-400">Contribution</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

    </div>
  );
}
