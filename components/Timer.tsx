'use client';

import { useState, useEffect, useRef } from 'react';
import { formatTime, saveTarget, loadTarget } from '@/lib/timer-utils';
import { sessionAPI, Session } from '@/lib/session-api';
import toast from 'react-hot-toast';

interface TimerProps {
  onSessionSaved: () => void;
}

export default function Timer({ onSessionSaved }: TimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [targetMinutes, setTargetMinutes] = useState(25);
  const [hasReachedTarget, setHasReachedTarget] = useState(false);
  const [statusText, setStatusText] = useState('Ready to focus');
  const [statusClass, setStatusClass] = useState('bg-slate-800 text-slate-400 border-slate-700');

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedOffsetRef = useRef<number>(0);
  const currentSessionIdRef = useRef<number | null>(null);

  useEffect(() => {
    const target = loadTarget();
    setTargetMinutes(target);
  }, []);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const delta = now - startTimeRef.current;
        const totalMs = elapsedOffsetRef.current + delta;
        const newSeconds = Math.floor(totalMs / 1000);
        setSeconds(newSeconds);

        // Check if target reached
        if (newSeconds >= targetMinutes * 60 && !hasReachedTarget) {
          setHasReachedTarget(true);
          setStatusText('Overtime Mode');
          setStatusClass('bg-red-900/50 text-red-200 border-red-700/50 animate-pulse font-bold');
        }
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, targetMinutes, hasReachedTarget]);

  const handleToggle = () => {
    if (isRunning) {
      // Stop timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      elapsedOffsetRef.current += Date.now() - startTimeRef.current;
      setIsRunning(false);
      setStatusText('Paused');
      setStatusClass('bg-slate-800 text-slate-400 border-slate-700');
      
      // Save session if there's time
      if (seconds > 0) {
        saveSession();
      }
    } else {
      // Start timer
      if (!currentSessionIdRef.current) {
        currentSessionIdRef.current = Date.now();
      }
      startTimeRef.current = Date.now();
      setIsRunning(true);
      if (!hasReachedTarget) {
        setStatusText('Focusing...');
        setStatusClass('bg-sky-900/50 text-sky-200 border-sky-700/50 animate-pulse');
      }
    }
  };

  const handleReset = () => {
    if (isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setSeconds(0);
    setIsRunning(false);
    elapsedOffsetRef.current = 0;
    currentSessionIdRef.current = null;
    setHasReachedTarget(false);
    setStatusText('Ready to focus');
    setStatusClass('bg-slate-800 text-slate-400 border-slate-700');
  };

  const saveSession = async () => {
    const entry: Session = {
      sessionId: currentSessionIdRef.current || Date.now(),
      duration: seconds,
      target: targetMinutes * 60,
      date: new Date().toISOString(),
      timestamp: currentSessionIdRef.current || Date.now()
    };

    try {
      const result = await sessionAPI.saveSession(entry);
      toast.success('Session saved successfully');
      
      // Always trigger refresh
      onSessionSaved();
    } catch (error) {
      toast.error('Failed to save session');
      
      // Still trigger refresh to show offline data
      onSessionSaved();
    }
  };

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) {
      setTargetMinutes(val);
      saveTarget(val);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleToggle();
      }
      if (e.key === 'r') {
        handleReset();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, seconds]);

  return (
    <div className="w-full max-w-md flex flex-col gap-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium border transition-all duration-500 ${statusClass}`}>
          {statusText}
        </div>
      </div>

      {/* Timer Card */}
      <div className="glass-panel rounded-3xl p-8 flex flex-col items-center shadow-2xl relative overflow-hidden group">
        <div
          className="absolute top-4 right-4 flex items-center gap-2 transition-opacity duration-300"
          style={{ 
            pointerEvents: isRunning ? 'none' : 'auto',
            opacity: isRunning ? 0.5 : 1 
          }}
        >
          <label htmlFor="target-input" className="text-xs text-gray-400 uppercase font-bold">
            Target (Min)
          </label>
          <input
            type="number"
            id="target-input"
            value={targetMinutes}
            onChange={handleTargetChange}
            min="1"
            className="w-16 bg-slate-800/50 border border-slate-600 rounded px-2 py-1 text-center text-sm focus:outline-none focus:border-sky-500 transition-colors text-white"
            disabled={isRunning}
          />
        </div>

        <div className="mt-8 mb-4 relative z-10">
          <div className="mono-font text-7xl md:text-8xl font-bold tracking-tighter tabular-nums drop-shadow-lg transition-colors duration-500">
            {formatTime(seconds)}
          </div>
          <div
            className={`text-center text-gray-400 text-sm mt-2 transition-opacity duration-500 ${
              hasReachedTarget ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Overtime
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4 w-full justify-center z-10">
          <button
            onClick={handleReset}
            className="p-4 rounded-full bg-slate-700/50 hover:bg-slate-700 text-gray-300 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Reset"
          >
            <i className="fas fa-rotate-right text-xl"></i>
          </button>

          <button
            onClick={handleToggle}
            className={`h-20 w-20 rounded-full text-white shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all duration-200 hover:shadow-[0_0_30px_rgba(56,189,248,0.5)] active:scale-95 flex items-center justify-center ${
              isRunning
                ? 'bg-slate-600 hover:bg-slate-500'
                : 'bg-sky-500 hover:bg-sky-400'
            }`}
          >
            <i className={`fas ${isRunning ? 'fa-pause' : 'fa-play ml-1'} text-2xl`}></i>
          </button>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl group-hover:bg-sky-500/20 transition-all duration-700 pointer-events-none"></div>
      </div>
    </div>
  );
}
