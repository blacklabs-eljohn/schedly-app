/**
 * Local Offline File & Document Storage Engine
 * 
 * Stores documents, slides (PPT/PPTX), PDFs, spreadsheets, and study materials
 * 100% locally on the device using IndexedDB binary Blob storage.
 */

import { AppFolder, AppStoredFile } from '../types';

const DB_NAME = 'schedly_local_files_db';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported on this device.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Metadata store
      if (!db.objectStoreNames.contains('files_meta')) {
        const fileStore = db.createObjectStore('files_meta', { keyPath: 'id' });
        fileStore.createIndex('courseId', 'courseId', { unique: false });
        fileStore.createIndex('folderId', 'folderId', { unique: false });
        fileStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Binary Blob store
      if (!db.objectStoreNames.contains('files_blob')) {
        db.createObjectStore('files_blob');
      }

      // Folders store
      if (!db.objectStoreNames.contains('folders')) {
        const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
        folderStore.createIndex('courseId', 'courseId', { unique: false });
        folderStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = (err) => {
      console.error('[FileStorage] Error opening database:', err);
      reject(err);
    };
  });

  return dbPromise;
}

/**
 * Format bytes to readable size string e.g. "2.4 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Extract clean extension from filename e.g. "pdf", "pptx"
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length > 1) {
    return parts[parts.length - 1].toLowerCase().trim();
  }
  return '';
}

export type FileCategory = 'slides' | 'docs' | 'pdf' | 'sheets' | 'image' | 'other';

export function getFileCategory(extension: string): FileCategory {
  const ext = extension.toLowerCase().replace('.', '');
  if (['ppt', 'pptx', 'odp', 'key'].includes(ext)) return 'slides';
  if (['doc', 'docx', 'odt', 'pages', 'rtf', 'txt', 'md'].includes(ext)) return 'docs';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['xls', 'xlsx', 'ods', 'numbers', 'csv'].includes(ext)) return 'sheets';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) return 'image';
  return 'other';
}

/**
 * Save a new file into local offline storage
 */
