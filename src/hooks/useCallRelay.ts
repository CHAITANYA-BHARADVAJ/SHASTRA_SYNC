"use client";

import { useCallback, useEffect, useRef } from "react";
import { CallInvite, CallResponse } from "@/types/alerts";

const CALL_WS_URL = process.env.NEXT_PUBLIC_CALL_WS_URL || "ws://localhost:8080";

type RelayMessage = CallInvite | CallResponse;

interface UseCallRelayOptions {
  /** Called for every call-signaling message received from the relay. */
  onMessage?: (message: RelayMessage) => void;
}

export interface UseCallRelayReturn {
  /** Send a call-signaling message through the relay. */
  send: (message: RelayMessage) => void;
}

/**
 * Connects to the standalone call-signaling relay server and keeps the
 * connection alive with auto-reconnect. Used by both the family dashboard
 * (to send CallInvite) and the elder dashboard (to receive CallInvite).
 */
export function useCallRelay(options: UseCallRelayOptions = {}): UseCallRelayReturn {
  const { onMessage } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);

  // Keep the latest onMessage without forcing reconnects when it changes.
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(CALL_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        attemptsRef.current = 0;
        console.log("Call relay connected:", CALL_WS_URL);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as RelayMessage;
          if (data.type === "CallInvite" || data.type === "CallResponse") {
            onMessageRef.current?.(data);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        // Relay may simply not be running; stay quiet in dev.
      };

      ws.onclose = () => {
        wsRef.current = null;
        const delay = Math.min(1000 * Math.pow(2, attemptsRef.current), 30000);
        attemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };
    } catch {
      // swallow; reconnect handled on close
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const send = useCallback((message: RelayMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("Call relay not connected; message not sent:", message.type);
    }
  }, []);

  return { send };
}
