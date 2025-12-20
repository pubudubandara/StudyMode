'use client';

import { useState } from 'react';
import { Session } from '@/lib/session-api';
import { formatTime, toUTCDateKey } from '@/lib/timer-utils';
import { sessionAPI } from '@/lib/session-api';
import toast from 'react-hot-toast';

interface HistoryListProps {
  sessions: Session[];
  onUpdate: () => void;
  loading?: boolean;
}

export default function HistoryList({ sessions, onUpdate, loading = false }: HistoryListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);
  const [manualDuration, setManualDuration] = useState('');
  const [manualTarget, setManualTarget] = useState('25');

  // Treat "Today" as the UTC calendar day key. This matches how your saved
  // `date` values look in Mongo (e.g. 2025-12-20T...+00:00) and avoids timezone
  // edge-cases where local day != stored UTC day.
  const todayKey = toUTCDateKey(new Date());

  const threeDaysAgoUtc = new Date();
  threeDaysAgoUtc.setUTCHours(0, 0, 0, 0);
  threeDaysAgoUtc.setUTCDate(threeDaysAgoUtc.getUTCDate() - 3);
  const threeDaysAgoTime = threeDaysAgoUtc.getTime();

  const todayItems = sessions.filter((item) => toUTCDateKey(item.date) === todayKey);

  const last3DaysItems = sessions.filter((item) => {
    const itemTime = new Date(item.date).getTime();
    return itemTime >= threeDaysAgoTime;
  });

  const itemsToShow = isExpanded ? last3DaysItems : todayItems;
  const totalSec = itemsToShow.reduce((acc, curr) => acc + curr.duration, 0);
  const label = isExpanded ? "Last 3 Days" : "Today";

  const handleDelete = async () => {
    if (!sessionToDelete) return;

    try {
      await sessionAPI.deleteSession(sessionToDelete);
      toast.success('Session deleted successfully');
      setShowConfirmModal(false);
      setSessionToDelete(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete:', error);
      toast.error('Failed to delete session');
    }
  };

  const handleSaveManual = async () => {
    const d = parseInt(manualDuration);
    if (!d || d <= 0) {
      toast.error("Invalid duration");
      return;
    }

    const entry: Session = {
      sessionId: Date.now(),
      duration: d * 60,
      target: (parseInt(manualTarget) || 25) * 60,
      date: new Date().toISOString(),
      timestamp: Date.now()
    };

    try {
      await sessionAPI.saveSession(entry);
      toast.success('Session added successfully');
      setShowManualForm(false);
      setManualDuration('');
      onUpdate();
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to add entry');
    }
  };

  const handleDownloadXML = () => {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<history>\n';
    sessions.forEach(item => {
      xml += '  <session>\n';
      xml += `    <sessionId>${item.sessionId}</sessionId>\n`;
      xml += `    <duration>${item.duration}</duration>\n`;
      xml += `    <target>${item.target}</target>\n`;
      xml += `    <date>${item.date}</date>\n`;
      xml += `    <timestamp>${item.timestamp}</timestamp>\n`;
      xml += '  </session>\n';
    });
    xml += '</history>';

    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flow_history_${new Date().toISOString().slice(0, 10)}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadXML = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(event.target?.result as string, "text/xml");
        
        if (doc.getElementsByTagName("parsererror").length > 0) {
          throw new Error("Invalid XML");
        }

        const sessionNodes = doc.getElementsByTagName("session");
        const importedSessions: Session[] = [];

        for (let i = 0; i < sessionNodes.length; i++) {
          const session = sessionNodes[i];
          importedSessions.push({
            sessionId: parseInt(session.getElementsByTagName("sessionId")[0].textContent || '0'),
            duration: parseInt(session.getElementsByTagName("duration")[0].textContent || '0'),
            target: parseInt(session.getElementsByTagName("target")[0].textContent || '0'),
            date: session.getElementsByTagName("date")[0].textContent || '',
            timestamp: parseInt(session.getElementsByTagName("timestamp")[0]?.textContent || '0')
          });
        }

        for (const sess of importedSessions) {
          await sessionAPI.saveSession(sess);
        }

        toast.success("Import successful!");
        onUpdate();
      } catch (err) {
        toast.error("Error parsing XML file.");
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <div className="glass-panel rounded-2xl p-6 w-full flex-1 flex flex-col h-96">
        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider inline-block mr-2">
              History
            </h2>
            <span className="text-xs font-mono text-sky-400">
              {label}: {formatTime(totalSec)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadXML}
              className="text-xs text-slate-500 hover:text-sky-400 transition-colors"
              title="Download XML File"
            >
              <i className="fas fa-download"></i>
            </button>
            <label
              htmlFor="xml-upload"
              className="cursor-pointer text-xs text-slate-500 hover:text-sky-400 transition-colors"
              title="Import XML"
            >
              <i className="fas fa-upload"></i>
            </label>
            <input
              type="file"
              id="xml-upload"
              accept=".xml"
              className="hidden"
              onChange={handleUploadXML}
            />

            <div className="w-px h-4 bg-slate-700 mx-1"></div>

            <button
              onClick={() => setShowManualForm(!showManualForm)}
              className="text-xs text-sky-400/50 hover:text-sky-400 transition-colors"
              title="Add Missing Entry"
            >
              <i className="fas fa-plus"></i>
            </button>
          </div>
        </div>

        {showManualForm && (
          <div className="mb-4 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex flex-col gap-2 animate-fade-in">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">
                  Time (Min)
                </label>
                <input
                  type="number"
                  value={manualDuration}
                  onChange={(e) => setManualDuration(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-sky-500 text-white"
                  placeholder="25"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">
                  Target
                </label>
                <input
                  type="number"
                  value={manualTarget}
                  onChange={(e) => setManualTarget(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-sky-500 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-1">
              <button
                onClick={() => setShowManualForm(false)}
                className="text-xs px-2 py-1 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveManual}
                className="text-xs px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
              <p className="text-xs text-gray-500 mt-3">Loading sessions...</p>
            </div>
          ) : itemsToShow.length === 0 ? (
            <>
              <div className="text-center text-gray-500 text-xs mt-10 italic">
                {!isExpanded && last3DaysItems.length > todayItems.length
                  ? "No sessions today."
                  : "No sessions yet."}
              </div>
              {!isExpanded && last3DaysItems.length > todayItems.length && (
                <div className="text-center mt-4 pb-2 animate-fade-in">
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="text-xs text-sky-400/70 hover:text-sky-400 transition-colors border border-sky-400/30 rounded-full px-4 py-2 hover:bg-sky-400/10"
                  >
                    <i className="fas fa-history mr-2"></i>
                    Load Last 3 Days ({last3DaysItems.length - todayItems.length} more)
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {itemsToShow.map((item) => {
                const dateObj = new Date(item.date);
                const itemTime = dateObj.getTime();
                const isSessionToday = toUTCDateKey(item.date) === todayKey;
                const displayDate = isSessionToday
                  ? "Today"
                  : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                const displayTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const isOver = item.duration > item.target;

                return (
                  <div
                    key={item.sessionId}
                    className="history-item flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 hover:bg-slate-700/50 transition-colors group animate-fade-in"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">
                        {displayDate} • {displayTime}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isOver ? 'text-orange-300' : 'text-sky-300'}`}>
                          {formatTime(item.duration)}
                        </span>
                        {isOver && (
                          <span className="text-[10px] bg-orange-900/50 text-orange-200 px-1.5 py-0.5 rounded border border-orange-800">
                            Flow
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-gray-600">
                        Target: {Math.floor(item.target / 60)}m
                      </div>
                      <button
                        onClick={() => {
                          setSessionToDelete(item.sessionId);
                          setShowConfirmModal(true);
                        }}
                        className="text-slate-600 hover:text-red-400 transition-colors p-1"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                );
              })}

              {!isExpanded && last3DaysItems.length > todayItems.length && (
                <div className="text-center mt-4 pb-2 animate-fade-in">
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="text-xs text-sky-400/70 hover:text-sky-400 transition-colors border border-sky-400/30 rounded-full px-4 py-2 hover:bg-sky-400/10"
                  >
                    <i className="fas fa-history mr-2"></i>
                    Load Last 3 Days ({last3DaysItems.length - todayItems.length} more)
                  </button>
                </div>
              )}

              {isExpanded && last3DaysItems.length > todayItems.length && (
                <div className="text-center mt-4 pb-2 pt-4 border-t border-slate-700/30 animate-fade-in">
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Show Today Only
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Confirm Delete Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl transform scale-100 animate-fade-in border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Entry?</h3>
            <p className="text-slate-400 text-sm mb-6">
              This record will be permanently removed from your history.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSessionToDelete(null);
                }}
                className="px-4 py-2 rounded text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded text-sm bg-red-600 hover:bg-red-500 text-white shadow-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
