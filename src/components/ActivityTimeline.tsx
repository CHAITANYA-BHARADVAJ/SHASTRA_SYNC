"use client";

import { motion } from "framer-motion";
import { 
  Activity as ActivityIcon,
  Footprints,
  Pill,
  Heart,
  MessageCircle,
  AlertTriangle,
  Clock,
  MoreHorizontal
} from "lucide-react";
import { ActivityEvent } from "@/types/alerts";
import { useNow } from "@/hooks/useNow";

interface ActivityTimelineProps {
  activities: ActivityEvent[];
  maxItems?: number;
}

export function ActivityTimeline({ activities, maxItems = 8 }: ActivityTimelineProps) {
  const now = useNow(); // ticks every 30s so relative times stay fresh

  const getActivityConfig = (type: string, severity?: string) => {
    switch (type) {
      case "fall":
        return { 
          icon: AlertTriangle, 
          color: "#ef4444",
          bg: "bg-[#ef4444]/10"
        };
      case "panic":
        return { 
          icon: AlertTriangle, 
          color: "#ef4444",
          bg: "bg-[#ef4444]/10"
        };
      case "medication":
        return { 
          icon: Pill, 
          color: "#a78bfa",
          bg: "bg-[#a78bfa]/10"
        };
      case "emotion":
        return { 
          icon: Heart, 
          color: "#f472b6",
          bg: "bg-[#f472b6]/10"
        };
      case "check_in":
        return { 
          icon: MessageCircle, 
          color: "#22c55e",
          bg: "bg-[#22c55e]/10"
        };
      case "alert":
        // Color alert icons by severity
        if (severity === "critical" || severity === "high") {
          return { icon: AlertTriangle, color: "#ef4444", bg: "bg-[#ef4444]/10" };
        }
        if (severity === "medium") {
          return { icon: AlertTriangle, color: "#f59e0b", bg: "bg-[#f59e0b]/10" };
        }
        return { icon: AlertTriangle, color: "#3b82f6", bg: "bg-[#3b82f6]/10" };
      case "normal":
        return { 
          icon: Footprints, 
          color: "#c8ff00",
          bg: "bg-[#c8ff00]/10"
        };
      default:
        return { 
          icon: ActivityIcon, 
          color: "#6b7280",
          bg: "bg-[#6b7280]/10"
        };
    }
  };

  const formatTime = (date: Date) => {
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours}h ago`;
    }
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const displayActivities = activities.slice(0, maxItems);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] flex items-center justify-center">
            <ActivityIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Activity Timeline</h3>
            <p className="text-xs text-[var(--text-muted)]">Recent activities</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Timeline */}
      {displayActivities.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center">
            <Clock className="w-6 h-6 text-[var(--text-muted)]" />
          </div>
          <p className="text-sm text-[var(--text-muted)]">No activities yet</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--border-primary)] via-[var(--border-primary)] to-transparent" />

          <div className="space-y-1">
            {displayActivities.map((activity, index) => {
              const config = getActivityConfig(activity.type, activity.severity);
              const Icon = config.icon;

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative flex items-start gap-4 p-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors group"
                >
                  {/* Icon */}
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className={`relative z-10 w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0 border-2 border-[var(--card-bg)]`}
                  >
                    <Icon className="w-5 h-5" style={{ color: config.color }} />
                  </motion.div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 py-1">
                    <p className="text-sm text-[var(--text-primary)] line-clamp-1">
                      {activity.description}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {formatTime(activity.timestamp)}
                    </p>
                  </div>

                  {/* Hover indicator */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* View all link */}
      {activities.length > maxItems && (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full mt-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          View all {activities.length} activities
        </motion.button>
      )}
    </motion.div>
  );
}
