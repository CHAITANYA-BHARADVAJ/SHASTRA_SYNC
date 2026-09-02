// API Service for Shastra Sync Backend
// Base URL: https://shastra-sync.onrender.com

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://shastra-sync.onrender.com";

export interface SensorEvent {
  type?: "SensorEvent";
  event_id?: string;
  elder_id: string;
  event_type: "fall" | "inactivity" | "medication_missed" | "manual_panic" | "voice_input" | "emotion_detected" | "normal";
  confidence?: number;
  voice_transcript?: string | null;
  emotion?: "sad" | "fear" | "happy" | "neutral" | null;
  timestamp?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Generic fetch wrapper with error handling
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`[API] ${options.method || "GET"} ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] Error ${response.status}:`, errorText);
      return {
        success: false,
        error: `API Error: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json();
    console.log(`[API] Response:`, data);
    return { success: true, data };
  } catch (error) {
    console.error("[API] Fetch error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Health check
export async function checkHealth(): Promise<ApiResponse<{ status: string; connected_clients: number }>> {
  return apiFetch("/");
}

// Send a sensor event (message, check-in, etc.)
export async function sendEvent(event: SensorEvent): Promise<ApiResponse<SensorEvent>> {
  // Generate event_id if not provided
  const eventWithId: SensorEvent = {
    type: "SensorEvent",
    event_id: event.event_id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: event.timestamp || new Date().toISOString(),
    confidence: event.confidence ?? 1.0,
    ...event,
  };

  return apiFetch<SensorEvent>("/api/events", {
    method: "POST",
    body: JSON.stringify(eventWithId),
  });
}

// Send a family message to elder (as voice_input event)
export async function sendFamilyMessage(
  elderId: string,
  message: string
): Promise<ApiResponse<SensorEvent>> {
  return sendEvent({
    elder_id: elderId,
    event_type: "voice_input",
    voice_transcript: message,
    emotion: "happy",
  });
}

// Send a check-in event
export async function sendCheckIn(
  elderId: string,
  mood: "happy" | "neutral" | "sad"
): Promise<ApiResponse<SensorEvent>> {
  return sendEvent({
    elder_id: elderId,
    event_type: "emotion_detected",
    emotion: mood === "sad" ? "sad" : mood === "happy" ? "happy" : "neutral",
  });
}

// Send manual panic/emergency
export async function sendEmergency(elderId: string): Promise<ApiResponse<SensorEvent>> {
  return sendEvent({
    elder_id: elderId,
    event_type: "manual_panic",
    confidence: 1.0,
  });
}

// Send medication missed event
export async function sendMedicationMissed(
  elderId: string,
  medicationName?: string
): Promise<ApiResponse<SensorEvent>> {
  return sendEvent({
    elder_id: elderId,
    event_type: "medication_missed",
    voice_transcript: medicationName ? `Missed: ${medicationName}` : undefined,
  });
}

// Get pending events (for debugging/admin)
export async function getPendingEvents(): Promise<ApiResponse<{ events: SensorEvent[] }>> {
  return apiFetch("/api/events/pending");
}

export default {
  checkHealth,
  sendEvent,
  sendFamilyMessage,
  sendCheckIn,
  sendEmergency,
  sendMedicationMissed,
  getPendingEvents,
};
