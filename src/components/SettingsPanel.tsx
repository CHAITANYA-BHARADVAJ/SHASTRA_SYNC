"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Moon, 
  Sun, 
  Bell, 
  Volume2, 
  VolumeX,
  Globe,
  Palette,
  Shield,
  User,
  ChevronRight,
  Check,
  CheckCheck
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const languages = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिंदी" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
];

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { settings, updateSettings } = useSettings();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");

  // Reflect the real browser notification permission state
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("Notification" in window) {
        setNotifPermission(Notification.permission);
      } else {
        setNotifPermission("unsupported");
      }
    }
  }, [isOpen]);

  const handleToggle = (key: keyof typeof settings) => {
    if (typeof settings[key] === "boolean") {
      updateSettings({ [key]: !settings[key] });

      if (key === "darkMode") {
        document.documentElement.classList.toggle("dark", !settings[key]);
      }
    }
  };

  // Browser notifications need real OS/browser permission, not just a stored flag.
  const handleNotificationsToggle = async () => {
    const enabling = !settings.notificationsEnabled;

    if (!enabling) {
      // Turning off is always allowed
      updateSettings({ notificationsEnabled: false });
      return;
    }

    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifPermission("unsupported");
      return;
    }

    if (Notification.permission === "granted") {
      setNotifPermission("granted");
      updateSettings({ notificationsEnabled: true });
      return;
    }

    if (Notification.permission === "denied") {
      // Browser blocks re-prompting; keep it off and reflect the blocked state.
      setNotifPermission("denied");
      updateSettings({ notificationsEnabled: false });
      return;
    }

    // permission === "default" -> ask the user
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    updateSettings({ notificationsEnabled: result === "granted" });
  };

  const notificationsSubtitle =
    notifPermission === "unsupported"
      ? "Not supported in this browser"
      : notifPermission === "denied"
      ? "Blocked — enable in browser site settings"
      : settings.notificationsEnabled && notifPermission === "granted"
      ? "Enabled — you'll get browser alerts"
      : "Get notified in your browser";

  const handleLanguageChange = (code: string) => {
    updateSettings({ language: code });
    setActiveSection(null);
  };

  const handleVolumeChange = (value: number) => {
    updateSettings({ soundVolume: value });
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
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] shadow-2xl overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[var(--bg-secondary)]/90 backdrop-blur-xl border-b border-[var(--border-primary)]">
              <div className="flex items-center justify-between p-5">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Settings</h2>
                  <p className="text-sm text-[var(--text-muted)]">Customize your experience</p>
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
            <div className="p-5 space-y-6">
              {/* Appearance Section */}
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                  Appearance
                </h3>
                <div className="space-y-2">
                  {/* Dark Mode */}
                  <motion.button
                    onClick={() => handleToggle("darkMode")}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[#c8ff00]/30 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings.darkMode ? "bg-[#a78bfa]/10" : "bg-[#f59e0b]/10"}`}>
                      {settings.darkMode ? (
                        <Moon className="w-5 h-5 text-[#a78bfa]" />
                      ) : (
                        <Sun className="w-5 h-5 text-[#f59e0b]" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-[var(--text-primary)]">Dark Mode</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {settings.darkMode ? "Currently enabled" : "Currently disabled"}
                      </p>
                    </div>
                    <div className={`
                      w-12 h-7 rounded-full p-1 transition-colors duration-200
                      ${settings.darkMode ? "bg-[#c8ff00]" : "bg-[var(--bg-sunken)]"}
                    `}>
                      <motion.div
                        className="w-5 h-5 rounded-full bg-white shadow-md"
                        animate={{ x: settings.darkMode ? 20 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </motion.button>
                </div>
              </div>

              {/* Notifications Section */}
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                  Notifications
                </h3>
                <div className="space-y-2">
                  {/* Sound Toggle */}
                  <motion.button
                    onClick={() => handleToggle("soundEnabled")}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[#c8ff00]/30 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings.soundEnabled ? "bg-[#22c55e]/10" : "bg-[var(--bg-tertiary)]"}`}>
                      {settings.soundEnabled ? (
                        <Volume2 className="w-5 h-5 text-[#22c55e]" />
                      ) : (
                        <VolumeX className="w-5 h-5 text-[var(--text-muted)]" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-[var(--text-primary)]">Alert Sounds</p>
                      <p className="text-xs text-[var(--text-muted)]">Play sound for critical alerts</p>
                    </div>
                    <div className={`
                      w-12 h-7 rounded-full p-1 transition-colors duration-200
                      ${settings.soundEnabled ? "bg-[#c8ff00]" : "bg-[var(--bg-sunken)]"}
                    `}>
                      <motion.div
                        className="w-5 h-5 rounded-full bg-white shadow-md"
                        animate={{ x: settings.soundEnabled ? 20 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </motion.button>

                  {/* Volume Slider */}
                  {settings.soundEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 rounded-xl bg-[var(--bg-tertiary)]"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-[var(--text-secondary)]">Volume</span>
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {Math.round(settings.soundVolume * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.soundVolume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-[var(--bg-sunken)] rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:w-5
                          [&::-webkit-slider-thumb]:h-5
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:bg-[#c8ff00]
                          [&::-webkit-slider-thumb]:shadow-lg
                          [&::-webkit-slider-thumb]:cursor-pointer
                        "
                      />
                    </motion.div>
                  )}

                  {/* Browser Notifications */}
                  <motion.button
                    onClick={handleNotificationsToggle}
                    disabled={notifPermission === "unsupported"}
                    whileHover={{ scale: notifPermission === "unsupported" ? 1 : 1.01 }}
                    whileTap={{ scale: notifPermission === "unsupported" ? 1 : 0.99 }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[#c8ff00]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings.notificationsEnabled ? "bg-[#3b82f6]/10" : "bg-[var(--bg-tertiary)]"}`}>
                      <Bell className={`w-5 h-5 ${settings.notificationsEnabled ? "text-[#3b82f6]" : "text-[var(--text-muted)]"}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-[var(--text-primary)]">Browser Notifications</p>
                      <p className="text-xs text-[var(--text-muted)]">{notificationsSubtitle}</p>
                    </div>
                    <div className={`
                      w-12 h-7 rounded-full p-1 transition-colors duration-200
                      ${settings.notificationsEnabled ? "bg-[#c8ff00]" : "bg-[var(--bg-sunken)]"}
                    `}>
                      <motion.div
                        className="w-5 h-5 rounded-full bg-white shadow-md"
                        animate={{ x: settings.notificationsEnabled ? 20 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </motion.button>

                  {/* Auto-Acknowledge Toggle */}
                  <motion.button
                    onClick={() => handleToggle("autoAcknowledge")}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[#c8ff00]/30 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings.autoAcknowledge ? "bg-[#22c55e]/10" : "bg-[var(--bg-tertiary)]"}`}>
                      <CheckCheck className={`w-5 h-5 ${settings.autoAcknowledge ? "text-[#22c55e]" : "text-[var(--text-muted)]"}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-[var(--text-primary)]">Auto-Acknowledge</p>
                      <p className="text-xs text-[var(--text-muted)]">Mark non-critical alerts as read automatically</p>
                    </div>
                    <div className={`
                      w-12 h-7 rounded-full p-1 transition-colors duration-200
                      ${settings.autoAcknowledge ? "bg-[#c8ff00]" : "bg-[var(--bg-sunken)]"}
                    `}>
                      <motion.div
                        className="w-5 h-5 rounded-full bg-white shadow-md"
                        animate={{ x: settings.autoAcknowledge ? 20 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </motion.button>

                  {/* Auto-Acknowledge Delay selector (only when enabled) */}
                  {settings.autoAcknowledge && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 rounded-xl bg-[var(--bg-tertiary)]"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-[var(--text-secondary)]">Acknowledge after</span>
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {settings.autoAcknowledgeDelay}s
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[15, 30, 60, 120].map((secs) => (
                          <button
                            key={secs}
                            onClick={() => updateSettings({ autoAcknowledgeDelay: secs })}
                            className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                              settings.autoAcknowledgeDelay === secs
                                ? "bg-[#c8ff00] text-[#1a1d29]"
                                : "bg-[var(--bg-sunken)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            {secs < 60 ? `${secs}s` : `${secs / 60}m`}
                          </button>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-[var(--text-muted)]">
                        Critical alerts are never auto-acknowledged and always require your attention.
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Language Section */}
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                  Language
                </h3>
                <motion.button
                  onClick={() => setActiveSection(activeSection === "language" ? null : "language")}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[#c8ff00]/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#a78bfa]/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-[#a78bfa]" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-[var(--text-primary)]">Language</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {languages.find(l => l.code === settings.language)?.name || "English"}
                    </p>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${activeSection === "language" ? "rotate-90" : ""}`} />
                </motion.button>

                <AnimatePresence>
                  {activeSection === "language" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 rounded-xl bg-[var(--bg-tertiary)] overflow-hidden"
                    >
                      {languages.map((lang) => (
                        <motion.button
                          key={lang.code}
                          onClick={() => handleLanguageChange(lang.code)}
                          whileHover={{ backgroundColor: "var(--bg-hover)" }}
                          className="w-full flex items-center justify-between p-4 border-b border-[var(--border-secondary)] last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-[var(--text-primary)]">{lang.name}</span>
                            <span className="text-xs text-[var(--text-muted)]">{lang.native}</span>
                          </div>
                          {settings.language === lang.code && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-6 h-6 rounded-full bg-[#c8ff00] flex items-center justify-center"
                            >
                              <Check className="w-4 h-4 text-[#1a1d29]" />
                            </motion.div>
                          )}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* App Info */}
              <div className="pt-4 border-t border-[var(--border-primary)]">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-tertiary)]">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#c8ff00] to-[#a78bfa] flex items-center justify-center">
                    <Shield className="w-6 h-6 text-[#1a1d29]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Shastra Sync</p>
                    <p className="text-xs text-[var(--text-muted)]">Version 2.0.0 • Premium</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
