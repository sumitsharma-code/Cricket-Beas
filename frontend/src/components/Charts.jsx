import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

/**
 * Worm Chart: Shows cumulative score progression over-by-over for both innings
 */
export function WormChart({ innings1 = [], innings2 = [], totalOvers = 20 }) {
  // Construct charting data
  // We need to build an array: [{ over: 0, 'Innings 1': 0, 'Innings 2': 0 }, ...]
  const chartData = [{ over: 0, 'Innings 1': 0, 'Innings 2': 0 }];
  
  const maxLength = Math.max(innings1.length, innings2.length, 1);
  
  for (let i = 1; i <= totalOvers; i++) {
    const dataPoint = { over: i };
    
    // Innings 1 cumulative runs
    if (i <= innings1.length) {
      dataPoint['Innings 1'] = innings1[i - 1]?.cumulativeRuns || null;
    }
    
    // Innings 2 cumulative runs
    if (i <= innings2.length) {
      dataPoint['Innings 2'] = innings2[i - 1]?.cumulativeRuns || null;
    }
    
    if (dataPoint['Innings 1'] !== undefined || dataPoint['Innings 2'] !== undefined) {
      chartData.push(dataPoint);
    }
  }

  return (
    <div className="w-full h-72">
      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
        Worm Chart (Score Progression)
      </h4>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" className="hidden dark:block" />
          <XAxis 
            dataKey="over" 
            stroke="#94a3b8" 
            fontSize={11}
            label={{ value: 'Overs', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }} 
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={11}
            label={{ value: 'Runs', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
            itemStyle={{ fontSize: '12px' }}
            labelStyle={{ fontWeight: 'bold' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          <Line 
            type="monotone" 
            dataKey="Innings 1" 
            stroke="#14b8a6" 
            strokeWidth={3} 
            dot={{ r: 2 }} 
            connectNulls 
          />
          <Line 
            type="monotone" 
            dataKey="Innings 2" 
            stroke="#84cc16" 
            strokeWidth={3} 
            dot={{ r: 2 }} 
            connectNulls 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Run Rate Chart: Shows runs scored in each individual over
 */
export function RunRateBarChart({ innings1Overs = [], innings2Overs = [], totalOvers = 20 }) {
  const chartData = [];

  for (let i = 1; i <= totalOvers; i++) {
    const dataPoint = { over: i };
    
    // Innings 1 over runs
    if (i <= innings1Overs.length) {
      dataPoint['Innings 1'] = innings1Overs[i - 1]?.runs || 0;
    }
    
    // Innings 2 over runs
    if (i <= innings2Overs.length) {
      dataPoint['Innings 2'] = innings2Overs[i - 1]?.runs || 0;
    }

    if (dataPoint['Innings 1'] !== undefined || dataPoint['Innings 2'] !== undefined) {
      chartData.push(dataPoint);
    }
  }

  return (
    <div className="w-full h-72">
      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
        Over-by-Over Run Progression
      </h4>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" className="hidden dark:block" />
          <XAxis dataKey="over" stroke="#94a3b8" fontSize={11} />
          <YAxis stroke="#94a3b8" fontSize={11} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
            itemStyle={{ fontSize: '12px' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          <Bar dataKey="Innings 1" fill="#14b8a6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Innings 2" fill="#84cc16" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
