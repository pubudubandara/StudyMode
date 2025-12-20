// API helper functions with offline support
import toast from 'react-hot-toast';

export interface Session {
  _id?: string;
  sessionId: number;
  duration: number;
  target: number;
  date: string;
  timestamp: number;
  synced?: boolean;
}

export const sessionAPI = {
  async fetchSessions(): Promise<Session[]> {
    try {
      if (!navigator.onLine) {
        const offlineStorage = (window as any).offlineStorage;
        const sessions = await offlineStorage.getSessions();
        return sessions;
      }
      
      const token = localStorage.getItem('token');
      const res = await fetch('/api/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch');
      }
      
      const data = await res.json();
      
      // Save to IndexedDB for offline access
      const offlineStorage = (window as any).offlineStorage;
      await offlineStorage.saveSessions(data.sessions || []);
      
      return data.sessions || [];
    } catch (error) {
      console.error('Fetch error, loading from local storage:', error);
      const offlineStorage = (window as any).offlineStorage;
      const cachedSessions = await offlineStorage.getSessions();
      return cachedSessions;
    }
  },

  async saveSession(session: Session): Promise<any> {
    try {
      const offlineStorage = (window as any).offlineStorage;
      
      if (!navigator.onLine) {
        await offlineStorage.savePendingSession(session);
        toast.success('Saved offline - will sync when online');
        return { success: true, session };
      }
      
      const token = localStorage.getItem('token');
      console.log('Saving session to server:', session);
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(session)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Save failed:', res.status, errorText);
        throw new Error('Failed to save');
      }
      
      const result = await res.json();
      console.log('Session saved successfully:', result);
      
      // Save to IndexedDB for offline access (not as pending)
      const currentSessions = await offlineStorage.getSessions();
      const updatedSessions = [...currentSessions, result.session];
      await offlineStorage.saveSessions(updatedSessions);
      
      return result;
    } catch (error) {
      console.error('Failed to save session:', error);
      const offlineStorage = (window as any).offlineStorage;
      await offlineStorage.savePendingSession(session);
      toast.error('Saved offline - will sync later');
      return { success: true, session };
    }
  },

  async deleteSession(sessionId: number): Promise<any> {
    try {
      const offlineStorage = (window as any).offlineStorage;
      await offlineStorage.deleteSession(sessionId);
      
      if (!navigator.onLine) {
        toast.success('Deleted locally - will sync when online');
        return { success: true };
      }
      
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/sessions?sessionId=${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  },

  async syncPendingSessions(): Promise<void> {
    if (!navigator.onLine) {
      console.log('Still offline, skipping sync');
      return;
    }

    try {
      const offlineStorage = (window as any).offlineStorage;
      const pendingSessions = await offlineStorage.getPendingSessions();
      
      if (pendingSessions.length === 0) {
        console.log('No pending sessions to sync');
        return;
      }

      console.log('Syncing', pendingSessions.length, 'pending sessions...');
      let successCount = 0;

      for (const session of pendingSessions) {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch('/api/sessions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(session)
          });

          if (res.ok) {
            await offlineStorage.markAsSynced(session.sessionId);
            successCount++;
          }
        } catch (error) {
          console.error('Failed to sync session:', session.sessionId, error);
        }
      }

      if (successCount > 0) {
        await offlineStorage.clearPendingSessions();
        toast.success(`Synced ${successCount} session(s)`);
        return;
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Failed to sync some sessions');
    }
  }
};
