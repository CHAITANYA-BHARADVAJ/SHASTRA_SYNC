"use client";

import { motion } from "framer-motion";
import { 
  Shield, 
  AlertTriangle, 
  AlertCircle, 
  WifiOff,
  Sparkles,
  Bell
} from "lucide-react";

interface StatusBannerProps {
  status: "safe" | "attention" | "alert" | "critical" | "disconnected";
  elderName: string;
  unacknowledgedCount: number;
  connectionStatus: "connected" | "connecting" | "disconnected" | "error";
}

export function StatusBanner({ status, elderName, unacknowledgedCount, connectionStatus }: StatusBannerProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "safe":
        return {
          icon: Shield,
          title: `${elderName} is safe`,
          subtitle: "All vitals normal • No alerts",
          gradient: "from-[#22c55e]/10 via-[#22c55e]/5 to-transparent",
          borderColor: "border-[#22c55e]/20",
          iconBg: "bg-[#22c55e]",
          iconColor: "text-white",
          accentColor: "#22c55e",
          pulse: false,
        };
      case "attention":
        return {
          icon: Bell,
          title: `${unacknowledgedCount} alert${unacknowledgedCount > 1 ? "s" : ""} need attention`,
          subtitle: `Check ${elderName}'s status`,
          gradient: "from-[#f59e0b]/10 via-[#f59e0b]/5 to-transparent",
          borderColor: "border-[#f59e0b]/20",
          iconBg: "bg-[#f59e0b]",
          iconColor: "text-white",
          accentColor: "#f59e0b",
          pulse: true,
        };
      case "alert":
        return {
          icon: AlertTriangle,
          title: "Immediate attention required",
          subtitle: `${elderName} may need assistance`,
          gradient: "from-[#ef4444]/10 via-[#ef4444]/5 to-transparent",
          borderColor: "border-[#ef4444]/20",
          iconBg: "bg-[#ef4444]",
          iconColor: "text-white",
          accentColor: "#ef4444",
          pulse: true,
        };
      case "critical":
        return {
          icon: AlertCircle,
          title: "CRITICAL ALERT",
          subtitle: `Emergency situation detected for ${elderName}`,
          gradient: "from-[#ef4444]/20 via-[#ef4444]/10 to-transparent",
          borderColor: "border-[#ef4444]/40",
          iconBg: "bg-[#ef4444]",
          iconColor: "text-white",
          accentColor: "#ef4444",
          pulse: true,
        };
      case "disconnected":
        return {
          icon: WifiOff,
          title: "Connection lost",
          subtitle: "Attempting to reconnect...",
          gradient: "from-[var(--bg-tertiary)] to-transparent",
          borderColor: "border-[var(--border-primary)]",
          iconBg: "bg-[var(--bg-sunken)]",
          iconColor: "text-[var(--text-muted)]",
          accentColor: "var(--text-muted)",
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative overflow-hidden rounded-2xl border
        bg-gradient-to-r ${config.gradient}
        ${config.borderColor}
        p-4
      `}
    >
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-30" 
        style={{ background: config.accentColor }} 
      />
      
      <div className="relative flex items-center gap-4">
        {/* Icon */}
        <motion.div
          className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center shadow-lg`}
          animate={config.pulse ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={config.pulse ? { boxShadow: `0 0 20px ${config.accentColor}40` } : {}}
        >
          <Icon className={`w-6 h-6 ${config.iconColor}`} />
        </motion.div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {config.title}
            </h2>
            {status === "safe" && (
              <Sparkles className="w-4 h-4 text-[#c8ff00]" />
            )}
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            {config.subtitle}
          </p>
        </div>

        {/* Status indicator */}
        {status !== "disconnected" && (
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border-primary)]">
            <span 
              className={`w-2 h-2 rounded-full ${config.pulse ? "animate-pulse" : ""}`}
              style={{ backgroundColor: config.accentColor }}
            />
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              {connectionStatus === "connected" ? "Live" : "Offline"}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
