import React, { useState } from 'react';

export default function WagonWheelVisualizer({ shots, batsmen = [] }) {
  const [selectedBatsmanId, setSelectedBatsmanId] = useState('All');

  const filteredShots = shots.filter(shot => {
    if (selectedBatsmanId === 'All') return true;
    return shot.batsmanId === selectedBatsmanId || shot.batsmanId?._id === selectedBatsmanId;
  });

  const getShotColor = (runs) => {
    if (runs >= 6) return '#ef4444'; // Red for sixes
    if (runs >= 4) return '#3b82f6'; // Blue for fours
    if (runs > 0) return '#eab308';  // Yellow for 1s, 2s, 3s
    return '#6b7280';                // Grey for dots
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
      {/* Batsman Selector Filter */}
      {batsmen.length > 0 && (
        <div className="w-full flex items-center justify-between gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Filter Batsman:</label>
          <select
            value={selectedBatsmanId}
            onChange={(e) => setSelectedBatsmanId(e.target.value)}
            className="text-xs p-1.5 rounded border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card dark:text-dark-text"
          >
            <option value="All">All Batsmen</option>
            {batsmen.map(b => (
              <option key={b.playerId?._id || b.playerId} value={b.playerId?._id || b.playerId}>
                {b.playerId?.name || 'Player'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Ground Canvas container */}
      <div className="relative w-72 h-72 bg-emerald-700 rounded-full border-4 border-slate-200 dark:border-dark-border overflow-hidden shadow-lg flex items-center justify-center">
        {/* Pitch */}
        <div className="absolute w-6 h-20 bg-yellow-100 border border-yellow-600/50 rounded-sm">
          <div className="absolute top-2 left-0 right-0 h-0.5 bg-slate-300"></div>
          <div className="absolute bottom-2 left-0 right-0 h-0.5 bg-slate-300"></div>
        </div>

        {/* Outer Circle Boundary */}
        <div className="absolute w-11/12 h-11/12 border border-dashed border-white/20 rounded-full"></div>

        {/* Render Shots SVG Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {filteredShots.map((shot, idx) => {
            const color = getShotColor(shot.runs);
            return (
              <g key={idx}>
                {/* Line from Pitch Center (50%, 50%) to click coordinates */}
                <line
                  x1="50%"
                  y1="50%"
                  x2={`${shot.x}%`}
                  y2={`${shot.y}%`}
                  stroke={color}
                  strokeWidth="2"
                  strokeOpacity="0.85"
                  strokeDasharray={shot.runs === 0 ? '3,3' : 'none'}
                />
                {/* Dot at landing location */}
                <circle
                  cx={`${shot.x}%`}
                  cy={`${shot.y}%`}
                  r={shot.runs >= 4 ? '3.5' : '2.5'}
                  fill={color}
                  stroke="#fff"
                  strokeWidth="0.75"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs font-medium">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></span>
          <span>1s/2s/3s</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
          <span>4s</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
          <span>6s</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-gray-500 rounded-full"></span>
          <span>Dots</span>
        </div>
      </div>
    </div>
  );
}
