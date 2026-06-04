import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 transition-colors duration-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 text-center sm:px-6 lg:px-8">
        <p className="text-sm font-sans tracking-wide">
          &copy; {new Date().getFullYear()} <span className="font-bold text-white">CRIC<span className="text-cricket-500">BEAS</span></span>. All rights reserved.
        </p>
        <p className="text-xs mt-2 text-slate-500">
          Built with React, Vite, Node, Express, MongoDB & Socket.io for ultimate real-time performance.
        </p>
      </div>
    </footer>
  );
}
