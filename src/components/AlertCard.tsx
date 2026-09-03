"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle,
  Clock,
  Brain,
  ChevronRight,
  X,
  Calendar,
  Shield,
  Hash
} from "lucide-react";
import { DashboardAlert } from "@/types/alerts";
import { useNow } from "@/hooks/useNow";

interface AlertCardProps {
  alert: DashboardAlert;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
  index?: number;
}

export function AlertCard({ alert, onAcknowledge, onDismiss, index = 0 }: AlertCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [mounted, setMounted] = useState(false);
  const now = useNow(); // ticks every 30s so "Xm ago" stays fresh

  // Portal target is only available on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  const getSeverityConfig = () => {
    switch (alert.severity) {
      case "critical":
        return {
          icon: AlertCircle,
          color: "#ef4444",
          bg: "bg-[#ef4444]/10",
          border: "border-l-[#ef4444]",
          badge: "bg-[#ef4444] text-white",
          glow: "shadow-[#ef4444]/20",
        };
      case "high":
        return {
          icon: AlertTriangle,
          color: "#f59e0b",
          bg: "bg-[#f59e0b]/10",
          border: "border-l-[#f59e0b]",
          badge: "bg-[#f59e0b] text-white",
          glow: "shadow-[#f59e0b]/20",
        };
      case "medium":
        return {
          icon: Info,
          color: "#a78bfa",
          bg: "bg-[#a78bfa]/10",
          border: "border-l-[#a78bfa]",
          badge: "bg-[#a78bfa] text-white",
          glow: "shadow-[#a78bfa]/20",
        };
      case "low":
      default:
        return {
          icon: Info,
          color: "#3b82f6",
          bg: "bg-[#3b82f6]/10",
          border: "border-l-[#3b82f6]",
          badge: "bg-[#3b82f6] text-white",
          glow: "shadow-[#3b82f6]/20",
        };
    }
  };

  const config = getSeverityConfig();
  const Icon = config.icon;

  const formatTime = (date: Date) => {
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  };

  return (
    <>
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => setShowDetails(true)}
      className={`
        relative overflow-hidden rounded-xl border-l-4 cursor-pointer
        ${config.border}
        bg-[var(--card-bg)] border border-[var(--card-border)]
        ${!alert.acknowledged ? `shadow-lg ${config.glow}` : ""}
        transition-transform duration-200 hover:scale-[1.01]
      `}
    >
      <div className="p-3">
        {/* Top row: icon + badges + dismiss (single line, no overlap) */}
        <div className="flex items-center gap-2 mb-2">
          {/* Icon */}
          <motion.div
            className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}
            animate={!alert.acknowledged && alert.severity === "critical" ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Icon className="w-4 h-4" style={{ color: config.color }} />
          </motion.div>

          {/* Severity badge */}
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${config.badge}`}>
            {alert.severity}
          </span>

          {/* Time */}
          <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
            <Clock className="w-3 h-3" />
            {formatTime(alert.timestamp)}
          </span>

          {/* Acknowledged pill */}
          {alert.acknowledged && (
            <span className="flex items-center gap-0.5 text-[11px] text-[#22c55e]">
              <CheckCircle className="w-3 h-3" />
            </span>
          )}

          {/* Dismiss - pushed to far right */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); onDismiss(alert.id); }}
            className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Message */}
        <p className="text-sm font-medium text-[var(--text-primary)] mb-2 line-clamp-2 leading-snug">
          {alert.message}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!alert.acknowledged && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => { e.stopPropagation(); onAcknowledge(alert.id); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#c8ff00] text-[#1a1d29] text-[11px] font-semibold hover:bg-[#b8ef00] transition-colors"
            >
              <CheckCircle className="w-3 h-3" />
              Acknowledge
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={(e) => { e.stopPropagation(); setShowDetails(true); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-[11px] font-medium hover:bg-[var(--bg-hover)] transition-colors"
          >
            View Details
            <ChevronRight className="w-3 h-3" />
          </motion.button>
        </div>
      </div>

      {/* Unread indicator */}
      {!alert.acknowledged && (
        <motion.div
          className="absolute top-0 right-0 w-2 h-2 m-2 rounded-full"
          style={{ backgroundColor: config.color }}
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      </motion.div>

      {/* Details Modal - rendered via portal to document.body so it lives
          OUTSIDE the card's animated tree (prevents layout glitch/flicker) */}
      {mounted && createPortal(
        <AnimatePresence>
          {showDetails && (
            <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetails(false)}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            />

            {/* Modal - centered in the middle of the page */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg z-[60]"
            >
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className={`relative p-5 border-b border-[var(--border-primary)] ${config.bg}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${config.color}20` }}>
                      <Icon className="w-6 h-6" style={{ color: config.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${config.badge}`}>
                          {alert.severity}
                        </span>
                        {alert.acknowledged ? (
                          <span className="flex items-center gap-1 text-xs text-[#22c55e]">
                            <CheckCircle className="w-3 h-3" /> Acknowledged
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs" style={{ color: config.color }}>
                            <AlertCircle className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)]">Alert Details</h3>
                    </div>
                    <motion.button
                      onClick={() => setShowDetails(false)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-10 h-10 rounded-xl bg-[var(--card-bg)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                  {/* Message */}
                  <div>
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Message</p>
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed">{alert.message}</p>
                  </div>

                  {/* AI Reasoning */}
                  {alert.reasoning_trace && (
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Brain className="w-3.5 h-3.5 text-[#c8ff00]" />
                        AI Reasoning
                      </p>
                      <div className="p-3 rounded-xl bg-[var(--bg-tertiary)]">
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{alert.reasoning_trace}</p>
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="grid grid-cols-1 gap-3 pt-2">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]">
                      <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">Time</p>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {new Date(alert.timestamp).toLocaleString("en-US", {
                            weekday: "short", month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]">
                      <Shield className="w-4 h-4 text-[var(--text-muted)]" />
                      <div>
                        <p className="text-xs text-[var(--text-muted)]">Severity Level</p>
                        <p className="text-sm font-medium capitalize text-[var(--text-primary)]">{alert.severity}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]">
                      <Hash className="w-4 h-4 text-[var(--text-muted)]" />
                      <div className="min-w-0">
                        <p className="text-xs text-[var(--text-muted)]">Alert ID</p>
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate font-mono">{alert.id}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-[var(--border-primary)] flex gap-3">
                  {!alert.acknowledged && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onAcknowledge(alert.id);
                        setShowDetails(false);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#c8ff00] text-[#1a1d29] text-sm font-semibold"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Acknowledge
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onDismiss(alert.id);
                      setShowDetails(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm font-medium border border-[var(--border-primary)] hover:border-[#ef4444]/50 hover:text-[#ef4444] transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Dismiss Alert
                  </motion.button>
                </div>
              </div>
            </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
