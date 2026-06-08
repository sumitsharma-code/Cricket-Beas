const getApiUrl = () => {
  let url = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    if (!url.endsWith('/api') && !url.endsWith('/api/')) {
      url = url.replace(/\/$/, '') + '/api';
    }
  }
  console.log('API URL:', url);
  console.log('VITE_API_URL env:', import.meta.env.VITE_API_URL);
  return url;
};
const API_URL = getApiUrl();

const getHeaders = () => {
  const token = localStorage.getItem('cricbeas_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) {
    console.error('API Error:', data);
    throw new Error(data.message || 'API request failed');
  }
  return data;
};

export const api = {
  // Players
  getPlayers: (search = '') => 
    fetch(`${API_URL}/players?search=${search}`, { headers: getHeaders() }).then(handleResponse),
  
  getPlayer: (id) => 
    fetch(`${API_URL}/players/${id}`, { headers: getHeaders() }).then(handleResponse),
  
  createPlayer: (playerData) => 
    fetch(`${API_URL}/players`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(playerData)
    }).then(handleResponse),

  createUser: (userData) =>
    fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    }).then(handleResponse),

  updatePlayer: (id, playerData) => 
    fetch(`${API_URL}/players/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(playerData)
    }).then(handleResponse),

  // Teams
  getTeams: (search = '') => 
    fetch(`${API_URL}/teams?search=${search}`, { headers: getHeaders() }).then(handleResponse),
  
  getTeam: (id) => 
    fetch(`${API_URL}/teams/${id}`, { headers: getHeaders() }).then(handleResponse),
  
  createTeam: (teamData) => 
    fetch(`${API_URL}/teams`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(teamData)
    }).then(handleResponse),
  
  addPlayerToTeam: (teamId, playerId) => 
    fetch(`${API_URL}/teams/${teamId}/players`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ playerId })
    }).then(handleResponse),

  removePlayerFromTeam: (teamId, playerId) => 
    fetch(`${API_URL}/teams/${teamId}/players`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ playerId })
    }).then(handleResponse),

  // Tournaments
  getTournaments: () => 
    fetch(`${API_URL}/tournaments`, { headers: getHeaders() }).then(handleResponse),
  
  getTournament: (id) => 
    fetch(`${API_URL}/tournaments/${id}`, { headers: getHeaders() }).then(handleResponse),
  
  createTournament: (tournamentData) => 
    fetch(`${API_URL}/tournaments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(tournamentData)
    }).then(handleResponse),
  
  addTeamsToTournament: (id, teamIds) => 
    fetch(`${API_URL}/tournaments/${id}/teams`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ teamIds })
    }).then(handleResponse),

  generateFixtures: (id, config) => 
    fetch(`${API_URL}/tournaments/${id}/fixtures`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(config)
    }).then(handleResponse),

  // Matches
  getMatches: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return fetch(`${API_URL}/matches?${params}`, { headers: getHeaders() }).then(handleResponse);
  },

  getMatch: (id) => 
    fetch(`${API_URL}/matches/${id}`, { headers: getHeaders() }).then(handleResponse),
  
  createMatch: (matchData) => 
    fetch(`${API_URL}/matches`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(matchData)
    }).then(handleResponse),

  startMatch: (id, tossData) => 
    fetch(`${API_URL}/matches/${id}/start`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(tossData)
    }).then(handleResponse),

  setActivePlayers: (id, activeData) => 
    fetch(`${API_URL}/matches/${id}/active-players`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(activeData)
    }).then(handleResponse),

  recordBall: (id, ballData) => 
    fetch(`${API_URL}/matches/${id}/ball`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(ballData)
    }).then(handleResponse),

  endInnings: (id) => 
    fetch(`${API_URL}/matches/${id}/end-innings`, {
      method: 'POST',
      headers: getHeaders()
    }).then(handleResponse),

  undoLastBall: (id) => 
    fetch(`${API_URL}/matches/${id}/undo`, {
      method: 'POST',
      headers: getHeaders()
    }).then(handleResponse),

  deleteMatch: (id) => 
    fetch(`${API_URL}/matches/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(handleResponse),

  // Leaderboards
  getLeaderboards: () => 
    fetch(`${API_URL}/leaderboards`, { headers: getHeaders() }).then(handleResponse),
};
