// JSON Schema Types from the God Document

// Schema A: SensorEvent (from Simulator/Vision Node)
export interface SensorEvent {
  type: "SensorEvent";
  event_id: string;
  elder_id: string;
  event_type: "fall" | "inactivity" | "medication_missed" | "manual_panic" | "voice_input" | "emotion_detected" | "normal";
  confidence: number;
  voice_transcript: string | null;
  emotion: "sad" | "fear" | "happy" | "neutral" | null;
  timestamp: string;
}

// Schema B: AgentDecision (received from Core API via WebSocket)
export interface AgentDecision {
  type: "AgentDecision";
  decision_id: string;
  event_id: string;
  severity: "low" | "medium" | "high" | "critical";
  action: "monitor" | "voice_check" | "notify_family" | "call_emergency";
  reasoning_trace: string;
  voice_message_to_elder: string | null;
  language_code: string;
  family_message: string;
}

// Schema C: FamilyAlert (received from Core API via WebSocket)
export interface FamilyAlert {
  type: "FamilyAlert";
  alert_id: string;
  decision_id: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  reasoning_trace: string;
  timestamp: string;
}

// Schema D: CallInvite (family -> elder, sent over WebSocket)
// Notification-only: signals an incoming voice/video call. No media stream.
export interface CallInvite {
  type: "CallInvite";
  call_id: string;
  elder_id: string;
  caller_name: string;
  call_type: "voice" | "video";
  timestamp: string;
}

// Schema E: CallResponse (elder -> family, sent over WebSocket)
export interface CallResponse {
  type: "CallResponse";
  call_id: string;
  elder_id: string;
  response: "accepted" | "declined";
  timestamp: string;
}

// Union type for all possible WebSocket messages
export type WebSocketMessage = AgentDecision | FamilyAlert | CallInvite | CallResponse;

// Internal alert type for the dashboard (enriched with local data)
export interface DashboardAlert {
  id: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  reasoning_trace: string;
  timestamp: Date;
  acknowledged: boolean;
  eventType?: string;
}

// Elder Profile type
export interface ElderProfile {
  id: string;
  name: string;
  age: number;
  photo: string;
  address: string;
  phone: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalConditions: string[];
  medications: string[];
  lastCheckIn: Date;
  status: "safe" | "attention" | "alert" | "critical";
}

// Activity event for timeline
export interface ActivityEvent {
  id: string;
  type: "normal" | "fall" | "emotion" | "medication" | "check_in" | "alert" | "panic";
  title: string;
  description: string;
  timestamp: Date;
  severity?: "low" | "medium" | "high" | "critical";
}

// Statistics data
export interface DailyStats {
  date: string;
  totalAlerts: number;
  criticalAlerts: number;
  normalActivities: number;
  avgResponseTime: number;
}

// Settings/Preferences
export interface DashboardSettings {
  soundEnabled: boolean;
  soundVolume: number;
  darkMode: boolean;
  notificationsEnabled: boolean;
  autoAcknowledge: boolean;
  autoAcknowledgeDelay: number;
  language: string;
}
