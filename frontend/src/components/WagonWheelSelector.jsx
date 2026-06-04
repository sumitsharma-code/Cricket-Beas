import React, { useRef } from 'react';

export default function WagonWheelSelector({ value, onChange }) {
  const containerRef = useRef(null);

  const handleClick = (e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Calculate percentage coords (0 - 100)
    const xPct = Math.round((clickX / rect.width) * 100);
    const yPct = Math.round((clickY / rect.height) * 100);

    onChange({ x: xPct, y: yPct });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Select Shot Direction (Wagon Wheel)
      </span>
      
      <div 
        ref={containerRef}
        onClick={handleClick}
        className="relative w-64 h-64 bg-emerald-700 hover:bg-emerald-600 rounded-full border-4 border-slate-100 dark:border-dark-border cursor-crosshair overflow-hidden shadow-inner flex items-center justify-center transition-colors"
      >
        {/* Cricket Field Pitch */}
        <div className="absolute w-6 h-20 bg-yellow-100/90 border border-yellow-600/50 rounded-sm">
          {/* Creases */}
          <div className="absolute top-2 left-0 right-0 h-0.5 bg-slate-400"></div>
          <div className="absolute bottom-2 left-0 right-0 h-0.5 bg-slate-400"></div>
        </div>

        {/* Outer Boundary Circle */}
        <div className="absolute w-11/12 h-11/12 border border-dashed border-white/20 rounded-full"></div>
        
        {/* Render Selected Dot */}
        {value && value.x !== undefined && value.y !== undefined && (
          <div 
            className="absolute w-3 h-3 bg-red-500 border border-white rounded-full animate-ping"
            style={{ left: `${value.x}%`, top: `${value.y}%`, transform: 'translate(-50%, -50%)' }}
          ></div>
        )}
        {value && value.x !== undefined && value.y !== undefined && (
          <div 
            className="absolute w-2.5 h-2.5 bg-red-650 border border-white rounded-full"
            style={{ left: `${value.x}%`, top: `${value.y}%`, transform: 'translate(-50%, -50%)' }}
          ></div>
        )}
      </div>
      
      {value ? (
        <span className="text-xs text-slate-400">
          Selected Coordinate: X: {value.x}, Y: {value.y}
        </span>
      ) : (
        <span className="text-xs text-slate-400 italic">
          Click anywhere on the field above
        </span>
      )}
    </div>
  );
}
