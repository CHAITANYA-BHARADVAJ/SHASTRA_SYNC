"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Video, PhoneOff } from "lucide-react";
import { CallInvite } from "@/types/alerts";

interface IncomingCallProps {
  call: CallInvite | null;
  soundEnabled?: boolean;
  volume?: number;
  onAccept: (call: CallInvite) => void;
  onDecline: (call: CallInvite) => void;
}

/**
 * Full-screen incoming-call banner shown on the elder dashboard.
 * Notification-only: it rings and shows Accept/Decline. No media stream.
 */
export function IncomingCall({ call, soundEnabled = true, volume = 0.7, onAccept, onDecline }: IncomingCallProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Play a looping "ring-ring" tone while a call is incoming.
  useEffect(() => {
    if (!call || !soundEnabled) return;
    if (typeof window === "undefined") return;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    // One classic double-ring (two short warble bursts).
    const playRing = () => {
      const now = ctx.currentTime;
      const burst = (start: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        // Warble between two tones like a phone ring
        osc.frequency.setValueAtTime(480, start);
        osc.frequency.setValueAtTime(620, start + 0.2);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume * 0.5, start + 0.02);
        gain.gain.setValueAtTime(volume * 0.5, start + 0.38);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
        osc.start(start);
        osc.stop(start + 0.42);
      };
      burst(now);
      burst(now + 0.5);
    };

    playRing();
    ringIntervalRef.current = setInterval(playRing, 2500);

    return () => {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    };
  }, [call, soundEnabled, volume]);

  const isVideo = call?.call_type === "video";

  return (
    <AnimatePresence>
      {call && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="w-full max-w-sm p-8 rounded-3xl bg-[var(--card-bg,#111827)] border border-[var(--card-border,#1f2937)] shadow-2xl text-center"
          >
            {/* Pulsing avatar with call-type icon */}
            <div className="relative mx-auto mb-6 w-24 h-24">
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{ background: isVideo ? "#a78bfa" : "#22c55e", opacity: 0.25 }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.25, 0, 0.25] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
              <div
                className="relative flex items-center justify-center w-24 h-24 rounded-full"
                style={{ background: isVideo ? "rgba(167,139,250,0.15)" : "rgba(34,197,94,0.15)" }}
              >
                {isVideo ? (
                  <Video className="w-10 h-10" style={{ color: "#a78bfa" }} />
                ) : (
                  <Phone className="w-10 h-10" style={{ color: "#22c55e" }} />
                )}
              </div>
            </div>

            <p className="text-xs uppercase tracking-widest text-[var(--text-muted,#9ca3af)] mb-1">
              Incoming {isVideo ? "video call" : "call"}
            </p>
            <h2 className="text-2xl font-bold text-[var(--text-primary,#f9fafb)] mb-8">
              {call.caller_name || "Family"}
            </h2>

            {/* Accept / Decline */}
            <div className="flex items-center justify-center gap-10">
              <div className="flex flex-col items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => onDecline(call)}
                  aria-label="Decline call"
                  className="flex items-center justify-center w-16 h-16 rounded-full bg-[#ef4444] text-white shadow-lg shadow-[#ef4444]/30"
                >
                  <PhoneOff className="w-7 h-7" />
                </motion.button>
                <span className="text-xs text-[var(--text-muted,#9ca3af)]">Decline</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => onAccept(call)}
                  aria-label="Accept call"
                  className="flex items-center justify-center w-16 h-16 rounded-full bg-[#22c55e] text-white shadow-lg shadow-[#22c55e]/30"
                >
                  {isVideo ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
                </motion.button>
                <span className="text-xs text-[var(--text-muted,#9ca3af)]">Accept</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
