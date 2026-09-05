"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { 
  Settings, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  ChevronDown,
  User,
  Shield,
  Zap
} from "lucide-react";

interface HeaderProps {
  connectionStatus: "connected" | "connecting" | "disconnected" | "error";
  onReconnect: () => void;
  onSettingsClick: () => void;
  unreadCount: number;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onSignOut?: () => void;
  onProfileClick?: () => void;
  onNotificationPrefsClick?: () => void;
}

const tabs = [
  { id: "overview", label: "Overview", icon: Zap },
  { id: "health", label: "Health", icon: Shield },
];

export function Header({
  connectionStatus,
  onReconnect,
  onSettingsClick,
  unreadCount,
  activeTab = "overview",
  onTabChange,
  onSignOut,
  onProfileClick,
  onNotificationPrefsClick,
}: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getConnectionInfo = () => {
    switch (connectionStatus) {
      case "connected":
        return { 
          icon: Wifi, 
          color: "text-[#22c55e]", 
          bg: "bg-[#22c55e]/10",
          label: "Live",
          dot: "bg-[#22c55e]"
        };
      case "connecting":
        return { 
          icon: RefreshCw, 
          color: "text-[#f59e0b]", 
          bg: "bg-[#f59e0b]/10",
          label: "Syncing",
          dot: "bg-[#f59e0b]"
        };
      case "disconnected":
      case "error":
        return { 
          icon: WifiOff, 
          color: "text-[#ef4444]", 
          bg: "bg-[#ef4444]/10",
          label: "Offline",
          dot: "bg-[#ef4444]"
        };
    }
  };

  const connInfo = getConnectionInfo();
  const ConnIcon = connInfo.icon;

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 w-full"
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-[var(--nav-bg)]/80 backdrop-blur-xl border-b border-[var(--nav-border)]" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo & Brand */}
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            {/* Logo */}
            <motion.div 
              className="flex items-center gap-2.5 min-w-0"
              whileHover={{ scale: 1.02 }}
            >
              <div className="relative flex-shrink-0">
                <motion.div 
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#c8ff00] to-[#a3e635] flex items-center justify-center shadow-lg"
                  whileHover={{ rotate: 5 }}
                >
                  <Zap className="w-5 h-5 text-[#1a1d29]" />
                </motion.div>
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-xl bg-[#c8ff00] blur-xl opacity-30" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-[var(--text-primary)] truncate leading-tight">
                  Shastra<span className="text-[#c8ff00]">Sync</span>
                </h1>
                <p className="hidden sm:block text-[10px] text-[var(--text-muted)] -mt-0.5 tracking-wide">
                  ELDER CARE ANALYTICS
                </p>
              </div>
            </motion.div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center">
              <div className="nav-tabs">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <motion.button
                      key={tab.id}
                      onClick={() => onTabChange?.(tab.id)}
                      className={`nav-tab flex items-center gap-2 ${isActive ? "nav-tab-active" : ""}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </motion.button>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Connection Status */}
            <motion.button
              onClick={(connectionStatus === "disconnected" || connectionStatus === "error") ? onReconnect : undefined}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-sm font-medium
                ${connInfo.bg} ${connInfo.color}
                transition-all duration-200
                ${(connectionStatus === "disconnected" || connectionStatus === "error") ? "cursor-pointer hover:bg-[#ef4444]/20" : "cursor-default"}
              `}
            >
              <span className={`w-2 h-2 rounded-full ${connInfo.dot} ${connectionStatus === "connected" ? "animate-pulse" : ""}`} />
              <span className="hidden sm:inline">{connInfo.label}</span>
              <ConnIcon className={`w-4 h-4 ${connectionStatus === "connecting" ? "animate-spin" : ""}`} />
            </motion.button>

            {/* Settings (with unread indicator) */}
            <motion.button
              onClick={onSettingsClick}
              whileHover={{ scale: 1.05, rotate: 45 }}
              whileTap={{ scale: 0.95 }}
              className="btn-icon relative"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-[#ef4444] text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </motion.span>
              )}
            </motion.button>

            {/* User Menu */}
            <div className="relative sm:ml-1">
              <motion.button
                onClick={() => setShowUserMenu(!showUserMenu)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 p-1 sm:pl-2 sm:pr-3 sm:py-1.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] hover:border-[#c8ff00]/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c8ff00] to-[#a78bfa] flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-[#1a1d29]" />
                </div>
                <span className="hidden sm:block text-sm font-medium text-[var(--text-primary)]">
                  Family
                </span>
                <ChevronDown className={`hidden sm:block w-4 h-4 text-[var(--text-muted)] transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
              </motion.button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {showUserMenu && (
                  <>
                    {/* Click-outside backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 py-2 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] shadow-xl z-50"
                    >
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onProfileClick?.();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        Profile Settings
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onNotificationPrefsClick?.();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        Notification Preferences
                      </button>
                      <hr className="my-2 border-[var(--border-primary)]" />
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onSignOut?.();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                      >
                        Sign Out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden pb-3 -mx-2 overflow-x-auto scrollbar-hidden">
          <div className="flex gap-1 px-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap
                    ${isActive 
                      ? "bg-[#c8ff00] text-[#1a1d29]" 
                      : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }
                    transition-all duration-200
                  `}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </motion.button>
              );
            })}
          </div>
        </nav>
      </div>
    </motion.header>
  );
}
