import { postSensorEvent } from '../api/api';

const OFFLINE_QUEUE_KEY = 'shastra_offline_events';

/**
 * Queue a SensorEvent in localStorage if network is offline or fails
 */
export function queueOfflineEvent(payload) {
  try {
    const existing = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    existing.push({ payload, queuedAt: new Date().toISOString() });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(existing));
    console.log(`[OfflineQueue] Event queued (${existing.length} pending)`);
  } catch (e) {
    console.error('Failed to queue offline event:', e);
  }
}

/**
 * Flush all queued offline events to the cloud endpoint
 */
export async function flushOfflineQueue(onEventSynced) {
  try {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    if (queue.length === 0) return;

    console.log(`[OfflineQueue] Flushing ${queue.length} offline events...`);
    const remaining = [];

    for (const item of queue) {
      try {
        await postSensorEvent(item.payload);
        if (onEventSynced) onEventSynced(item.payload);
      } catch (err) {
        // If still offline, keep in queue
        remaining.push(item);
      }
    }

    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  } catch (e) {
    console.error('Failed to flush offline queue:', e);
  }
}

/**
 * Get count of pending offline events
 */
export function getOfflineQueueCount() {
  try {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    return queue.length;
  } catch (e) {
    return 0;
  }
}
