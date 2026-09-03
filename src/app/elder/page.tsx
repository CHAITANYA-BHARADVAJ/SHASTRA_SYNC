"use client";

import { useCallback, useState } from "react";
import { Phone } from "lucide-react";
import { IncomingCall } from "@/components/IncomingCall";
import { useCallRelay } from "@/hooks/useCallRelay";
import { CallInvite, CallResponse } from "@/types/alerts";

/**
 * Elder Dashboard (/elder)
 * A lightweight screen for the elder's device. It connects to the call
 * signaling relay and rings when a CallInvite arrives from the family.
 */
export default function ElderDashboardPage() {
  const [incomingCall, setIncomingCall] = useState<CallInvite | null>(null);
  const [lastCallText, setLastCallText] = useState<string | null>(null);

  const handleRelayMessage = useCallback((msg: CallInvite | CallResponse) => {
    if (msg.type === "CallInvite") {
      setIncomingCall(msg);
    }
  }, []);

  const { send } = useCallRelay({ onMessage: handleRelayMessage });

  const respond = useCallback(
    (call: CallInvite, response: "accepted" | "declined") => {
      const reply: CallResponse = {
        type: "CallResponse",
        call_id: call.call_id,
        elder_id: call.elder_id,
        response,
        timestamp: new Date().toISOString(),
      };
      send(reply);
      setIncomingCall(null);
      setLastCallText(
        response === "accepted"
          ? `You accepted a ${call.call_type} call from ${call.caller_name || "Family"}.`
          : `You declined a ${call.call_type} call from ${call.caller_name || "Family"}.`
      );
    },
    [send]
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-6 bg-[#0b1120] text-white">
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
