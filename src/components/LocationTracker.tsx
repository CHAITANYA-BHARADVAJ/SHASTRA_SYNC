"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  MapPin, 
  Navigation,
  Home,
  Clock,
  Shield,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Phone
} from "lucide-react";

interface LocationTrackerProps {
  isOpen: boolean;
  onClose: () => void;
  elderName: string;
  elderAddress: string;
  onToast: (type: "success" | "error", title: string, message?: string) => void;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  lastUpdated: Date;
  status: "home" | "nearby" | "away" | "unknown";
  battery: number;
}

export function LocationTracker({ isOpen, onClose, elderName, elderAddress, onToast }: LocationTrackerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [location, setLocation] = useState<LocationData | null>(null);

  const firstName = elderName.split(" ")[0];

  // Simulate fetching location data
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setLocation({
          latitude: 13.0827,
          longitude: 80.2707,
          address: elderAddress,
          lastUpdated: new Date(),
          status: "home",
          battery: 78,
        });
        setIsLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, elderAddress]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setLocation(prev => prev ? { ...prev, lastUpdated: new Date() } : null);
      setIsLoading(false);
      onToast("success", "Location Updated", "Location data has been refreshed");
    }, 1000);
  };

  const handleOpenMaps = () => {
    if (location) {
      const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
      window.open(url, "_blank");
    }
  };

  const handleGetDirections = () => {
    if (location) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
      window.open(url, "_blank");
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "home":
        return { color: "#22c55e", bg: "bg-[#22c55e]/10", text: "At Home", icon: Home };
      case "nearby":
        return { color: "#f59e0b", bg: "bg-[#f59e0b]/10", text: "Nearby", icon: MapPin };
      case "away":
        return { color: "#a78bfa", bg: "bg-[#a78bfa]/10", text: "Away", icon: Navigation };
      default:
        return { color: "#6b7280", bg: "bg-[#6b7280]/10", text: "Unknown", icon: AlertTriangle };
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-50"
          >
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative p-5 border-b border-[var(--border-primary)] bg-gradient-to-r from-[#3b82f6]/10 to-[#22c55e]/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#22c55e] flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">
                      {firstName}&apos;s Location
                    </h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      Real-time tracking
                    </p>
                  </div>
                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-12 h-12 rounded-full border-3 border-[#3b82f6] border-t-transparent mb-4"
                    />
                    <p className="text-[var(--text-muted)]">Fetching location...</p>
                  </div>
                ) : location ? (
                  <>
                    {/* Map Placeholder */}
                    <div className="relative h-48 rounded-2xl bg-[var(--bg-tertiary)] overflow-hidden mb-4">
                      {/* Simulated map background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[#1a2e1a] to-[#2a3f2a] opacity-50" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-16 h-16 mx-auto mb-2 rounded-full bg-[#22c55e]/20 flex items-center justify-center"
                          >
                            <div className="w-8 h-8 rounded-full bg-[#22c55e] flex items-center justify-center">
                              <MapPin className="w-4 h-4 text-white" />
                            </div>
                          </motion.div>
                          <p className="text-sm text-[var(--text-muted)]">Chennai, Tamil Nadu</p>
                        </div>
                      </div>
                      
                      {/* Open in Maps button */}
                      <motion.button
                        onClick={handleOpenMaps}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--card-bg)] text-xs font-medium text-[var(--text-primary)] shadow-lg"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open in Maps
                      </motion.button>
                    </div>

                    {/* Status Card */}
                    {(() => {
                      const statusConfig = getStatusConfig(location.status);
                      const StatusIcon = statusConfig.icon;
                      return (
                        <div className={`p-4 rounded-2xl ${statusConfig.bg} mb-4`}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--card-bg)] flex items-center justify-center">
                              <StatusIcon className="w-5 h-5" style={{ color: statusConfig.color }} />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-[var(--text-primary)]">{statusConfig.text}</p>
                              <p className="text-sm text-[var(--text-muted)]">{location.address}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                                <Clock className="w-3 h-3" />
                                {formatTime(location.lastUpdated)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-[var(--bg-tertiary)]">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Device Battery</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-[var(--bg-sunken)] rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-[#22c55e]"
                              style={{ width: `${location.battery}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-[var(--text-primary)]">{location.battery}%</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-[var(--bg-tertiary)]">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Safety Zone</p>
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-[#22c55e]" />
                          <span className="text-sm font-semibold text-[#22c55e]">Within Zone</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <motion.button
                        onClick={handleRefresh}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-medium border border-[var(--border-primary)] hover:border-[#3b82f6]/50 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                      </motion.button>
                      <motion.button
                        onClick={handleGetDirections}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3b82f6] text-white font-semibold shadow-lg shadow-[#3b82f6]/25"
                      >
                        <Navigation className="w-4 h-4" />
                        Get Directions
                      </motion.button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-[#f59e0b]" />
                    <p className="text-[var(--text-primary)] font-medium">Unable to fetch location</p>
                    <p className="text-sm text-[var(--text-muted)]">Please try again later</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
