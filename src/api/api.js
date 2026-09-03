// Single Base Backend API URL shared across all team members
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://shastra-sync.onrender.com').replace(/\/$/, '');

/**
 * Universal HTTP request helper strictly targeting the team's single base backend URL.
 */
async function fetchApi(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API ${path} returned status ${response.status}`);
  }

  return response;
}

/**
 * POST a SensorEvent payload to the Hub API.
 */
export async function postSensorEvent(payload) {
  const response = await fetchApi('/api/events', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.json();
}

/**
 * Fetch latest events or pending events.
 * Unwraps data.events from /api/events/pending so callers always get an array.
 */
export async function fetchLatestEvents(limit = 10) {
  try {
    const pendingRes = await fetchApi('/api/events/pending');
    const data = await pendingRes.json();
    return Array.isArray(data) ? data : data.events || [];
  } catch (err) {
    try {
      const response = await fetchApi(`/api/events?limit=${limit}`);
      const data = await response.json();
      return Array.isArray(data) ? data : data.events || [];
    } catch (e) {
      return [];
    }
  }
}

/**
 * Fetch latest decisions from the Hub API.
 */
export async function fetchLatestDecisions(limit = 5) {
  try {
    const response = await fetchApi(`/api/decisions?limit=${limit}`);
    const data = await response.json();
    return Array.isArray(data) ? data : data.decisions || [];
  } catch (err) {
    return [];
  }
}

/**
 * POST an AgentDecision to the Hub API.
 * This instructs the backend Hub to persist the decision AND immediately broadcast
 * Schema C FamilyAlert to Teammate 4's Family Dashboard over WebSocket!
 */
export async function postDecision(decision) {
  try {
    const response = await fetchApi('/api/decisions', {
      method: 'POST',
      body: JSON.stringify(decision),
    });
    return await response.json();
  } catch (err) {
    console.warn('Failed to post decision to Hub:', err);
    return null;
  }
}

/**
 * Post a family message/reply with fallback to SensorEvents.
 */
export async function postFamilyMessage(messageData) {
  try {
    const response = await fetchApi('/api/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
    return await response.json();
  } catch (e) {
    return postSensorEvent({
      type: 'SensorEvent',
      event_id: crypto.randomUUID(),
      elder_id: messageData.elder_id || 'elder_kamala_001',
      event_type: 'voice_input',
      confidence: 1.0,
      voice_transcript: messageData.message || messageData.text || '',
      timestamp: new Date().toISOString(),
    });
  }
}

