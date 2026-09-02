"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWebSocket, ConnectionStatus } from "@/hooks/useWebSocket";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/components/Toast";
import { ElderProfile as ElderProfileType } from "@/types/alerts";
import { Header } from "./Header";
import { StatusBanner } from "./StatusBanner";
import { ElderProfile } from "./ElderProfile";
import { QuickActions } from "./QuickActions";
import { ActivityTimeline } from "./ActivityTimeline";
import { AlertCard } from "./AlertCard";
import type { SeverityFilter, StatusFilter } from "./AlertFilters";
import { SettingsPanel } from "./SettingsPanel";
import { ProfilePanel } from "./ProfilePanel";
import { MessageComposer } from "./MessageComposer";
import { LocationTracker } from "./LocationTracker";
import { FloatingActionButton } from "./FloatingActionButton";
import { HealthVitals } from "./HealthVitals";
import { MedicationReminder } from "./MedicationReminder";
import { DailyCheckIn } from "./DailyCheckIn";
import { WeeklyActivityChart } from "./WeeklyActivityChart";
import { Bell, CheckCircle2, Trash2, Sparkles, Zap } from "lucide-react";
import { sendEmergency, sendEvent, sendFamilyMessage } from "@/services/api";

// Mock elder profile - in production this would come from API
const elderProfile: ElderProfileType = {
  id: "kamala_001",
  name: "Kamala Devi",
  age: 72,
  photo: "",
  address: "123 Gandhi Nagar, Chennai, TN 600001",
  phone: "+91 98765 43210",
  emergencyContact: "Priya (Daughter)",
  emergencyPhone: "+91 98765 12345",
  medicalConditions: ["Hypertension", "Mild Arthritis", "Diabetes Type 2"],
  medications: ["Metformin 500mg", "Amlodipine 5mg", "Aspirin 75mg"],
  lastCheckIn: new Date(Date.now() - 1000 * 60 * 15),
  status: "safe",
};

