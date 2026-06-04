import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const socketInstance = io(BACKEND_URL, {
      transports: ['websocket', 'polling']
    });

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Socket.io connected to server:', BACKEND_URL);
    });

    // Global alert listener
    socketInstance.on('match-alert', (alertData) => {
      console.log('Match Alert Received:', alertData);
      
      const newAlert = {
        id: Date.now() + Math.random(),
        ...alertData
      };
      
      setAlerts(prev => [newAlert, ...prev].slice(0, 5)); // Keep last 5 alerts
      
      // Auto clear after 4 seconds
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== newAlert.id));
      }, 4000);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinMatch = (matchId) => {
    if (socket) {
      socket.emit('join-match', matchId);
    }
  };

  const leaveMatch = (matchId) => {
    if (socket) {
      socket.emit('leave-match', matchId);
    }
  };

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <SocketContext.Provider value={{ socket, joinMatch, leaveMatch, alerts, removeAlert }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
