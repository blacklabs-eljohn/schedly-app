/**
 * Schedly Persistent Local Database Engine (IndexedDB + Synchronous Fast In-Memory Cache)
 * 
 * Provides robust offline storage for:
 * - Student Profile & Digital ID
 * - University Courses & Timetables
 * - Personal Events, Deadlines & Tasks
 * - Notification & Color Theme Settings
 * - Offline Sync Queue (pending mutations to push to Supabase)
 * - Offline Authenticated User Session
 */

const DB_NAME = 'schedly_offline_db';
const DB_VERSION = 1;

export interface SyncQueueItem {
  id: string;
  userId: string;
  table: 'profiles' | 'user_settings' | 'courses' | 'course_schedules' | 'custom_events';
  action: 'upsert' | 'delete';
  payload: any;
  localId?: string;
  remoteId?: string;
  createdAt: string;
  retryCount: number;
  syncStatus: 'pending' | 'syncing' | 'error';
  lastError?: string;
}

export interface CachedAuthSession {
  userId: string;
  email?: string;
  fullName?: string;
  userMetadata?: any;
  lastAuthenticatedAt: string;
  accessToken?: string;
  refreshToken?: string;
}

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase | null> | null = null;

/**
 * Open or upgrade IndexedDB
 */
export function getIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Key-Value Store for app data
        if (!db.objectStoreNames.contains('keyval')) {
          db.createObjectStore('keyval');
        }

        // Sync Queue Store for offline mutations
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          syncStore.createIndex('userId', 'userId', { unique: false });
          syncStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          syncStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Offline Session Store
        if (!db.objectStoreNames.contains('auth_session')) {
          db.createObjectStore('auth_session', { keyPath: 'userId' });
        }
      };

      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(dbInstance);
      };

      request.onerror = (err) => {
        console.warn('[IndexedDB] Failed to open database, falling back to localStorage:', err);
        resolve(null);
      };

      request.onblocked = () => {
        console.warn('[IndexedDB] Database open blocked.');
      };
    } catch (err) {
      console.warn('[IndexedDB] Initialization error:', err);
      resolve(null);
    }
  });

  return dbInitPromise;
}

// In-memory instant cache for zero-latency synchronous access
const memoryCache = new Map<string, any>();

/**
 * Get item asynchronously from IndexedDB, falling back to localStorage and in-memory cache
 */
export async function idbGet<T = any>(key: string): Promise<T | undefined> {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as T;
  }

  const db = await getIndexedDB();
  if (db) {
    try {
      const tx = db.transaction('keyval', 'readonly');
      const store = tx.objectStore('keyval');
      const req = store.get(key);

      const val = await new Promise<T | undefined>((resolve) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(undefined);
      });

      if (val !== undefined) {
        memoryCache.set(key, val);
        return val;
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryCache.set(key, parsed);
      return parsed;
    }
  } catch {
    // Ignore
  }

  return undefined;
}

/**
 * Set item in IndexedDB + in-memory cache + localStorage mirror for frame-0 hydration
 */
export async function idbSet(key: string, val: any): Promise<void> {
  memoryCache.set(key, val);

  // Write to localStorage mirror synchronously so initial page load on restart is instant
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // If localStorage quota exceeded, IndexedDB will still persist
  }

  const db = await getIndexedDB();
  if (db) {
    try {
      const tx = db.transaction('keyval', 'readwrite');
      const store = tx.objectStore('keyval');
      store.put(val, key);
    } catch (err) {
      console.warn('[IndexedDB] Failed to set key:', key, err);
    }
  }
}

/**
 * Delete item from IndexedDB and cache
 */
export async function idbDelete(key: string): Promise<void> {
  memoryCache.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }

  const db = await getIndexedDB();
  if (db) {
    try {
      const tx = db.transaction('keyval', 'readwrite');
      const store = tx.objectStore('keyval');
      store.delete(key);
    } catch (err) {
      console.warn('[IndexedDB] Failed to delete key:', key, err);
    }
  }
}

// ================= SYNC QUEUE OPERATIONS =================