export function Dashboard() {
  const { settings, isLoaded } = useSettings();
  const { showToast } = useToast();
  const { 
    alerts, 
    activities,
    connectionStatus, 
    acknowledgeAlert,
    acknowledgeAll,
    clearAllAlerts, 
    clearAlert,
    reconnect,
    stats 
  } = useWebSocket(settings.soundEnabled, settings.soundVolume);

  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showProfileMessage, setShowProfileMessage] = useState(false);
  const [showProfileLocation, setShowProfileLocation] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState<{
    severity: SeverityFilter;
    status: StatusFilter;
    search: string;
  }>({
    severity: "all",
    status: "all",
    search: "",
  });

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (filters.severity !== "all" && alert.severity !== filters.severity) return false;
      if (filters.status === "unread" && alert.acknowledged) return false;
      if (filters.status === "acknowledged" && !alert.acknowledged) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          alert.message.toLowerCase().includes(searchLower) ||
          alert.reasoning_trace.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [alerts, filters]);

  // Determine overall status
  const getOverallStatus = (): "safe" | "attention" | "alert" | "critical" | "disconnected" => {
    if (connectionStatus !== "connected") return "disconnected";
    
    const unacknowledgedCritical = alerts.some((a) => !a.acknowledged && a.severity === "critical");
    const unacknowledgedHigh = alerts.some((a) => !a.acknowledged && a.severity === "high");
    const hasUnacknowledged = alerts.some((a) => !a.acknowledged);

    if (unacknowledgedCritical) return "critical";
    if (unacknowledgedHigh) return "alert";
    if (hasUnacknowledged) return "attention";
    return "safe";
  };

  const currentElderProfile = {
    ...elderProfile,
    status: getOverallStatus() === "disconnected" ? "safe" : getOverallStatus() as "safe" | "attention" | "alert" | "critical",
    lastCheckIn: activities[0]?.timestamp || elderProfile.lastCheckIn,
  };

  const overallStatus = getOverallStatus();

  // Handle acknowledge with toast
  const handleAcknowledge = (id: string) => {
    acknowledgeAlert(id);
    showToast({ type: "success", title: "Alert Acknowledged", message: "You've acknowledged this alert" });
  };

  // Handle acknowledge all with toast
  const handleAcknowledgeAll = () => {
    acknowledgeAll();
    showToast({ type: "success", title: "All Acknowledged", message: `${stats.unacknowledged} alerts marked as read` });
  };

  // Handle clear all with toast
  const handleClearAll = () => {
    clearAllAlerts();
    showToast({ type: "info", title: "Alerts Cleared", message: "All alerts have been removed" });
  };

  // Handle toast from quick actions
  const handleQuickActionToast = (type: "success" | "error", title: string, message?: string) => {
    showToast({ type, title, message });
  };

  // Show loading state until settings are loaded
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#c8ff00] to-[#a78bfa] flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Zap className="w-8 h-8 text-[#1a1d29]" />
          </motion.div>
          <p className="text-[var(--text-muted)]">Loading dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] transition-colors duration-300">
      {/* Critical Alert Screen Overlay */}
      <AnimatePresence>
        {overallStatus === "critical" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 border-4 border-[#ef4444] pointer-events-none z-50"
            style={{ animation: "pulse 1.5s ease-in-out infinite" }}
          />
        )}
      </AnimatePresence>

      {/* Background gradient mesh */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none opacity-50" />

      {/* Header */}
      <Header
        connectionStatus={connectionStatus}
        onReconnect={reconnect}
        onSettingsClick={() => setShowSettings(true)}
        unreadCount={stats.unacknowledged}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNotificationsClick={() => {
          if (stats.unacknowledged > 0) {
            showToast({ type: "info", title: "Notifications", message: `You have ${stats.unacknowledged} unread alert${stats.unacknowledged > 1 ? "s" : ""}` });
          } else {
            showToast({ type: "success", title: "All Caught Up", message: "No new notifications" });
          }
        }}
        onProfileClick={() => setShowProfile(true)}
        onNotificationPrefsClick={() => setShowSettings(true)}
        onSignOut={() => {
          showToast({ type: "info", title: "Signing Out", message: "You have been signed out successfully" });
        }}
      />

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Status Banner */}
        <StatusBanner
          status={overallStatus}
          elderName={elderProfile.name.split(" ")[0]}
          unacknowledgedCount={stats.unacknowledged}
          connectionStatus={connectionStatus}
        />

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Main Grid - 3-Column Layout with Alerts */}
              {/* On mobile, Alerts show first (order-1) since they are the core purpose */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left Column - Profile & Quick Actions (order-3 on mobile) */}
                <div className="space-y-6 order-3 lg:order-1">
                  <ElderProfile
                    profile={currentElderProfile}
                    onCall={async () => {
                      const result = await sendEvent({
                        elder_id: elderProfile.id,
                        event_type: "normal",
                        voice_transcript: `Family initiated voice call to ${elderProfile.name}`,
                      });
                      if (result.success) {
                        showToast({ type: "info", title: "Calling", message: `Calling ${elderProfile.name.split(" ")[0]} at ${elderProfile.phone}...` });
                      } else {
                        showToast({ type: "error", title: "Call Failed", message: result.error || "Could not reach backend" });
                      }
                    }}
                    onVideo={async () => {
                      const result = await sendEvent({
                        elder_id: elderProfile.id,
                        event_type: "normal",
                        voice_transcript: `Family initiated video call to ${elderProfile.name}`,
                      });
                      if (result.success) {
                        showToast({ type: "info", title: "Video Call", message: `Starting video call with ${elderProfile.name.split(" ")[0]}...` });
                      } else {
                        showToast({ type: "error", title: "Video Call Failed", message: result.error || "Could not reach backend" });
                      }
                    }}
                    onMessage={() => setShowProfileMessage(true)}
                    onLocationClick={() => setShowProfileLocation(true)}
                    onEmergencyContactClick={() => {
                      showToast({ type: "info", title: "Emergency Contact", message: `${elderProfile.emergencyContact} • ${elderProfile.emergencyPhone}` });
                    }}
                    onMoreClick={() => setShowProfile(true)}
                  />
                  <QuickActions 
                    elderName={elderProfile.name}
                    elderPhone={elderProfile.phone}
                    emergencyPhone={elderProfile.emergencyPhone}
                    elderId={elderProfile.id}
                    elderAddress={elderProfile.address}
                    onToast={handleQuickActionToast}
                  />
                </div>

                {/* Alerts - now spans 2 columns for a bigger view (order-1 on mobile so alerts show FIRST) */}
                <div className="space-y-6 order-1 lg:order-2 lg:col-span-2">
                  {/* Alerts Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="card overflow-hidden"
                  >
                    {/* Alerts Header */}
                    <div className="p-4 border-b border-[var(--border-primary)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ef4444] to-[#dc2626] flex items-center justify-center">
                            <Bell className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                              Alerts
                              {stats.unacknowledged > 0 && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-[#ef4444] text-white rounded-full">
                                  {stats.unacknowledged}
                                </span>
                              )}
                            </h3>
                            <p className="text-xs text-[var(--text-muted)]">Real-time monitoring</p>
                          </div>
                        </div>
                        
                        {alerts.length > 0 && (
                          <div className="flex items-center gap-1">
                            {stats.unacknowledged > 0 && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleAcknowledgeAll}
                                className="p-2 text-[#c8ff00] hover:bg-[#c8ff00]/10 rounded-lg transition-colors"
                                title="Acknowledge all"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </motion.button>
                            )}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={handleClearAll}
                              className="p-2 text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg transition-colors"
                              title="Clear all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Alerts List */}
                    <div className="p-4 max-h-[600px] lg:max-h-[720px] overflow-y-auto scrollbar-thin">
                      {filteredAlerts.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#22c55e]/10 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-[#22c55e]" />
                          </div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">All Clear!</p>
                          <p className="text-xs text-[var(--text-muted)]">No alerts at the moment</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <AnimatePresence mode="popLayout">
                            {filteredAlerts.slice(0, 8).map((alert, index) => (
                              <AlertCard
                                key={alert.id}
                                alert={alert}
                                onAcknowledge={handleAcknowledge}
                                onDismiss={clearAlert}
                                index={index}
                              />
                            ))}
                          </AnimatePresence>
                          {filteredAlerts.length > 8 && (
                            <p className="text-xs text-center text-[var(--text-muted)] pt-2">
                              +{filteredAlerts.length - 8} more alerts
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Activity Timeline & Daily Check-in side by side to fill the wide column */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ActivityTimeline activities={activities} maxItems={5} />
                    <DailyCheckIn 
                      elderId={elderProfile.id}
                      elderName={elderProfile.name}
                      onToast={handleQuickActionToast}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "health" && (
            <motion.div
              key="health"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="mt-6"
            >
              {/* Health Tab - Vitals, Medications & Activity Trends */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left - Health Vitals (spans 2 columns) */}
                  <div className="lg:col-span-2">
                    <HealthVitals 
                      elderId={elderProfile.id}
                      elderName={elderProfile.name}
                    />
                  </div>

                  {/* Right - Medications */}
                  <div>
                    <MedicationReminder 
                      elderId={elderProfile.id}
                      elderName={elderProfile.name}
                    />
                  </div>
                </div>

                {/* Activity Trends - moved here from Overview */}
                <WeeklyActivityChart elderName={elderProfile.name} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 text-center pb-24"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#c8ff00]" />
            <span className="text-sm font-semibold text-gradient">Shastra Sync</span>
            <Sparkles className="w-4 h-4 text-[#a78bfa]" />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Real-time elder care monitoring powered by AI • Audio alerts for critical events
          </p>
        </motion.footer>
      </main>

      {/* Floating Action Button */}
      <FloatingActionButton
        onEmergency={async () => {
          showToast({ type: "warning", title: "Emergency Alert", message: "Sending emergency signal..." });
          const result = await sendEmergency(elderProfile.id);
          if (result.success) {
            showToast({ type: "error", title: "Emergency Sent", message: "Emergency services have been alerted!" });
          }
        }}
        onCall={async () => {
          const result = await sendEvent({
            elder_id: elderProfile.id,
            event_type: "normal",
            voice_transcript: `Family initiated call to ${elderProfile.name}`,
          });
          if (result.success) {
            showToast({ type: "info", title: "Calling", message: `Calling ${elderProfile.name.split(" ")[0]}...` });
          }
        }}
        onVideo={async () => {
          const result = await sendEvent({
            elder_id: elderProfile.id,
            event_type: "normal",
            voice_transcript: `Family initiated video call to ${elderProfile.name}`,
          });
          if (result.success) {
            showToast({ type: "info", title: "Video Call", message: `Starting video call with ${elderProfile.name.split(" ")[0]}...` });
          }
        }}
        onMessage={() => {
          showToast({ type: "info", title: "Message", message: "Use Quick Actions to send messages" });
        }}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Profile Panel */}
      <ProfilePanel
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        elder={currentElderProfile}
        onSignOut={() => {
          setShowProfile(false);
          showToast({ type: "info", title: "Signing Out", message: "You have been signed out successfully" });
        }}
        onToast={handleQuickActionToast}
      />

      {/* Elder Profile - Message Composer */}
      <MessageComposer
        isOpen={showProfileMessage}
        onClose={() => setShowProfileMessage(false)}
        elderName={elderProfile.name}
        onSend={async (message) => {
          const result = await sendFamilyMessage(elderProfile.id, message);
          if (result.success) {
            showToast({ type: "success", title: "Message Sent", message: `Your message to ${elderProfile.name.split(" ")[0]} has been delivered!` });
          } else {
            showToast({ type: "error", title: "Failed to Send", message: result.error || "Could not send message" });
          }
        }}
      />

      {/* Elder Profile - Location Tracker */}
      <LocationTracker
        isOpen={showProfileLocation}
        onClose={() => setShowProfileLocation(false)}
        elderName={elderProfile.name}
        elderAddress={elderProfile.address}
        onToast={handleQuickActionToast}
      />
    </div>
  );
}
