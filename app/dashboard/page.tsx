'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { sessionAPI, Session } from '@/lib/session-api';
import Timer from '@/components/Timer';
import HistoryList from '@/components/HistoryList';
import Analytics from '@/components/Analytics';
import ProgressBar from '@/components/ProgressBar';

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [activeView, setActiveView] = useState<'timer' | 'stats'>('timer');
  const [mounted, setMounted] = useState(false);
  const [autoBreak, setAutoBreak] = useState(true);

  // Dev safety: if an old service worker is still controlling the page,
  // it can serve stale JS/manifest and cause "today"/icons/metadata confusion.
  // Run this ONLY after mount to avoid hydration mismatch.
  useEffect(() => {
    setMounted(true);
    
    // Load autoBreak setting
    const savedAutoBreak = localStorage.getItem('autoBreak');
    if (savedAutoBreak !== null) {
      setAutoBreak(savedAutoBreak === 'true');
    }
    
    if (process.env.NODE_ENV === 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const flag = 'studymode_dev_sw_cleared_v1';
    if (sessionStorage.getItem(flag) === '1') return;

    (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));

        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } finally {
        sessionStorage.setItem(flag, '1');
        // Reload once so the page is served by the dev server (not SW cache)
        window.location.reload();
      }
    })();
  }, []);

  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
      setLoading(false);
    }
  }, [router]);



  // Load sessions
  useEffect(() => {
    if (isAuthenticated) {
      loadSessions();
    }
  }, [isAuthenticated]);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await sessionAPI.fetchSessions();
      setSessions(data);
    } catch (error) {
      toast.error('Failed to load sessions');
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 min-h-screen pt-20 sm:pt-4">
      {/* Auto-Break Toggle & Logout Buttons */}
      <div className="fixed top-4 right-4 flex items-center gap-2 sm:gap-3 z-50">
        <button
          onClick={() => {
            const newValue = !autoBreak;
            setAutoBreak(newValue);
            localStorage.setItem('autoBreak', newValue.toString());
          }}
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-700/50 hover:bg-slate-600 rounded-lg transition-colors text-xs sm:text-sm"
        >
          <span className="text-slate-300 text-[10px] sm:text-xs hidden sm:inline">Auto Break</span>
          <span className="text-slate-300 text-[10px] sm:hidden">Auto</span>
          <div className={`relative w-8 sm:w-10 h-4 sm:h-5 rounded-full transition-colors ${
            autoBreak ? 'bg-sky-500' : 'bg-slate-600'
          }`}>
            <div className={`absolute top-0.5 w-3 sm:w-4 h-3 sm:h-4 bg-white rounded-full shadow-md transition-transform ${
              autoBreak ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0.5'
            }`} />
          </div>
        </button>
        <button
          onClick={handleLogout}
          className="px-2 sm:px-4 py-1.5 sm:py-2 bg-slate-700/50 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors text-xs sm:text-sm"
        >
          <i className="fas fa-sign-out-alt sm:mr-2"></i>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 mb-6 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
        <button
          onClick={() => setActiveView('timer')}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'timer'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <i className="fas fa-stopwatch mr-2"></i>Timer
        </button>
        <button
          onClick={() => setActiveView('stats')}
          className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'stats'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <i className="fas fa-chart-line mr-2"></i>Analysis
        </button>
      </div>

      {/* Progress Bar - Shows across all views */}
      {mounted && <ProgressBar sessions={sessions} />}

      {/* Timer View */}
      {mounted && activeView === 'timer' && (
        <div className="w-full max-w-md flex flex-col gap-6">
          <Timer onSessionSaved={loadSessions} autoBreak={autoBreak} />
          <HistoryList sessions={sessions} onUpdate={loadSessions} loading={loadingSessions} />
        </div>
      )}

      {/* Stats View */}
      {mounted && activeView === 'stats' && <Analytics sessions={sessions} />}
    </div>
  );
}
