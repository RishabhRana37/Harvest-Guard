import { openDB } from 'idb';
import type { DBSchema } from 'idb';

export interface SavedScan {
  scan_id: string;
  created_at: string;
  is_leaf: boolean;
  is_confident: boolean;
  confidence: number | null;
  confidence_band: 'high' | 'medium' | 'low' | null;
  severity: 'healthy' | 'mild' | 'severe' | null;
  urgency_days: number | null;
  prediction: {
    slug: string;
    crop: string;
    name: string;
    prob: number;
  } | null;
  top_k: Array<{
    slug: string;
    crop: string;
    name: string;
    prob: number;
  }>;
  heatmap: string | null; // base64
  disease: {
    slug: string;
    crop: string;
    name: string;
    pathogen: string;
    is_healthy: boolean;
    symptoms: string[];
    cause: string;
    lifecycle: string;
    treatments: {
      organic: Array<{ action: string; dosage: string; frequency: string; safety: string }>;
      chemical: Array<{ action: string; dosage: string; frequency: string; safety: string }>;
      prevention: string[];
    };
    confused_with: string[];
    image_url: string;
  } | null;
  
  // Custom offline and local rendering helpers
  local_image_url?: string; // Blob URL
  is_pending?: boolean;     // True if uploaded while offline and waiting to sync
  offline_image_blob?: Blob;// Image blob kept for upload retry
  crop_hint?: string;       // Kept to send on sync
  scan_mode?: 'disease' | 'pest';
  pest?: {
    slug: string;
    crop: string;
    name: string;
    severity: string;
    description: string;
    treatments: {
      organic: string[];
      chemical: string[];
    };
  } | null;
}

interface Harvest GuardDB extends DBSchema {
  scans: {
    key: string;
    value: SavedScan;
  };
  offline_queue: {
    key: string;
    value: {
      id: string;
      image_blob: Blob;
      crop_hint?: string;
      created_at: string;
    };
  };
}

const DB_NAME = 'harvest-guard-db';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB<Harvest GuardDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('scans')) {
        db.createObjectStore('scans', { keyPath: 'scan_id' });
      }
      if (!db.objectStoreNames.contains('offline_queue')) {
        db.createObjectStore('offline_queue', { keyPath: 'id' });
      }
    },
  });
};

export const saveScan = async (scan: SavedScan) => {
  const db = await initDB();
  await db.put('scans', scan);
};

export const getScan = async (scanId: string) => {
  const db = await initDB();
  return db.get('scans', scanId);
};

export const getAllScans = async () => {
  const db = await initDB();
  const scans = await db.getAll('scans');
  // Sort reverse-chronological by created_at
  return scans.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const deleteScan = async (scanId: string) => {
  const db = await initDB();
  await db.delete('scans', scanId);
};

export const clearAllScans = async () => {
  const db = await initDB();
  const tx = db.transaction('scans', 'readwrite');
  await tx.store.clear();
  await tx.done;
};

// Offline Queue Operations
export const enqueueOfflineScan = async (imageBlob: Blob, cropHint?: string) => {
  const db = await initDB();
  const id = `pending_${Date.now()}`;
  const createdAt = new Date().toISOString();
  
  // 1. Add to offline upload queue
  await db.put('offline_queue', {
    id,
    image_blob: imageBlob,
    crop_hint: cropHint,
    created_at: createdAt
  });

  // 2. Add a dummy "Pending" item in the history database so user sees it in dashboard
  const blobUrl = URL.createObjectURL(imageBlob);
  const pendingScan: SavedScan = {
    scan_id: id,
    created_at: createdAt,
    is_leaf: true,
    is_confident: false,
    confidence: null,
    confidence_band: null,
    severity: null,
    urgency_days: null,
    prediction: {
      slug: 'pending',
      crop: cropHint || 'Crop',
      name: 'Scanning queued (Offline)',
      prob: 0
    },
    top_k: [],
    heatmap: null,
    disease: null,
    local_image_url: blobUrl,
    is_pending: true,
    offline_image_blob: imageBlob,
    crop_hint: cropHint
  };
  await db.put('scans', pendingScan);
  return id;
};

export const getOfflineQueue = async () => {
  const db = await initDB();
  return db.getAll('offline_queue');
};

export const removeFromOfflineQueue = async (id: string) => {
  const db = await initDB();
  await db.delete('offline_queue', id);
};
