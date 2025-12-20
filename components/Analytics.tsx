'use client';

import { useEffect, useRef, useState } from 'react';
import { Session } from '@/lib/session-api';
import { toUTCDateKey } from '@/lib/timer-utils';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

interface AnalyticsProps {
  sessions: Session[];
}

export default function Analytics({ sessions }: AnalyticsProps) {
  const [mode, setMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const dataMap = new Map<string, number>();
    sessions.forEach(item => {
      const date = new Date(item.date);
      let key: string;
      
      if (mode === 'daily') {
        // Stable day bucket aligned to stored UTC dates
        key = toUTCDateKey(date);
      } else if (mode === 'weekly') {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
        key = `W${weekNo}`;
      } else {
        key = date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      }
      
      if (!dataMap.has(key)) dataMap.set(key, 0);
      dataMap.set(key, dataMap.get(key)! + (item.duration / 3600));
    });

    let labels: string[];
    let dataPoints: number[];

    if (mode === 'daily') {
      // Sort by YYYY-MM-DD
      const keys = Array.from(dataMap.keys()).sort();
      const lastKeys = keys.slice(-12);
      labels = lastKeys.map((k) => {
        // Display as local month/day while keeping UTC bucketing
        const d = new Date(`${k}T00:00:00.000Z`);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      });
      dataPoints = lastKeys.map((k) => dataMap.get(k) || 0);
    } else {
      labels = Array.from(dataMap.keys()).reverse().slice(-12);
      dataPoints = Array.from(dataMap.values()).reverse().slice(-12);
    }

    // Destroy existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Hours Focused',
          data: dataPoints,
          backgroundColor: '#38bdf8',
          borderRadius: 4,
          hoverBackgroundColor: '#7dd3fc'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#e2e8f0',
            bodyColor: '#38bdf8',
            displayColors: false,
            callbacks: {
              label: (ctx) => parseFloat(String(ctx.raw)).toFixed(1) + ' hrs'
            }
          }
        },
        scales: {
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    };

    chartInstanceRef.current = new Chart(ctx, config);

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [sessions, mode]);

  const totalSessions = sessions.length;
  const avgDur = sessions.length ? sessions.reduce((a, b) => a + b.duration, 0) / sessions.length : 0;
  const overtimeCount = sessions.filter(h => h.duration > h.target).length;

  return (
    <div className="w-full max-w-2xl animate-fade-in flex flex-col gap-6">
      <div className="glass-panel rounded-3xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-200">Flow Analysis</h2>
          <div className="flex bg-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setMode('daily')}
              className={`px-3 py-1 rounded hover:bg-slate-700 transition-colors ${
                mode === 'daily' ? 'bg-slate-600 text-white' : 'text-slate-400'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setMode('weekly')}
              className={`px-3 py-1 rounded hover:bg-slate-700 transition-colors ${
                mode === 'weekly' ? 'bg-slate-600 text-white' : 'text-slate-400'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setMode('monthly')}
              className={`px-3 py-1 rounded hover:bg-slate-700 transition-colors ${
                mode === 'monthly' ? 'bg-slate-600 text-white' : 'text-slate-400'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
        <div className="relative h-64 w-full">
          <canvas ref={chartRef}></canvas>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 uppercase font-bold">Total Sessions</div>
            <div className="text-xl font-mono text-white">{totalSessions}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 uppercase font-bold">Avg Duration</div>
            <div className="text-xl font-mono text-sky-400">{Math.floor(avgDur / 60)}m</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 uppercase font-bold">Overtime Rate</div>
            <div className="text-xl font-mono text-orange-400">
              {totalSessions ? Math.round((overtimeCount / totalSessions) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
