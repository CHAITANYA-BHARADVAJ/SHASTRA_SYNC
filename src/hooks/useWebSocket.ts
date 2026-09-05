"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { WebSocketMessage, FamilyAlert, AgentDecision, DashboardAlert, ActivityEvent } from "@/types/alerts";

// Get WebSocket URL from environment variable with fallback
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/alerts";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export interface UseWebSocketReturn {
  alerts: DashboardAlert[];
  activities: ActivityEvent[];
  connectionStatus: ConnectionStatus;
  acknowledgeAlert: (id: string) => void;
  acknowledgeAll: () => void;
  clearAllAlerts: () => void;
  clearAlert: (id: string) => void;
  reconnect: () => void;
  sendMessage: (message: object) => void;
  registerSentMessage: (text: string) => void;
  triggerTestAlert: () => void;
  stats: {
    totalAlerts: number;
    criticalAlerts: number;
    unacknowledged: number;
    todayAlerts: number;
  };
}

export function useWebSocket(soundEnabled: boolean = true, volume: number = 0.7): UseWebSocketReturn {
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Track messages this family member just sent, so the backend's echo of them
  // (broadcast back as a FamilyAlert) doesn't show up in our own alert feed.
  const sentMessagesRef = useRef<{ text: string; at: number }[]>([]);

  // Log the WebSocket URL being used
  useEffect(() => {
    console.log("WebSocket URL configured:", WS_URL);
  }, []);

  // Reusable AudioContext (created lazily after a user gesture / first alert)
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      audioContextRef.current = new AudioContextClass();
    }
    // Resume if the browser suspended it (autoplay policy)
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch(() => {});
    }
    return audioContextRef.current;
  }, []);

  // Play notification sound for ALL alert severities.
  // Critical = looping SOS siren wail; others = distinct beeps.
  const playAlertSound = useCallback((severity: string) => {
    if (!soundEnabled) return;

    try {
      const audioContext = getAudioContext();
      if (!audioContext) return;

      const now = audioContext.currentTime;

      // Simple beep helper (sine)
      const playBeep = (freq: number, delay: number, duration: number = 0.3, type: OscillatorType = "sine") => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = freq;
        oscillator.type = type;
        const startTime = now + delay;
        gainNode.gain.setValueAtTime(volume * 0.5, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      // A clean two-tone alarm "beep" (steady frequency, quick on/off).
      // Used to build a smoke-alarm / hospital-monitor style alternating pattern.
      const playAlarmBeep = (freq: number, delay: number, duration: number = 0.18) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = "square"; // crisp, alarm-like
        oscillator.frequency.value = freq;

        const startTime = now + delay;
        const end = startTime + duration;

        // Fast attack, short sustain, fast release for a clean "beep"
        gainNode.gain.setValueAtTime(0.0001, startTime);
        gainNode.gain.exponentialRampToValueAtTime(volume * 0.5, startTime + 0.01);
        gainNode.gain.setValueAtTime(volume * 0.5, end - 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

        oscillator.start(startTime);
        oscillator.stop(end);
      };

      switch (severity) {
        case "critical":
          // Two-tone alarm: alternating high-low beeps (hi-lo hi-lo hi-lo)
          playAlarmBeep(880, 0);      // high
          playAlarmBeep(660, 0.22);   // low
          playAlarmBeep(880, 0.44);   // high
          playAlarmBeep(660, 0.66);   // low
          playAlarmBeep(880, 0.88);   // high
          playAlarmBeep(660, 1.10);   // low
          break;
        case "high":
          // Rising double beep
          playBeep(660, 0);
          playBeep(880, 0.2);
          break;
        case "medium":
          // Single mid-tone beep
          playBeep(520, 0, 0.35);
          break;
        case "low":
        default:
          // Gentle soft chime
          playBeep(400, 0, 0.4);
          break;
      }
    } catch (error) {
      console.warn("Could not play alert sound:", error);
    }
  }, [soundEnabled, volume, getAudioContext]);

  // Request browser notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((title: string, body: string, severity: string) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const notification = new Notification(title, {
        body,
        icon: severity === "critical" ? "🚨" : severity === "high" ? "⚠️" : "ℹ️",
        tag: "shastra-sync-alert",
        requireInteraction: severity === "critical",
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, []);

  // Record a message the family just sent. Kept for a short window so we can
  // recognize (and suppress) the backend's echo of it in the alert feed.
  const registerSentMessage = useCallback((text: string) => {
    const trimmed = text.trim().toLowerCase();
    if (!trimmed) return;
    const now = Date.now();
    // Keep only entries from the last 2 minutes.
    sentMessagesRef.current = [
      ...sentMessagesRef.current.filter((m) => now - m.at < 120000),
      { text: trimmed, at: now },
    ];
  }, []);

  // Parse a backend timestamp safely. Backends often emit ISO strings WITHOUT a
  // timezone (e.g. "2026-09-04T08:15:33"), which JS would wrongly treat as LOCAL
  // time. Such server times are virtually always UTC, so if no zone marker is
  // present we append "Z" to parse it as UTC. Strings that already carry a zone
  // (Z or +hh:mm) or are otherwise unparseable fall back gracefully.
  const parseBackendTimestamp = useCallback((raw: string): Date => {
    if (!raw) return new Date();
    const hasZone = /[zZ]$|[+-]\d\d:?\d\d$/.test(raw.trim());
    const normalized = hasZone ? raw : `${raw.trim()}Z`;
    const d = new Date(normalized);
    // If normalization produced an invalid date, fall back to the raw parse,
    // then to "now" so the UI never shows "Invalid Date".
    if (isNaN(d.getTime())) {
      const fallback = new Date(raw);
      return isNaN(fallback.getTime()) ? new Date() : fallback;
    }
    return d;
  }, []);

  // Does an incoming alert look like an echo of a message we just sent?
  const isEchoOfSentMessage = useCallback((alertText: string) => {
    const haystack = alertText.toLowerCase();
    const now = Date.now();
    return sentMessagesRef.current.some(
      (m) => now - m.at < 120000 && m.text.length > 0 && haystack.includes(m.text)
    );
  }, []);

  // Process incoming WebSocket message
  const processMessage = useCallback((data: WebSocketMessage) => {
    if (data.type === "FamilyAlert") {
      const familyAlert = data as FamilyAlert;

      // Suppress the backend's echo of our own outgoing message.
      if (isEchoOfSentMessage(familyAlert.message)) {
        return;
      }

      const newAlert: DashboardAlert = {
        id: familyAlert.alert_id,
        message: familyAlert.message,
        severity: familyAlert.severity,
        reasoning_trace: familyAlert.reasoning_trace,
        timestamp: parseBackendTimestamp(familyAlert.timestamp),
        acknowledged: false,
      };

      // Add new alert to the top of the list (dedupe by id)
      setAlerts((prev) => {
        if (prev.some((a) => a.id === newAlert.id)) return prev;
        return [newAlert, ...prev];
      });

      // Add to activity timeline
      const activity: ActivityEvent = {
        id: `activity-${familyAlert.alert_id}`,
        type: "alert",
        title: `${familyAlert.severity.toUpperCase()} Alert`,
        description: familyAlert.message,
        timestamp: parseBackendTimestamp(familyAlert.timestamp),
        severity: familyAlert.severity,
      };
      setActivities((prev) => {
        if (prev.some((a) => a.id === activity.id)) return prev;
        return [activity, ...prev].slice(0, 50);
      });

      // Play sound and show notification
      playAlertSound(familyAlert.severity);
      showBrowserNotification(
        `${familyAlert.severity.toUpperCase()} Alert - Shastra Sync`,
        familyAlert.message,
        familyAlert.severity
      );
    } else if (data.type === "AgentDecision") {
      // Backend also broadcasts AgentDecision - log it as an activity for richer timeline
      const decision = data as AgentDecision;

      const activityType: ActivityEvent["type"] =
        decision.action === "call_emergency"
          ? "panic"
          : decision.action === "notify_family"
          ? "alert"
          : decision.action === "voice_check"
          ? "check_in"
          : "normal";

      const activity: ActivityEvent = {
        id: `decision-${decision.decision_id}`,
        type: activityType,
        title: `AI Decision: ${decision.action.replace(/_/g, " ")}`,
        description: decision.family_message || decision.reasoning_trace,
        timestamp: new Date(),
        severity: decision.severity,
      };
      setActivities((prev) => {
        if (prev.some((a) => a.id === activity.id)) return prev;
        return [activity, ...prev].slice(0, 50);
      });
    }
  }, [playAlertSound, showBrowserNotification, isEchoOfSentMessage, parseBackendTimestamp]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus("connecting");

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected to:", WS_URL);
        setConnectionStatus("connected");
        reconnectAttemptsRef.current = 0;

        // Add connection activity
        const connectionActivity: ActivityEvent = {
          id: `conn-${Date.now()}`,
          type: "check_in",
          title: "Dashboard Connected",
          description: "Real-time monitoring active",
          timestamp: new Date(),
        };
        setActivities((prev) => [connectionActivity, ...prev].slice(0, 50));
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          processMessage(data);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        // Suppress console error in development - connection failures are expected when backend is down
        if (process.env.NODE_ENV === 'development') {
          console.log("WebSocket connection unavailable - running in offline mode");
        } else {
          console.error("WebSocket error:", error);
        }
        setConnectionStatus("error");
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setConnectionStatus("disconnected");
        wsRef.current = null;

        // Auto-reconnect with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;
        
        console.log(`Reconnecting in ${delay}ms...`);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setConnectionStatus("error");
    }
  }, [processMessage]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Acknowledge an alert
  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, acknowledged: true } : alert
      )
    );
  }, []);

  // Acknowledge all alerts
  const acknowledgeAll = useCallback(() => {
    setAlerts((prev) =>
      prev.map((alert) => ({ ...alert, acknowledged: true }))
    );
  }, []);

  // Clear a single alert
  const clearAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  // Clear all alerts
  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Send message to backend via WebSocket
  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      console.log("Message sent to backend:", message);
    } else {
      console.warn("WebSocket not connected, cannot send message");
    }
  }, []);

  // Fire a local sample critical alert so families can verify sound + notification.
  // This does NOT hit the backend; it's a local test only.
  const triggerTestAlert = useCallback(() => {
    const id = `test-${Date.now()}`;
    const testAlert: DashboardAlert = {
      id,
      message: "TEST: This is a sample critical alert to check your sound and notifications.",
      severity: "critical",
      reasoning_trace: "Triggered manually from Settings to verify the SOS siren and browser notification are working.",
      timestamp: new Date(),
      acknowledged: false,
    };
    const testActivity: ActivityEvent = {
      id: `activity-${id}`,
      type: "alert",
      title: "CRITICAL Alert (Test)",
      description: testAlert.message,
      timestamp: new Date(),
      severity: "critical",
    };
    setAlerts((prev) => [testAlert, ...prev]);
    setActivities((prev) => [testActivity, ...prev].slice(0, 50));

    playAlertSound("critical");
    showBrowserNotification("CRITICAL Alert (Test) - Shastra Sync", testAlert.message, "critical");
  }, [playAlertSound, showBrowserNotification]);

  // Calculate stats
  const stats = {
    totalAlerts: alerts.length,
    criticalAlerts: alerts.filter((a) => a.severity === "critical").length,
    unacknowledged: alerts.filter((a) => !a.acknowledged).length,
    todayAlerts: alerts.filter((a) => {
      const today = new Date();
      return a.timestamp.toDateString() === today.toDateString();
    }).length,
  };

  // Connect on mount, cleanup on unmount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    alerts,
    activities,
    connectionStatus,
    acknowledgeAlert,
    acknowledgeAll,
    clearAllAlerts,
    clearAlert,
    reconnect,
    sendMessage,
    registerSentMessage,
    triggerTestAlert,
    stats,
  };
}
