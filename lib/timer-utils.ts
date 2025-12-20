// Timer utilities
export const formatTime = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const TARGET_KEY = 'flow_target_min';

export const toUTCDateKey = (value: string | number | Date): string => {
  // Stable calendar day key aligned to how Mongo stores ISO dates (UTC).
  // Example: "2025-12-20"
  return new Date(value).toISOString().slice(0, 10);
};

export const saveTarget = (minutes: number): void => {
  localStorage.setItem(TARGET_KEY, String(minutes));
};

export const loadTarget = (): number => {
  const saved = localStorage.getItem(TARGET_KEY);
  if (saved) {
    const val = parseInt(saved);
    if (!isNaN(val) && val > 0) {
      return val;
    }
  }
  return 25; // default
};
