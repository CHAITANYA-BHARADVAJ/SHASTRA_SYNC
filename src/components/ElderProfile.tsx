"use client";

import { motion } from "framer-motion";
import { 
  Phone, 
  MapPin, 
  AlertCircle, 
  Pill,
  Heart,
  Shield,
  Clock,
  ChevronRight,
  Video,
  MessageCircle,
  MoreHorizontal,
  Sparkles
} from "lucide-react";
import { ElderProfile as ElderProfileType } from "@/types/alerts";

interface ElderProfileProps {
  profile: ElderProfileType;
  onCall?: () => void;
  onVideo?: () => void;
  onMessage?: () => void;
  onLocationClick?: () => void;
  onEmergencyContactClick?: () => void;
  onMoreClick?: () => void;
}

export function ElderProfile({
  profile,
  onCall,
  onVideo,
  onMessage,
  onLocationClick,
  onEmergencyContactClick,
  onMoreClick,
}: ElderProfileProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "safe":
        return { 
          color: "#22c55e", 
          bg: "bg-[#22c55e]/10", 
          text: "All Clear",
          icon: Shield,
          pulse: false
        };
      case "attention":
        return { 
          color: "#f59e0b", 
          bg: "bg-[#f59e0b]/10", 
          text: "Attention",
          icon: AlertCircle,
          pulse: true
        };
      case "alert":
        return { 
          color: "#ef4444", 
          bg: "bg-[#ef4444]/10", 
          text: "Alert",
          icon: AlertCircle,
          pulse: true
        };
      case "critical":
        return { 
          color: "#ef4444", 
          bg: "bg-[#ef4444]/10", 
          text: "Critical",
          icon: AlertCircle,
          pulse: true
        };
      default:
        return { 
          color: "#22c55e", 
          bg: "bg-[#22c55e]/10", 
          text: "Unknown",
          icon: Shield,
          pulse: false
        };
    }
  };

  const statusConfig = getStatusConfig(profile.status);
  const StatusIcon = statusConfig.icon;

  const formatLastSeen = () => {
    const diff = Date.now() - new Date(profile.lastCheckIn).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden"
    >
      {/* Header with gradient background */}
      <div className="relative h-16 sm:h-24 bg-gradient-to-br from-[#c8ff00]/20 via-[#a78bfa]/10 to-[#c8ff00]/5">
        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-[#c8ff00]/20 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-1/4 w-16 h-16 bg-[#a78bfa]/20 rounded-full blur-2xl" />
        
        {/* More options */}
        <motion.button
          onClick={onMoreClick}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-[var(--card-bg)]/80 backdrop-blur-sm flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Profile Content */}
      <div className="px-4 sm:px-6 pb-5 sm:pb-6">
        {/* Avatar - positioned to overlap header */}
        <div className="relative -mt-9 sm:-mt-12 mb-3 sm:mb-4">
          <motion.div 
            className="relative inline-block"
            whileHover={{ scale: 1.05 }}
          >
            {/* Avatar ring */}
            <div className="p-1 rounded-2xl bg-gradient-to-br from-[#c8ff00] to-[#a78bfa]">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl bg-[var(--card-bg)] flex items-center justify-center overflow-hidden">
                {profile.photo ? (
                  <img 
                    src={profile.photo} 
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg sm:text-2xl font-bold text-gradient">
                    {getInitials(profile.name)}
                  </span>
                )}
              </div>
            </div>
            
            {/* Status indicator */}
            <motion.div
              className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-lg ${statusConfig.bg} border-2 border-[var(--card-bg)] flex items-center justify-center`}
              animate={statusConfig.pulse ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <StatusIcon className="w-3.5 h-3.5" style={{ color: statusConfig.color }} />
            </motion.div>
          </motion.div>
        </div>

        {/* Name & Status */}
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">{profile.name}</h2>
            <span className="text-sm text-[var(--text-muted)]">• {profile.age} yrs</span>
          </div>
          
          <div className="flex items-center gap-3">
            <span 
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${statusConfig.bg}`}
              style={{ color: statusConfig.color }}
            >
              <span 
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: statusConfig.color }}
              />
              {statusConfig.text}
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Clock className="w-3 h-3" />
              Active {formatLastSeen()}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-4 sm:mb-5">
          <motion.button
            onClick={onCall}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#c8ff00] text-[#1a1d29] font-semibold text-sm shadow-lg shadow-[#c8ff00]/20"
          >
            <Phone className="w-4 h-4" />
            Call
          </motion.button>
          <motion.button
            onClick={onVideo}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-medium text-sm border border-[var(--border-primary)] hover:border-[#a78bfa]/50"
          >
            <Video className="w-4 h-4" />
            Video
          </motion.button>
          <motion.button
            onClick={onMessage}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-11 flex items-center justify-center rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-primary)] hover:border-[#a78bfa]/50"
          >
            <MessageCircle className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Info Cards */}
        <div className="space-y-3">
          {/* Location */}
          <motion.div 
            onClick={onLocationClick}
            className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group"
            whileHover={{ x: 4 }}
          >
            <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#3b82f6]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--text-muted)] mb-0.5">Location</p>
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{profile.address}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
          </motion.div>

          {/* Emergency Contact */}
          <motion.div 
            onClick={onEmergencyContactClick}
            className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group"
            whileHover={{ x: 4 }}
          >
            <div className="w-10 h-10 rounded-xl bg-[#ef4444]/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-[#ef4444]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--text-muted)] mb-0.5">Emergency Contact</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {profile.emergencyContact} • {profile.emergencyPhone}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
          </motion.div>

          {/* Medical Conditions */}
          <motion.div 
            className="p-3 rounded-xl bg-[var(--bg-tertiary)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-[#f472b6]" />
              <p className="text-xs font-medium text-[var(--text-muted)]">Medical Conditions</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.medicalConditions.map((condition, index) => (
                <motion.span
                  key={condition}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className="px-2.5 py-1 rounded-lg bg-[#f472b6]/10 text-[#f472b6] text-xs font-medium"
                >
                  {condition}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Medications */}
          <motion.div 
            className="p-3 rounded-xl bg-[var(--bg-tertiary)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Pill className="w-4 h-4 text-[#a78bfa]" />
              <p className="text-xs font-medium text-[var(--text-muted)]">Current Medications</p>
              <span className="ml-auto flex items-center gap-1 text-[10px] text-[#c8ff00]">
                <Sparkles className="w-3 h-3" />
                AI Tracked
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.medications.map((med, index) => (
                <motion.span
                  key={med}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className="px-2.5 py-1 rounded-lg bg-[#a78bfa]/10 text-[#a78bfa] text-xs font-medium"
                >
                  {med}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
