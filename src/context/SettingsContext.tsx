"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { DashboardSettings } from "@/types/alerts";

const defaultSettings: DashboardSettings = {
  soundEnabled: true,
  soundVolume: 0.7,
  darkMode: false,
  notificationsEnabled: true,
  autoAcknowledge: false,
  autoAcknowledgeDelay: 30,
  language: "en",
};

interface SettingsContextType {
  settings: DashboardSettings;
  updateSettings: (newSettings: Partial<DashboardSettings>) => void;
  toggleDarkMode: () => void;
  toggleSound: () => void;
  isLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DashboardSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Apply dark mode to document
  const applyDarkMode = useCallback((isDark: boolean) => {
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      if (isDark) {
        root.classList.add("dark");
        root.style.colorScheme = "dark";
      } else {
        root.classList.remove("dark");
        root.style.colorScheme = "light";
      }
    }
  }, []);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSettings = localStorage.getItem("shastra-dashboard-settings");
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          const merged = { ...defaultSettings, ...parsed };
          setSettings(merged);
          applyDarkMode(merged.darkMode);
        } catch {
          console.error("Failed to parse saved settings");
          applyDarkMode(defaultSettings.darkMode);
        }
      } else {
        // Check system preference
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setSettings((prev) => ({ ...prev, darkMode: prefersDark }));
        applyDarkMode(prefersDark);
      }
      setIsLoaded(true);
    }
  }, [applyDarkMode]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("shastra-dashboard-settings", JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  // Apply dark mode whenever it changes
  useEffect(() => {
    if (isLoaded) {
      applyDarkMode(settings.darkMode);
    }
  }, [settings.darkMode, isLoaded, applyDarkMode]);

  const updateSettings = useCallback((newSettings: Partial<DashboardSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const toggleDarkMode = useCallback(() => {
    setSettings((prev) => {
      const newDarkMode = !prev.darkMode;
      applyDarkMode(newDarkMode);
      return { ...prev, darkMode: newDarkMode };
    });
  }, [applyDarkMode]);

  const toggleSound = useCallback(() => {
    setSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, toggleDarkMode, toggleSound, isLoaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
