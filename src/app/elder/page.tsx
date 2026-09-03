"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, Wifi, WifiOff } from "lucide-react";
import { IncomingCall } from "@/components/IncomingCall";
import { CallInvite, CallResponse, WebSocketMessage } from "@/types/alerts";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/alerts";

type Status = "connecting" | "connected" | "disconnected";

/**
 * Elder Dashboard (/elder)
 * A lightweight screen for the elder's device. It connects to the same
 * WebSocket the family dashboard uses and rings when a CallInvite arrives.
 */
export default function ElderDashboardPage() {
  const [status, setStatus] = useState<Status>("connecting");
  const [incomingCall, setIncomingCall] = useState<CallInvite | null>(null);
  const [lastCallText, setLastCallText] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);

  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const respond = useCallback(
    (call: CallInvite, response: "accepted" | "declined") => {
      const reply: CallResponse = {
        type: "CallResponse",
        call_id: call.call_id,
        elder_id: call.elder_id,
        response,
        timestamp: new Date().toISOString(),
      };
      sendMessage(reply);
      setIncomingCall(null);
      setLastCallText(
        response === "accepted"
          ? `You accepted a ${call.call_type} call from ${call.caller_name || "Family"}.`
          : `You declined a ${call.call_type} call from ${call.caller_name || "Family"}.`
      );
    },
    [sendMessage]
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setStatus("connecting");

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        attemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          if (data.type === "CallInvite") {
            setIncomingCall(data);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        setStatus("disconnected");
      };

      ws.onclose = () => {
        setStatus("disconnected");
        wsRef.current = null;
        const delay = Math.min(1000 * Math.pow(2, attemptsRef.current), 30000);
        attemptsRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };
    } catch {
      setStatus("disconnected");
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const statusMeta =
    status === "connected"
      ? { label: "Connected", color: "#22c55e", Icon: Wifi }
      : status === "connecting"
      ? { label: "Connecting…", color: "#f59e0b", Icon: Wifi }
      : { label: "Offline", color: "#ef4444", Icon: WifiOff };

  const StatusIcon = statusMeta.Icon;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-6 bg-[#0b1120] text-white">
      {/* Connection status */}
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
        style={{ background: "rgba(255,255,255,0.06)", color: statusMeta.color }}
      >
        <StatusIcon className="w-4 h-4" />
        <span>{statusMeta.label}</span>
      </div>

      {/* Idle state */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[#22c55e]/10">
          <Phone className="w-9 h-9 text-[#22c55e]" />
        </div>
        <h1 className="text-2xl font-bold">Elder Dashboard</h1>
        <p className="max-w-xs text-sm text-white/60">
          You&apos;ll see and hear a ring here whenever your family starts a call or video call.
        </p>
        {lastCallText && (
          <p className="mt-2 text-sm text-white/80 px-4 py-2 rounded-lg bg-white/5">{lastCallText}</p>
        )}
      </div>

      {/* Incoming call ringer */}
      <IncomingCall
        call={incomingCall}
        onAccept={(call) => respond(call, "accepted")}
        onDecline={(call) => respond(call, "declined")}
      />
    </main>
  );
}
