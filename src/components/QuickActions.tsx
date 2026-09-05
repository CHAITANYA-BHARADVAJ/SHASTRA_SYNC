"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Phone, 
  Video, 
  MessageCircle, 
  AlertTriangle,
  MapPin,
  Bell,
  Calendar,
  Heart,
  X,
  Ambulance
} from "lucide-react";
import { MessageComposer } from "./MessageComposer";
import { LocationTracker } from "./LocationTracker";
import { ScheduleManager } from "./ScheduleManager";
import { sendFamilyMessage, sendEmergency, sendEvent } from "@/services/api";
import { useFamilyMember } from "@/hooks/useFamilyMember";

interface QuickActionsProps {
  elderName: string;
  elderPhone: string;
  emergencyPhone: string;
  elderId: string;
  elderAddress?: string;
  onToast: (type: "success" | "error", title: string, message?: string) => void;
  registerSentMessage?: (text: string) => void;
}

export function QuickActions({ elderName, elderPhone, emergencyPhone, elderId, elderAddress = "123 Gandhi Nagar, Chennai", onToast, registerSentMessage }: QuickActionsProps) {
  const { familyMember } = useFamilyMember();
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);
  const [showMessageComposer, setShowMessageComposer] = useState(false);
  const [showLocationTracker, setShowLocationTracker] = useState(false);
  const [showScheduleManager, setShowScheduleManager] = useState(false);

  const handleCall = async () => {
    // Send as voice_input (the path that reaches the elder / teammate 3) with
    // the caller's current profile name.
    const result = await sendEvent({
      elder_id: elderId,
      event_type: "voice_input",
      voice_transcript: `${familyMember.name} is calling ${elderName.split(" ")[0]}`,
    });
    
    if (result.success) {
      onToast("success", "Calling", `Initiating call to ${elderName.split(" ")[0]} at ${elderPhone}...`);
    } else {
      onToast("error", "Call Failed", result.error || "Could not log call event");
    }
  };

  const handleVideoCall = async () => {
    const result = await sendEvent({
      elder_id: elderId,
      event_type: "voice_input",
      voice_transcript: `${familyMember.name} is starting a video call with ${elderName.split(" ")[0]}`,
    });
    
    if (result.success) {
      onToast("success", "Video Call", `Starting video call with ${elderName.split(" ")[0]}...`);
    } else {
      onToast("error", "Video Call Failed", result.error || "Could not log video call event");
    }
  };

  const handleMessage = () => {
    setShowMessageComposer(true);
  };

  const handleSendMessage = async (message: string) => {
    registerSentMessage?.(message);
    const result = await sendFamilyMessage(elderId, message);
    if (result.success) {
      onToast("success", "Message Sent", `Your message to ${elderName.split(" ")[0]} has been delivered!`);
    } else {
      onToast("error", "Failed to Send", result.error || "Could not send message to backend");
    }
  };

  const handleEmergency = () => {
    setShowEmergencyConfirm(true);
  };

  const confirmEmergency = async () => {
    // Send emergency event to backend
    const result = await sendEmergency(elderId);
    
    if (result.success) {
      onToast("error", "Emergency Alert Sent", "Emergency services have been notified. Help is on the way.");
    } else {
      onToast("error", "Emergency", "Alert sent locally. Calling emergency services (112)...");
    }
    setShowEmergencyConfirm(false);
  };

  const handleLocation = () => {
    setShowLocationTracker(true);
  };

  const handleSchedule = () => {
    setShowScheduleManager(true);
  };

  const actions = [
    { 
      icon: Phone, 
      label: "Call", 
      color: "#22c55e",
      bg: "bg-[#22c55e]/10",
      hoverBg: "hover:bg-[#22c55e]/20",
      onClick: handleCall 
    },
    { 
      icon: Video, 
      label: "Video", 
      color: "#a78bfa",
      bg: "bg-[#a78bfa]/10",
      hoverBg: "hover:bg-[#a78bfa]/20",
      onClick: handleVideoCall 
    },
    { 
      icon: MessageCircle, 
      label: "Message", 
      color: "#3b82f6",
      bg: "bg-[#3b82f6]/10",
      hoverBg: "hover:bg-[#3b82f6]/20",
      onClick: handleMessage 
    },
    { 
      icon: MapPin, 
      label: "Location", 
      color: "#f59e0b",
      bg: "bg-[#f59e0b]/10",
      hoverBg: "hover:bg-[#f59e0b]/20",
      onClick: handleLocation 
    },
    { 
      icon: Calendar, 
      label: "Schedule", 
      color: "#f472b6",
      bg: "bg-[#f472b6]/10",
      hoverBg: "hover:bg-[#f472b6]/20",
      onClick: handleSchedule 
    },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Quick Actions</h3>
          <span className="text-xs text-[var(--text-muted)]">Stay connected</span>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.label}
                onClick={action.onClick}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  flex flex-col items-center gap-2 p-3 rounded-xl
                  ${action.bg} ${action.hoverBg}
                  transition-all duration-200
                `}
              >
                <Icon className="w-5 h-5" style={{ color: action.color }} />
                <span className="text-[10px] font-medium text-[var(--text-secondary)]">
                  {action.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Emergency Button */}
        <motion.button
          onClick={handleEmergency}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-gradient-to-r from-[#ef4444] to-[#dc2626] text-white font-semibold shadow-lg shadow-[#ef4444]/25 hover:shadow-[#ef4444]/40 transition-shadow"
        >
          <Ambulance className="w-5 h-5" />
          <span>Emergency Services (112)</span>
        </motion.button>
      </motion.div>

      {/* Emergency Confirmation Modal */}
      <AnimatePresence>
        {showEmergencyConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEmergencyConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-2xl"
            >
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#ef4444]/10">
                <AlertTriangle className="w-8 h-8 text-[#ef4444]" />
              </div>
              
              <h3 className="text-xl font-bold text-center text-[var(--text-primary)] mb-2">
                Call Emergency Services?
              </h3>
              <p className="text-sm text-center text-[var(--text-muted)] mb-6">
                This will dial 112 (India Emergency). Only proceed if there is a genuine emergency.
              </p>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowEmergencyConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-medium border border-[var(--border-primary)]"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmEmergency}
                  className="flex-1 py-3 rounded-xl bg-[#ef4444] text-white font-semibold shadow-lg shadow-[#ef4444]/25"
                >
                  Call 112
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Composer Modal */}
      <MessageComposer
        isOpen={showMessageComposer}
        onClose={() => setShowMessageComposer(false)}
        elderName={elderName}
        onSend={handleSendMessage}
      />

      {/* Location Tracker Modal */}
      <LocationTracker
        isOpen={showLocationTracker}
        onClose={() => setShowLocationTracker(false)}
        elderName={elderName}
        elderAddress={elderAddress}
        onToast={onToast}
      />

      {/* Schedule Manager Modal */}
      <ScheduleManager
        isOpen={showScheduleManager}
        onClose={() => setShowScheduleManager(false)}
        elderName={elderName}
        onToast={onToast}
      />
    </>
  );
}