/**
 * Enqueue a mutation into the offline sync queue
 */
export async function enqueueSyncMutation(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount' | 'syncStatus'>): Promise<SyncQueueItem> {
  const syncItem: SyncQueueItem = {
    ...item,
    id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    syncStatus: 'pending'
  };

  const db = await getIndexedDB();
  if (db) {
    try {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      store.put(syncItem);
    } catch (err) {
      console.warn('[SyncQueue] IDB enqueue failed, using fallback:', err);
    }
  }

  // Backup in localStorage queue
  try {
    const queueKey = `schedly_sync_queue_${item.userId}`;
    const raw = localStorage.getItem(queueKey);
    const list: SyncQueueItem[] = raw ? JSON.parse(raw) : [];
    list.push(syncItem);
    localStorage.setItem(queueKey, JSON.stringify(list));
  } catch {
    // Ignore
  }

  return syncItem;
}

/**
 * Get all pending sync mutations for a user
 */
export async function getPendingSyncMutations(userId: string): Promise<SyncQueueItem[]> {
  const db = await getIndexedDB();
  if (db) {
    try {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const index = store.index('userId');
      const req = index.getAll(IDBKeyRange.only(userId));

      const items = await new Promise<SyncQueueItem[]>((resolve) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });

      if (items && items.length > 0) {
        return items;
      }
    } catch {
      // Fallback
    }
  }

  // Fallback to localStorage queue
  try {
    const queueKey = `schedly_sync_queue_${userId}`;
    const raw = localStorage.getItem(queueKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Remove an item from the sync queue after successful push
 */
export async function removeSyncMutation(id: string, userId: string): Promise<void> {
  const db = await getIndexedDB();
  if (db) {
    try {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      store.delete(id);
    } catch {
      // Ignore
    }
  }

  try {
    const queueKey = `schedly_sync_queue_${userId}`;
    const raw = localStorage.getItem(queueKey);
    if (raw) {
      const list: SyncQueueItem[] = JSON.parse(raw);
      const filtered = list.filter(item => item.id !== id);
      localStorage.setItem(queueKey, JSON.stringify(filtered));
    }
  } catch {
    // Ignore
  }
}

/**
 * Update a sync mutation status or retry count
 */
export async function updateSyncMutation(item: SyncQueueItem): Promise<void> {
  const db = await getIndexedDB();
  if (db) {
    try {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      store.put(item);
    } catch {
      // Ignore
    }
  }

  try {
    const queueKey = `schedly_sync_queue_${item.userId}`;
    const raw = localStorage.getItem(queueKey);
    if (raw) {
      const list: SyncQueueItem[] = JSON.parse(raw);
      const updated = list.map(i => i.id === item.id ? item : i);
      localStorage.setItem(queueKey, JSON.stringify(updated));
    }
  } catch {
    // Ignore
  }
}

/**
 * Clear all sync queue items for a user
 */
export async function clearSyncQueue(userId: string): Promise<void> {
  const db = await getIndexedDB();
  if (db) {
    try {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const index = store.index('userId');
      const req = index.getAllKeys(IDBKeyRange.only(userId));
      req.onsuccess = () => {
        const keys = req.result;
        keys.forEach(key => store.delete(key));
      };
    } catch {
      // Ignore
    }
  }

  try {
    localStorage.removeItem(`schedly_sync_queue_${userId}`);
  } catch {
    // Ignore
  }
}

// ================= OFFLINE AUTH SESSION STORAGE =================

const AUTH_SESSION_KEY = 'schedly_offline_cached_auth_session';

/**
 * Save authenticated session to persistent storage
 */
export async function saveCachedAuthSession(session: CachedAuthSession): Promise<void> {
  await idbSet(AUTH_SESSION_KEY, session);
}

/**
 * Get cached auth session synchronously from memory or localStorage, ensuring instant frame-0 login state
 */
export function getCachedAuthSessionSync(): CachedAuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.userId ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Clear cached auth session on explicit logout
 */
export async function clearCachedAuthSession(): Promise<void> {
  await idbDelete(AUTH_SESSION_KEY);
}
