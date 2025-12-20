// API helper functions
import toast from 'react-hot-toast';

export interface Session {
  _id?: string;
  sessionId: number;
  duration: number;
  target: number;
  date: string;
  timestamp: number;
}

export const sessionAPI = {
  async fetchSessions(): Promise<Session[]> {
    try {
      if (!navigator.onLine) {
        toast.error('No internet connection');
        return [];
      }
      
      const token = localStorage.getItem('token');
      const res = await fetch('/api/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch');
      }
      
      const data = await res.json();
      return data.sessions || [];
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load sessions');
      return [];
    }
  },

  async saveSession(session: Session): Promise<any> {
    try {
      if (!navigator.onLine) {
        toast.error('No internet connection');
        throw new Error('No internet connection');
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
      return result;
    } catch (error) {
      console.error('Failed to save session:', error);
      toast.error('Failed to save session');
      throw error;
    }
  },

  async deleteSession(sessionId: number): Promise<any> {
    try {
      if (!navigator.onLine) {
        toast.error('No internet connection');
        throw new Error('No internet connection');
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
  }
};
