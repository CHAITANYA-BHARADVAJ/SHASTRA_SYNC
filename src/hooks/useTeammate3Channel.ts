"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Teammate3BaseMessage,
  Teammate3Message,
  PeerId,
  isTeammate3Message,
} from "@/types/teammate3";

// All members share ONE base backend WebSocket URL.
const BASE_WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/alerts";

export type ChannelStatus = "connecting" | "connected" | "disconnected" | "error";

/** A handler receives one identified message and may return a reply to send back. */
export type Teammate3Handler = (
  msg: Teammate3BaseMessage
) => void | Teammate3Message | Promise<void | Teammate3Message>;

interface UseTeammate3ChannelOptions {
  /**
   * Map of message `type` -> handler. When a message arrives, it is identified
   * by its `type` and routed to the matching handler. Unmatched types go to
   * `onUnknown`.
   */
  handlers?: Record<string, Teammate3Handler>;
  /** Called for any message whose `type` has no registered handler. */
  onUnknown?: (msg: Teammate3BaseMessage) => void;
  /** Only process messages addressed to teammate 4 (or with no `to`). Default true. */
  onlyForMe?: boolean;
}

export interface UseTeammate3ChannelReturn {
  status: ChannelStatus;
  /** Send a message to teammate 3 through the shared backend. */
  send: (msg: Teammate3Message) => boolean;
  /** The most recently received (identified) message, for debugging/UI. */
  lastMessage: Teammate3BaseMessage | null;
}

const ME: PeerId = "teammate4";
const PEER: PeerId = "teammate3";

/**
 * Bidirectional messaging channel between teammate 4 (this dashboard) and
 * teammate 3, over the shared base backend URL.
 *
 * Receiving:  identifies each incoming message by `type` and routes it to the
 *             matching handler (or `onUnknown`). If a handler returns a message,
 *             it is automatically sent back to teammate 3.
 * Sending:    `send()` stamps from/to and pushes to the backend.
 */
export function useTeammate3Channel(
  options: UseTeammate3ChannelOptions = {}
): UseTeammate3ChannelReturn {
  const { handlers, onUnknown, onlyForMe = true } = options;

  const [status, setStatus] = useState<ChannelStatus>("connecting");
  const [lastMessage, setLastMessage] = useState<Teammate3BaseMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);

  // Keep latest callbacks in refs so the socket doesn't reconnect when they change.
  const handlersRef = useRef(handlers);
  const onUnknownRef = useRef(onUnknown);
  useEffect(() => {
    handlersRef.current = handlers;
    onUnknownRef.current = onUnknown;
  }, [handlers, onUnknown]);

  const rawSend = useCallback((msg: Teammate3Message): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
      return true;
    }
    console.warn("[teammate3] channel not open; message not sent:", msg.type);
    return false;
  }, []);

  // Public send: stamp routing fields (from teammate4 -> teammate3).
  const send = useCallback(
    (msg: Teammate3Message): boolean => {
      const stamped: Teammate3Message = {
        ...msg,
        from: msg.from ?? ME,
        to: msg.to ?? PEER,
        timestamp: msg.timestamp ?? new Date().toISOString(),
      };
      return rawSend(stamped);
    },
    [rawSend]
  );

  // Identify an incoming message and route it to the right handler.
  const route = useCallback(
    async (msg: Teammate3BaseMessage) => {
      // Ignore messages we ourselves sent (echoed) or addressed to the peer.
      if (msg.from === ME) return;
      if (onlyForMe && msg.to && msg.to !== ME) return;

      setLastMessage(msg);

      const handler = handlersRef.current?.[msg.type];
      if (handler) {
        const reply = await handler(msg);
        if (reply) send(reply);
      } else {
        onUnknownRef.current?.(msg);
      }
    },
    [onlyForMe, send]
  );

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    try {
      const ws = new WebSocket(BASE_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        attemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          return; // ignore non-JSON
        }
        if (isTeammate3Message(parsed)) {
          void route(parsed);
        }
      };

      ws.onerror = () => setStatus("error");

      ws.onclose = () => {
        setStatus("disconnected");
        wsRef.current = null;
        const delay = Math.min(1000 * Math.pow(2, attemptsRef.current), 30000);
        attemptsRef.current += 1;
        reconnectRef.current = setTimeout(connect, delay);
      };
    } catch {
      setStatus("error");
    }
  }, [route]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return { status, send, lastMessage };
}
