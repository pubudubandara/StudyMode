'use client';

import { useState, useEffect, useRef } from 'react';
import { formatTime, saveTarget, loadTarget } from '@/lib/timer-utils';
import { sessionAPI, Session } from '@/lib/session-api';
import toast from 'react-hot-toast';

interface TimerProps {
  onSessionSaved: () => void;
}

export default function Timer({ onSessionSaved }: TimerProps) {
  const [mode, setMode] = useState<'focus' | 'interval'>('focus');
  
  // Focus timer states
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [targetMinutes, setTargetMinutes] = useState(25);
  const [hasReachedTarget, setHasReachedTarget] = useState(false);
  const [statusText, setStatusText] = useState('Ready to focus');
  const [statusClass, setStatusClass] = useState('bg-slate-800 text-slate-400 border-slate-700');

  // Interval timer states
  const [intervalType, setIntervalType] = useState<'short' | 'long'>('short');
  const [shortBreakTime, setShortBreakTime] = useState(5);
  const [longBreakTime, setLongBreakTime] = useState(15);
  const [currentInterval, setCurrentInterval] = useState(0);
  const [intervalTimeLeft, setIntervalTimeLeft] = useState(5 * 60);
  const [isIntervalRunning, setIsIntervalRunning] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedOffsetRef = useRef<number>(0);
  const currentSessionIdRef = useRef<number | null>(null);

  useEffect(() => {
    const target = loadTarget();
    setTargetMinutes(target);
    
    // Load interval settings
    const savedShortBreak = localStorage.getItem('shortBreakTime');
    const savedLongBreak = localStorage.getItem('longBreakTime');
    
    if (savedShortBreak) {
      const shortTime = parseInt(savedShortBreak);
      setShortBreakTime(shortTime);
      setIntervalTimeLeft(shortTime * 60);
    }
    if (savedLongBreak) {
      setLongBreakTime(parseInt(savedLongBreak));
    }
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
    
    // Switch to interval tab after reset
    setMode('interval');
    setIntervalType('short');
    setCurrentInterval(0);
    setIntervalTimeLeft(shortBreakTime * 60);
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

  // Interval countdown effect
  useEffect(() => {
    if (isIntervalRunning && intervalTimeLeft > 0) {
      const timer = setInterval(() => {
        setIntervalTimeLeft(prev => {
          if (prev <= 1) {
            triggerBlink();
            setIsIntervalRunning(false);
            
            // After any interval timer finishes, switch back to focus mode
            setTimeout(() => {
              setMode('focus');
              
              // Reset interval state for next time
              if (intervalType === 'short') {
                if (currentInterval < 2) {
                  // Move to next short break position for next time
                  setCurrentInterval(currentInterval + 1);
                } else {
                  // After 3rd short break, prepare for long break next time
                  setIntervalType('long');
                  setCurrentInterval(3);
                  setIntervalTimeLeft(longBreakTime * 60);
                }
              } else {
                // After long break, reset to first short break
                setIntervalType('short');
                setCurrentInterval(0);
                setIntervalTimeLeft(shortBreakTime * 60);
              }
            }, 3000);
            
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isIntervalRunning, intervalTimeLeft, intervalType, currentInterval, shortBreakTime, longBreakTime]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (mode === 'focus') {
          handleToggle();
        }
      }
      if (e.key === 'r') {
        if (mode === 'focus') {
          handleReset();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mode, isRunning, seconds]);

  // Interval timer functions
  const triggerBlink = () => {
    setIsBlinking(true);
    setTimeout(() => {
      setIsBlinking(false);
    }, 3000);
  };

  const startIntervalCountdown = () => {
    if (intervalType === 'short') {
      setIntervalTimeLeft(shortBreakTime * 60);
    } else {
      setIntervalTimeLeft(longBreakTime * 60);
    }
    setIsIntervalRunning(true);
  };

  const resetIntervalTimer = () => {
    setIsIntervalRunning(false);
    if (intervalType === 'short') {
      setCurrentInterval(0);
      setIntervalTimeLeft(shortBreakTime * 60);
    } else {
      setCurrentInterval(3);
      setIntervalTimeLeft(longBreakTime * 60);
    }
  };

  const formatIntervalTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${ String(mins).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <>
      {/* Blinking overlay */}
      {isBlinking && (
        <div className="fixed inset-0 z-50 animate-blink bg-white pointer-events-none" />
      )}

    <div className="w-full max-w-md flex flex-col gap-6 animate-fade-in">
      {/* Mode Tabs */}
      <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
        <button
          onClick={() => setMode('focus')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'focus'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <i className="fas fa-brain mr-2"></i>Focus
        </button>
        <button
          onClick={() => {
            setMode('interval');
            setIntervalType('short');
            setCurrentInterval(0);
            setIntervalTimeLeft(shortBreakTime * 60);
          }}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'interval' && intervalType === 'short'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <i className="fas fa-clock mr-1"></i>Short Break
        </button>
        <button
          onClick={() => {
            setMode('interval');
            setIntervalType('long');
            setCurrentInterval(3);
            setIntervalTimeLeft(longBreakTime * 60);
          }}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'interval' && intervalType === 'long'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <i className="fas fa-clock mr-1"></i>Long Break
        </button>
      </div>

      {/* Focus Timer Mode */}
      {mode === 'focus' && (
        <>
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
        </>
      )}

      {/* Interval Timer Mode */}
      {mode === 'interval' && (
        <>
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2">
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium border transition-all duration-500 ${statusClass}`}>
                {intervalType === 'short' ? `Short Break ${currentInterval + 1}/3` : 'Long Break'}
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors p-2"
              >
                <i className={`fas fa-${showSettings ? 'times' : 'cog'}`}></i>
              </button>
            </div>
          </div>

          {/* Settings */}
          {showSettings && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Short Break (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={shortBreakTime}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val > 0) {
                      setShortBreakTime(val);
                      localStorage.setItem('shortBreakTime', val.toString());
                      if (!isIntervalRunning && intervalType === 'short') {
                        setIntervalTimeLeft(val * 60);
                      }
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Long Break (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={longBreakTime}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val > 0) {
                      setLongBreakTime(val);
                      localStorage.setItem('longBreakTime', val.toString());
                      if (!isIntervalRunning && intervalType === 'long') {
                        setIntervalTimeLeft(val * 60);
                      }
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          {/* Interval Timer Card */}
          <div className="glass-panel rounded-3xl p-8 flex flex-col items-center shadow-2xl relative overflow-hidden group">
            {/* Interval Progress Dots - Only show for short breaks */}
            {intervalType === 'short' && (
              <div className="flex justify-center gap-2 mb-6">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentInterval
                        ? 'bg-sky-500 scale-125'
                        : i < currentInterval
                        ? 'bg-emerald-500'
                        : 'bg-slate-600'
                    }`}
                  />
                ))}
              </div>
            )}

            <div className="mb-4 relative z-10">
              <div className="mono-font text-7xl md:text-8xl font-bold tracking-tighter tabular-nums drop-shadow-lg transition-colors duration-500">
                {formatIntervalTime(intervalTimeLeft)}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 w-full justify-center z-10">
              <button
                onClick={resetIntervalTimer}
                className="p-4 rounded-full bg-slate-700/50 hover:bg-slate-700 text-gray-300 transition-all duration-200 active:scale-95"
                title="Reset"
              >
                <i className="fas fa-rotate-right text-xl"></i>
              </button>

              <button
                onClick={startIntervalCountdown}
                disabled={isIntervalRunning}
                className={`h-20 w-20 rounded-full text-white shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all duration-200 active:scale-95 flex items-center justify-center ${
                  isIntervalRunning
                    ? 'bg-slate-600 cursor-not-allowed opacity-50'
                    : 'bg-sky-500 hover:bg-sky-400 hover:shadow-[0_0_30px_rgba(56,189,248,0.5)]'
                }`}
              >
                <i className="fas fa-play ml-1 text-2xl"></i>
              </button>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl group-hover:bg-sky-500/20 transition-all duration-700 pointer-events-none"></div>
          </div>
        </>
      )}
    </div>
    </>
  );
}
