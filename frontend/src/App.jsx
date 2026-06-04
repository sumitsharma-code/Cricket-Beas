import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TournamentDetail from './pages/TournamentDetail';
import MatchScoring from './pages/MatchScoring';
import MatchDetail from './pages/MatchDetail';
import PlayerDetail from './pages/PlayerDetail';
import TeamDetail from './pages/TeamDetail';
import Leaderboards from './pages/Leaderboards';
import { Bell, X, Sparkles, Activity } from 'lucide-react';

function ToastContainer() {
  const { alerts, removeAlert } = useSocket();

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2.5 max-w-sm w-full">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border text-white animate-slide-in transform transition-all ${
            alert.type === 'wicket'
              ? 'bg-gradient-to-r from-red-650 to-rose-600 border-red-500'
              : 'bg-gradient-to-r from-cricket-600 to-emerald-600 border-cricket-500'
          }`}
        >
          <div className="p-1 rounded-lg bg-white/20">
            {alert.type === 'wicket' ? <Activity className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          </div>
          
          <div className="flex-grow">
            <span className="text-xs uppercase font-extrabold tracking-wider opacity-90">
              {alert.type === 'wicket' ? 'Wicket Alert' : 'Boundary Alert'}
            </span>
            <p className="text-sm font-semibold mt-0.5">{alert.message}</p>
          </div>
          
          <button
            onClick={() => removeAlert(alert.id)}
            className="p-0.5 hover:bg-white/20 rounded transition-colors text-white/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-dark-bg">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-cricket-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function MainAppContent() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-dark-bg dark:text-dark-text transition-colors duration-200">
      <Navbar />
      <ToastContainer />
      <main className="flex-grow pb-12">
        <Routes>
          {/* Public / Semi-protected routes */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />
          <Route path="/matches/:id" element={<MatchDetail />} />
          <Route path="/players/:id" element={<PlayerDetail />} />
          <Route path="/teams/:id" element={<TeamDetail />} />
          <Route path="/leaderboards" element={<Leaderboards />} />
          
          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Secured Scoring Panel (Admins & Organizers can score) */}
          <Route 
            path="/matches/:id/scoring" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Organizer']}>
                <MatchScoring />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <SocketProvider>
            <MainAppContent />
          </SocketProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}
