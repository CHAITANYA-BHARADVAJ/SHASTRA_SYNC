"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  X, 
  Phone, 
  AlertTriangle, 
  MessageCircle,
  Video,
  MapPin
} from "lucide-react";

interface FloatingActionButtonProps {
  onEmergency: () => void;
  onCall: () => void;
  onMessage: () => void;
  onVideo?: () => void;
}

export function FloatingActionButton({ onEmergency, onCall, onMessage, onVideo }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { 
      icon: Phone, 
      label: "Call", 
      color: "#22c55e",
      bg: "bg-[#22c55e]",
      onClick: onCall 
    },
    { 
      icon: Video, 
      label: "Video", 
      color: "#a78bfa",
      bg: "bg-[#a78bfa]",
      onClick: onVideo || (() => {}) 
    },
    { 
      icon: MessageCircle, 
      label: "Message", 
      color: "#3b82f6",
      bg: "bg-[#3b82f6]",
      onClick: onMessage 
    },
    { 
      icon: AlertTriangle, 
      label: "Emergency", 
      color: "#ef4444",
      bg: "bg-[#ef4444]",
      onClick: onEmergency 
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Action buttons */}
            <div className="absolute bottom-16 right-0 flex flex-col-reverse gap-3">
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.label}
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.8 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    {/* Label */}
                    <motion.button
                      onClick={() => {
                        action.onClick();
                        setIsOpen(false);
                      }}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: index * 0.05 + 0.1 }}
                      whileHover={{ scale: 1.05, x: -2 }}
                      whileTap={{ scale: 0.97 }}
                      className="px-3 py-1.5 rounded-lg bg-[var(--card-bg)] text-sm font-medium text-[var(--text-primary)] shadow-lg border border-[var(--border-primary)] hover:border-current transition-colors cursor-pointer"
                      style={{ color: undefined }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = action.color; e.currentTarget.style.color = action.color; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = ""; e.currentTarget.style.color = ""; }}
                    >
                      {action.label}
                    </motion.button>

                    {/* Button */}
                    <motion.button
                      whileHover={{ scale: 1.15, rotate: 8 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        action.onClick();
                        setIsOpen(false);
                      }}
                      className={`
                        w-12 h-12 rounded-xl ${action.bg} 
                        flex items-center justify-center
                        shadow-lg text-white
                        transition-shadow hover:shadow-2xl
                      `}
                      style={{ boxShadow: `0 4px 20px ${action.color}40` }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 6px 30px ${action.color}80`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 4px 20px ${action.color}40`; }}
                    >
                      <Icon className="w-5 h-5" />
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
        className={`
          relative w-14 h-14 rounded-2xl
          ${isOpen ? "bg-[var(--bg-tertiary)] border border-[var(--border-primary)]" : "bg-[#c8ff00]"}
          flex items-center justify-center
          shadow-xl
          transition-colors duration-200
        `}
        style={{ 
          boxShadow: isOpen ? "var(--shadow-lg)" : "0 4px 30px rgba(200, 255, 0, 0.4)" 
        }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-[var(--text-primary)]" />
        ) : (
          <Plus className="w-6 h-6 text-[#1a1d29]" />
        )}
      </motion.button>
    </div>
  );
}
