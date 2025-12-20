'use client';

import { useEffect, useState } from 'react';
import { Session } from '@/lib/session-api';
import { toUTCDateKey } from '@/lib/timer-utils';

interface ProgressBarProps {
  sessions: Session[];
}

export default function ProgressBar({ sessions }: ProgressBarProps) {
  const [todayTotal, setTodayTotal] = useState(0);
  const [highestTotal, setHighestTotal] = useState(0);
  const [isGrowing, setIsGrowing] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    // Calculate today's total
    const todayKey = toUTCDateKey(new Date());
    const todaySessions = sessions.filter(
      (s) => toUTCDateKey(new Date(s.date)) === todayKey
    );
    const todaySum = todaySessions.reduce((acc, s) => acc + s.duration, 0);
    setTodayTotal(todaySum);

    // Calculate highest day total (excluding today)
    const dailyTotals = new Map<string, number>();
    sessions.forEach((s) => {
      const key = toUTCDateKey(new Date(s.date));
      dailyTotals.set(key, (dailyTotals.get(key) || 0) + s.duration);
    });

    // Remove today from the calculation to get historical highest
    dailyTotals.delete(todayKey);
    const maxHistorical = Math.max(...Array.from(dailyTotals.values()), 3600); // Minimum 1 hour
    
    // If today exceeds the historical highest, we're growing!
    if (todaySum > maxHistorical && maxHistorical > 0) {
      setIsGrowing(true);
      setHighestTotal(todaySum); // Use today as the new 100%
    } else {
      setIsGrowing(false);
      setHighestTotal(maxHistorical);
    }
  }, [sessions]);

  // Animate progress bar filling
  useEffect(() => {
    setAnimatedProgress(0);
    const timeout = setTimeout(() => {
      setAnimatedProgress(todayTotal);
    }, 100);
    return () => clearTimeout(timeout);
  }, [todayTotal]);

  const percentage = highestTotal > 0 ? Math.min((todayTotal / highestTotal) * 100, 100) : 0;
  const overflowPercentage = todayTotal > highestTotal ? ((todayTotal - highestTotal) / highestTotal) * 100 : 0;

  // Determine current stage color based on percentage
  const getCurrentStageColor = () => {
    if (percentage < 25) return 'fill-blue-500';
    if (percentage < 50) return 'fill-cyan-500';
    if (percentage < 75) return 'fill-emerald-500';
    return 'fill-amber-500';
  };

  const getCurrentGradientId = () => {
    if (percentage < 25) return 'blue-gradient';
    if (percentage < 50) return 'cyan-gradient';
    if (percentage < 75) return 'emerald-gradient';
    return 'amber-gradient';
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="w-full max-w-4xl mb-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-2 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-slate-300">Today's Progress</h3>
          {isGrowing && (
            <span className="text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
              <i className="fas fa-arrow-trend-up"></i>
              You're Growing!
            </span>
          )}
        </div>
        <div className="text-sm text-slate-400">
          <span className="font-semibold text-sky-300">{formatTime(todayTotal)}</span>
          {!isGrowing && (
            <span className="text-slate-500"> / {formatTime(highestTotal)}</span>
          )}
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="relative bg-slate-800/50 rounded-full h-8 border border-slate-700/50 overflow-hidden shadow-inner">
        {/* Stage Markers (dividing lines) */}
        <div className="absolute inset-0 flex">
          {[25, 50, 75].map((mark) => (
            <div
              key={mark}
              className="absolute top-0 bottom-0 w-px bg-slate-700/50"
              style={{ left: `${mark}%` }}
            />
          ))}
        </div>

        {/* Animated Progress Fill */}
        <div
          className={`relative h-full transition-all duration-1000 ease-out overflow-visible`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        >
          {/* Main colored fill with smooth curved right edge */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <defs>
              {/* Color gradients for each stage */}
              <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
              <linearGradient id="cyan-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>
              <linearGradient id="emerald-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="amber-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              
              {/* Smooth curved edge clip path with anti-aliasing */}
              <clipPath id="curved-edge" clipPathUnits="objectBoundingBox">
                <path d="M 0,0 L 0.98,0 C 0.99,0 1,0.3 1,0.5 C 1,0.7 0.99,1 0.98,1 L 0,1 Z" 
                      vectorEffect="non-scaling-stroke" />
              </clipPath>
            </defs>
            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              fill={`url(#${getCurrentGradientId()})`}
              clipPath="url(#curved-edge)"
              shapeRendering="geometricPrecision"
            />
          </svg>
          
          {/* Shimmer effect with clipping to match edge */}
          <div className="absolute inset-0 overflow-hidden" style={{ clipPath: 'url(#curved-edge)' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
                 style={{ backgroundSize: '200% 100%' }} />
          </div>
          
          {/* Bubble effects throughout the bar */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Left side bubbles */}
            <div className="absolute w-1 h-1 bg-white/80 rounded-full animate-bubble-1 shadow-lg" style={{ left: '10%', bottom: '15%' }} />
            <div className="absolute w-1.5 h-1.5 bg-white/70 rounded-full animate-bubble-2 shadow-lg" style={{ left: '15%', bottom: '40%' }} />
            <div className="absolute w-0.5 h-0.5 bg-white/75 rounded-full animate-bubble-3 shadow-sm" style={{ left: '8%', bottom: '65%' }} />
            
            {/* Middle bubbles */}
            <div className="absolute w-1 h-1 bg-white/80 rounded-full animate-bubble-2 shadow-lg" style={{ left: '30%', bottom: '20%' }} />
            <div className="absolute w-1.5 h-1.5 bg-white/70 rounded-full animate-bubble-3 shadow-lg" style={{ left: '35%', bottom: '55%' }} />
            <div className="absolute w-0.5 h-0.5 bg-white/75 rounded-full animate-bubble-1 shadow-sm" style={{ left: '40%', bottom: '35%' }} />
            <div className="absolute w-1 h-1 bg-white/75 rounded-full animate-bubble-1 shadow-lg" style={{ left: '45%', bottom: '70%' }} />
            
            {/* Center-right bubbles */}
            <div className="absolute w-1.5 h-1.5 bg-white/80 rounded-full animate-bubble-2 shadow-lg" style={{ left: '55%', bottom: '25%' }} />
            <div className="absolute w-1 h-1 bg-white/70 rounded-full animate-bubble-3 shadow-lg" style={{ left: '60%', bottom: '50%' }} />
            <div className="absolute w-0.5 h-0.5 bg-white/75 rounded-full animate-bubble-1 shadow-sm" style={{ left: '65%', bottom: '15%' }} />
            <div className="absolute w-1 h-1 bg-white/80 rounded-full animate-bubble-2 shadow-lg" style={{ left: '70%', bottom: '60%' }} />
            
            {/* Right side bubbles */}
            <div className="absolute w-1.5 h-1.5 bg-white/75 rounded-full animate-bubble-3 shadow-lg" style={{ left: '80%', bottom: '30%' }} />
            <div className="absolute w-1 h-1 bg-white/80 rounded-full animate-bubble-1 shadow-lg" style={{ left: '85%', bottom: '45%' }} />
            <div className="absolute w-0.5 h-0.5 bg-white/70 rounded-full animate-bubble-2 shadow-sm" style={{ left: '88%', bottom: '18%' }} />
            <div className="absolute w-1 h-1 bg-white/75 rounded-full animate-bubble-3 shadow-lg" style={{ left: '92%', bottom: '65%' }} />
          </div>
          
          {/* Enhanced glow effect at curved edge */}
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white/30 to-transparent pointer-events-none rounded-r-full" />
        </div>

        {/* Overflow indicator (when exceeding 100%) */}
        {isGrowing && overflowPercentage > 0 && (
          <div className="absolute right-0 top-0 bottom-0 flex items-center pr-2">
            <div className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
              <i className="fas fa-fire"></i>
              +{overflowPercentage.toFixed(0)}%
            </div>
          </div>
        )}

        {/* Center percentage text (when not overflowing) */}
        {!isGrowing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-white drop-shadow-lg">
              {percentage.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Stage Labels */}
      <div className="flex justify-between mt-1 px-1 text-[10px] text-slate-500">
        <span>Start</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>Goal</span>
      </div>
    </div>
  );
}