export async function saveLocalFile(
  file: File | Blob,
  fileName: string,
  options?: {
    courseId?: string;
    folderId?: string;
  }
): Promise<AppStoredFile> {
  const db = await getDb();
  const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const ext = getFileExtension(fileName);
  const now = new Date().toISOString();

  const fileMeta: AppStoredFile = {
    id: fileId,
    name: fileName,
    size: file.size,
    type: file.type || 'application/octet-stream',
    extension: ext,
    courseId: options?.courseId,
    folderId: options?.folderId,
    createdAt: now,
    updatedAt: now
  };

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(['files_meta', 'files_blob'], 'readwrite');
      
      const metaStore = tx.objectStore('files_meta');
      const blobStore = tx.objectStore('files_blob');

      metaStore.put(fileMeta);
      blobStore.put(file, fileId);

      tx.oncomplete = () => {
        resolve(fileMeta);
      };

      tx.onerror = (err) => {
        console.error('[FileStorage] Error saving file:', err);
        reject(err);
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieve all files metadata
 */
export async function getAllStoredFiles(): Promise<AppStoredFile[]> {
  const db = await getDb();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('files_meta', 'readonly');
      const store = tx.objectStore('files_meta');
      const req = store.getAll();

      req.onsuccess = () => {
        const files: AppStoredFile[] = req.result || [];
        // Sort newest first
        files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(files);
      };

      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Get files associated with a specific course
 */
export async function getFilesByCourse(courseId: string): Promise<AppStoredFile[]> {
  const all = await getAllStoredFiles();
  return all.filter(f => f.courseId === courseId);
}

/**
 * Get files in a specific folder
 */
export async function getFilesByFolder(folderId: string): Promise<AppStoredFile[]> {
  const all = await getAllStoredFiles();
  return all.filter(f => f.folderId === folderId);
}

/**
 * Retrieve binary Blob for a file
 */
export async function getFileBlob(fileId: string): Promise<Blob | null> {
  const db = await getDb();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('files_blob', 'readonly');
      const store = tx.objectStore('files_blob');
      const req = store.get(fileId);

      req.onsuccess = () => {
        resolve(req.result || null);
      };

      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Download / export a stored file directly onto the device
 */
export async function downloadStoredFile(file: AppStoredFile): Promise<boolean> {
  const blob = await getFileBlob(file.id);
  if (!blob) return false;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/**
 * Delete a file permanently from offline storage
 */
export async function deleteStoredFile(fileId: string): Promise<boolean> {
  const db = await getDb();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(['files_meta', 'files_blob'], 'readwrite');
      tx.objectStore('files_meta').delete(fileId);
      tx.objectStore('files_blob').delete(fileId);

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Rename a stored file
 */
export async function renameStoredFile(fileId: string, newName: string): Promise<AppStoredFile | null> {
  const db = await getDb();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('files_meta', 'readwrite');
      const store = tx.objectStore('files_meta');
      const getReq = store.get(fileId);

      getReq.onsuccess = () => {
        const item: AppStoredFile | undefined = getReq.result;
        if (!item) {
          resolve(null);
          return;
        }

        const ext = getFileExtension(newName) || item.extension;
        const updated: AppStoredFile = {
          ...item,
          name: newName,
          extension: ext,
          updatedAt: new Date().toISOString()
        };

        store.put(updated);
        resolve(updated);
      };

      getReq.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Move file to a different folder or course
 */
export async function moveStoredFile(
  fileId: string, 
  target: { folderId?: string; courseId?: string }
): Promise<AppStoredFile | null> {
  const db = await getDb();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('files_meta', 'readwrite');
      const store = tx.objectStore('files_meta');
      const getReq = store.get(fileId);

      getReq.onsuccess = () => {
        const item: AppStoredFile | undefined = getReq.result;
        if (!item) {
          resolve(null);
          return;
        }

        const updated: AppStoredFile = {
          ...item,
          folderId: target.folderId !== undefined ? target.folderId : item.folderId,
          courseId: target.courseId !== undefined ? target.courseId : item.courseId,
          updatedAt: new Date().toISOString()
        };

        store.put(updated);
        resolve(updated);
      };

      getReq.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// ================= FOLDER OPERATIONS =================

/**
 * Create a new custom folder
 */
export async function createCustomFolder(
  name: string,
  color: string = '#0284C7',
  icon: string = 'folder'
): Promise<AppFolder> {
  const db = await getDb();
  const folderId = `folder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const folder: AppFolder = {
    id: folderId,
    name: name.trim(),
    color,
    icon,
    createdAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction('folders', 'readwrite');
      const store = tx.objectStore('folders');
      store.put(folder);

      tx.oncomplete = () => resolve(folder);
      tx.onerror = (err) => reject(err);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Get all custom folders
 */
export async function getAllCustomFolders(): Promise<AppFolder[]> {
  const db = await getDb();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('folders', 'readonly');
      const store = tx.objectStore('folders');
      const req = store.getAll();

      req.onsuccess = () => {
        const list: AppFolder[] = req.result || [];
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        resolve(list);
      };

      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Delete a custom folder
 */
export async function deleteCustomFolder(folderId: string): Promise<boolean> {
  const db = await getDb();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('folders', 'readwrite');
      tx.objectStore('folders').delete(folderId);

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Rename a custom folder
 */
export async function renameCustomFolder(folderId: string, newName: string): Promise<AppFolder | null> {
  const db = await getDb();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('folders', 'readwrite');
      const store = tx.objectStore('folders');
      const getReq = store.get(folderId);

      getReq.onsuccess = () => {
        const item: AppFolder | undefined = getReq.result;
        if (!item) {
          resolve(null);
          return;
        }

        const updated: AppFolder = {
          ...item,
          name: newName.trim()
        };

        store.put(updated);
        resolve(updated);
      };

      getReq.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Calculate total local storage usage
 */
export async function getStorageUsageSummary(): Promise<{
  totalBytes: number;
  fileCount: number;
  formattedSize: string;
}> {
  const files = await getAllStoredFiles();
  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  return {
    totalBytes,
    fileCount: files.length,
    formattedSize: formatFileSize(totalBytes)
  };
}
