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

  // Log the WebSocket URL being used
  useEffect(() => {
    console.log("WebSocket URL configured:", WS_URL);
  }, []);

  // Play notification sound for ALL alert severities (each with a distinct tone)
  const playAlertSound = useCallback((severity: string) => {
    if (!soundEnabled) return;

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();

      const playBeep = (freq: number, delay: number, duration: number = 0.3) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = freq;
        oscillator.type = "sine";

        const startTime = audioContext.currentTime + delay;
        gainNode.gain.setValueAtTime(volume * 0.5, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      // Distinct sound pattern per severity level
      switch (severity) {
        case "critical":
          // Urgent triple high beep
          playBeep(880, 0);
          playBeep(880, 0.15);
          playBeep(1100, 0.3);
          break;
        case "high":
          // Double beep, rising
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
  }, [soundEnabled, volume]);

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

  // Process incoming WebSocket message
  const processMessage = useCallback((data: WebSocketMessage) => {
    if (data.type === "FamilyAlert") {
      const familyAlert = data as FamilyAlert;
      
      const newAlert: DashboardAlert = {
        id: familyAlert.alert_id,
        message: familyAlert.message,
        severity: familyAlert.severity,
        reasoning_trace: familyAlert.reasoning_trace,
        timestamp: new Date(familyAlert.timestamp),
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
        timestamp: new Date(familyAlert.timestamp),
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
  }, [playAlertSound, showBrowserNotification]);

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
    stats,
  };
}
