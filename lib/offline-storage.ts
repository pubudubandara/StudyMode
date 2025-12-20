// IndexedDB wrapper for offline storage
const DB_NAME = 'StudyModeDB';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const PENDING_STORE = 'pendingSessions';

export interface Session {
  _id?: string;
  sessionId: number;
  duration: number;
  target: number;
  date: string;
  timestamp: number;
  synced?: boolean;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create sessions store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'sessionId' });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
        }

        // Create pending sessions store (for offline created sessions)
        if (!db.objectStoreNames.contains(PENDING_STORE)) {
          const pendingStore = db.createObjectStore(PENDING_STORE, { keyPath: 'sessionId' });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async saveSessions(sessions: Session[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      sessions.forEach(session => {
        store.put({ ...session, synced: true });
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getSessions(): Promise<Session[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getTodaySessions(): Promise<Session[]> {
    const allSessions = await this.getSessions();
    const today = new Date().toDateString();
    
    return allSessions.filter(session => {
      const sessionDate = new Date(session.date).toDateString();
      return sessionDate === today;
    });
  }

  async savePendingSession(session: Session): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PENDING_STORE, STORE_NAME], 'readwrite');
      const pendingStore = transaction.objectStore(PENDING_STORE);
      const store = transaction.objectStore(STORE_NAME);

      // Save to both stores
      pendingStore.put({ ...session, synced: false });
      store.put({ ...session, synced: false });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getPendingSessions(): Promise<Session[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PENDING_STORE], 'readonly');
      const store = transaction.objectStore(PENDING_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearPendingSessions(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([PENDING_STORE], 'readwrite');
      const store = transaction.objectStore(PENDING_STORE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSession(sessionId: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME, PENDING_STORE], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const pendingStore = transaction.objectStore(PENDING_STORE);

      store.delete(sessionId);
      pendingStore.delete(sessionId);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async markAsSynced(sessionId: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(sessionId);

      getRequest.onsuccess = () => {
        const session = getRequest.result;
        if (session) {
          session.synced = true;
          store.put(session);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();
