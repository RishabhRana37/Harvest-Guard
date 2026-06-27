import { useState, useEffect } from 'react';
import { getOfflineQueue, removeFromOfflineQueue, deleteScan, initDB } from '../utils/db';
import { api } from '../services/api';

export const useOffline = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Trigger background sync when connection is restored
      processOfflineQueue();
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check on mount
    if (navigator.onLine) {
      processOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
};

/**
 * Iterates through the offline queue and submits pending scans to the API
 */
export const processOfflineQueue = async () => {
  try {
    const queue = await getOfflineQueue();
    if (queue.length === 0) return;

    console.log(`Connection restored. Syncing ${queue.length} offline scans...`);

    for (const item of queue) {
      try {
        // 1. Submit pending image to diagnosis API (ignores mock checks if mock mode is off)
        const result = await api.diagnose(item.image_blob, item.crop_hint);

        if (result && result.scan_id) {
          const db = await initDB();
          
          // 2. Remove from queue
          await removeFromOfflineQueue(item.id);
          
          // 3. Delete the temporary "Pending" history entry
          await deleteScan(item.id);
          
          // 4. Save the final diagnosis result (with the original Blob URL if we want to keep it)
          const localImageUrl = URL.createObjectURL(item.image_blob);
          await db.put('scans', {
            ...result,
            local_image_url: localImageUrl
          });

          console.log(`Synced offline scan ${item.id} successfully as ${result.scan_id}`);
        }
      } catch (error) {
        console.error(`Failed to sync queued scan ${item.id}:`, error);
        // Leave in queue for next reconnect attempt
      }
    }

    // Dispatch custom event to notify components to reload scan lists
    window.dispatchEvent(new Event('storage'));
  } catch (error) {
    console.error('Error processing offline queue:', error);
  }
};
