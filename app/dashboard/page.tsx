'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { offlineStorage } from '@/lib/offline-storage';
import { sessionAPI, Session } from '@/lib/session-api';
import Timer from '@/components/Timer';
import HistoryList from '@/components/HistoryList';
import Analytics from '@/components/Analytics';
import ProgressBar from '@/components/ProgressBar';

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [activeView, setActiveView] = useState<'timer' | 'stats'>('timer');
  const [mounted, setMounted] = useState(false);

  // Dev safety: if an old service worker is still controlling the page,
  // it can serve stale JS/manifest and cause "today"/icons/metadata confusion.
  // Run this ONLY after mount to avoid hydration mismatch.
  useEffect(() => {
    setMounted(true);
    
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

  // Setup offline storage and toast
  useEffect(() => {
    (window as any).toast = toast;
    (window as any).offlineStorage = offlineStorage;
  }, []);

  // Service Worker and offline monitoring
  useEffect(() => {
    // Register service worker (only in production or when explicitly enabled)
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });

      // Listen for sync messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_SESSIONS') {
          handleSync();
        }
      });
    }

    // Initialize IndexedDB
    offlineStorage.init().catch(console.error);

    // Monitor online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online! Syncing data...');
      setTimeout(handleSync, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are offline. Data will be saved locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  const handleSync = async () => {
    await sessionAPI.syncPendingSessions();
    loadSessions();
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
    <div className="flex flex-col items-center p-4 min-h-screen">
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-orange-500/90 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <i className="fas fa-wifi-slash"></i>
          <span className="text-sm font-medium">Offline Mode - Data saved locally</span>
        </div>
      )}

      {/* Logout Button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors text-sm"
        >
          <i className="fas fa-sign-out-alt mr-2"></i>
          Logout
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
          <Timer onSessionSaved={loadSessions} />
          <HistoryList sessions={sessions} onUpdate={loadSessions} loading={loadingSessions} />
        </div>
      )}

      {/* Stats View */}
      {mounted && activeView === 'stats' && <Analytics sessions={sessions} />}
    </div>
  );
}
