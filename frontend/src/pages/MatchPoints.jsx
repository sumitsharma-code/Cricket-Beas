import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft } from 'lucide-react';

export default function MatchPoints() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tossWonBy, setTossWonBy] = useState('');
  const [tossDecision, setTossDecision] = useState('Bat');
  const [overs, setOvers] = useState(20);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const data = await api.getMatch(id);
        setMatch(data);
        setOvers(data.totalOvers || 20);
        setTossWonBy(data.homeTeamId?._id || data.homeTeamId || '');
      } catch (err) {
        setError('Failed to fetch match');
      } finally {
        setLoading(false);
      }
    };
    fetchMatch();
  }, [id]);

  const handleStart = async (e) => {
    e.preventDefault();
    if (!tossWonBy) return alert('Select toss winner');
    try {
      setLoading(true);
      // Update total overs locally then call start
      await api.startMatch(id, { tossWonBy, tossDecision });
      // Optionally update overs via API by editing match - skipped for now
      // After starting, navigate to scoring panel
      navigate(`/matches/${id}/scoring`);
    } catch (err) {
      alert(err.message || 'Failed to start match');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !match) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-cricket-600 mx-auto mb-4"></div>
        <p className="text-slate-500 dark:text-dark-muted">Loading match...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-6 rounded-2xl">
        <h3 className="font-bold text-red-800 dark:text-red-400">{error}</h3>
        <Link to="/" className="btn-secondary mt-4">Back</Link>
      </div>
    );
  }

  const homeName = match.homeTeamId?.name || 'Home Team';
  const awayName = match.awayTeamId?.name || 'Away Team';

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate(-1)} className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Match Setup & Points</h1>
      </div>

      <form onSubmit={handleStart} className="space-y-4 bg-white dark:bg-dark-card p-5 rounded-2xl border border-slate-200 dark:border-dark-border">
        <div>
          <label className="block text-xs font-semibold text-slate-400">Home Team</label>
          <input type="text" readOnly value={homeName} className="w-full py-1.5 border-b border-slate-300 bg-transparent text-sm font-bold focus:outline-none" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400">Away Team</label>
          <input type="text" readOnly value={awayName} className="w-full py-1.5 border-b border-slate-300 bg-transparent text-sm font-bold focus:outline-none" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400">Toss won by</label>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2">
              <input type="radio" name="toss" value={match.homeTeamId?._id || match.homeTeamId} checked={tossWonBy === (match.homeTeamId?._id || match.homeTeamId)} onChange={() => setTossWonBy(match.homeTeamId?._id || match.homeTeamId)} />
              {homeName}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="toss" value={match.awayTeamId?._id || match.awayTeamId} checked={tossWonBy === (match.awayTeamId?._id || match.awayTeamId)} onChange={() => setTossWonBy(match.awayTeamId?._id || match.awayTeamId)} />
              {awayName}
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400">Toss decision</label>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2">
              <input type="radio" name="decision" value="Bat" checked={tossDecision === 'Bat'} onChange={() => setTossDecision('Bat')} />
              Bat
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="decision" value="Bowl" checked={tossDecision === 'Bowl'} onChange={() => setTossDecision('Bowl')} />
              Bowl
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400">Overs</label>
          <input type="number" value={overs} onChange={(e) => setOvers(Number(e.target.value))} className="w-full py-1.5 border-b border-slate-300 bg-transparent text-sm font-bold focus:outline-none" />
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary px-4 py-2">Start Match & Open Scoring</button>
        </div>
      </form>
    </div>
  );
}
