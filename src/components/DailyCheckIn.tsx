"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Smile, 
  Cloud,
  CloudRain,
  Sun,
  Flame,
  Calendar,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { sendCheckIn } from "@/services/api";

interface DailyCheckInProps {
  elderId?: string;
  elderName?: string;
  onToast?: (type: "success" | "error", title: string, message?: string) => void;
}

type Mood = "great" | "good" | "okay" | "low";

// A single stored check-in: an ISO date (yyyy-mm-dd) mapped to a mood.
type CheckInHistory = Record<string, Mood>;

const STORAGE_PREFIX = "shastra-checkin-";

// Local date key (yyyy-mm-dd) in the user's timezone.
const dateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function DailyCheckIn({ elderId = "kamala_001", elderName = "Elder", onToast }: DailyCheckInProps) {
  const [history, setHistory] = useState<CheckInHistory>({});
  const [loaded, setLoaded] = useState(false);

  const storageKey = `${STORAGE_PREFIX}${elderId}`;

  // Load saved check-ins on mount (per elder).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      // ignore corrupt data
    }
    setLoaded(true);
  }, [storageKey]);

  // Persist whenever history changes (after initial load).
  useEffect(() => {
    if (!loaded || typeof window === "undefined") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(history));
    } catch {
      // ignore quota errors
    }
  }, [history, loaded, storageKey]);

  const todayKey = dateKey(new Date());
  const todayMood: Mood | null = history[todayKey] ?? null;

  const moodOptions: { id: Mood; icon: React.ElementType; label: string; color: string; bg: string }[] = [
    { id: "great", icon: Sun, label: "Great", color: "#84cc16", bg: "bg-[#84cc16]/10" },
    { id: "good", icon: Smile, label: "Good", color: "#22c55e", bg: "bg-[#22c55e]/10" },
    { id: "okay", icon: Cloud, label: "Okay", color: "#f59e0b", bg: "bg-[#f59e0b]/10" },
    { id: "low", icon: CloudRain, label: "Low", color: "#a78bfa", bg: "bg-[#a78bfa]/10" },
  ];

  // Build the last 7 days (Mon-anchored view -> just the trailing 7 days ending today).
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const weeklyMoods: (Mood | null)[] = last7Days.map((d) => history[dateKey(d)] ?? null);
  const days = last7Days.map((d) => ["S", "M", "T", "W", "T", "F", "S"][d.getDay()]);

  // Real streak: count consecutive days (ending today) that have a check-in.
  const computeStreak = useCallback((hist: CheckInHistory): number => {
    let streak = 0;
    const cursor = new Date();
    // If today isn't checked in yet, the streak counts back from yesterday.
    if (!hist[dateKey(cursor)]) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (hist[dateKey(cursor)]) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, []);

  const streak = computeStreak(history);

  const getMoodColor = (mood: Mood | null) => {
    if (!mood) return "bg-[var(--bg-sunken)]";
    return moodOptions.find((m) => m.id === mood)?.bg || "bg-[var(--bg-sunken)]";
  };

  const getMoodDotColor = (mood: Mood | null) => {
    if (!mood) return "var(--text-muted)";
    return moodOptions.find((m) => m.id === mood)?.color || "var(--text-muted)";
  };

  // Is the recent trend positive? (majority of recorded days are great/good)
  const recorded = weeklyMoods.filter(Boolean) as Mood[];
  const positive = recorded.filter((m) => m === "great" || m === "good").length;
  const isPositiveTrend = recorded.length > 0 && positive >= recorded.length / 2;

  const handleMoodSelect = async (mood: Mood) => {
    // Record locally (persists via effect) — this is what makes it functional.
    setHistory((prev) => ({ ...prev, [todayKey]: mood }));

    // Send to backend as an emotion event.
    const emotionMap: Record<Mood, "happy" | "neutral" | "sad"> = {
      great: "happy",
      good: "happy",
      okay: "neutral",
      low: "sad",
    };
    const result = await sendCheckIn(elderId, emotionMap[mood]);
    if (result.success) {
      onToast?.("success", "Mood Logged", `${elderName.split(" ")[0]}'s mood has been recorded`);
    } else {
      // Even if the backend is down, the local check-in still saved.
      onToast?.("success", "Mood Saved", `Recorded locally (backend unavailable)`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <motion.div 
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f472b6] to-[#ec4899] flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
          >
            <Smile className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Daily Check-in</h3>
            <p className="text-xs text-[var(--text-muted)]">How is {elderName.split(" ")[0]} feeling?</p>
          </div>
        </div>

        {/* Streak Badge (only shown when there's an actual streak) */}
        {streak > 0 && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f59e0b]/10 text-[#f59e0b]"
          >
            <Flame className="w-4 h-4" />
            <span className="text-xs font-bold">{streak} day{streak > 1 ? "s" : ""} streak</span>
          </motion.div>
        )}
      </div>

      {/* Mood Selection */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {moodOptions.map((mood) => {
          const Icon = mood.icon;
          const isSelected = todayMood === mood.id;
          return (
            <motion.button
              key={mood.id}
              onClick={() => handleMoodSelect(mood.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200
                ${isSelected 
                  ? `${mood.bg} border-current` 
                  : "bg-[var(--bg-tertiary)] border-transparent hover:border-[var(--border-primary)]"
                }
              `}
              style={{ 
                borderColor: isSelected ? mood.color : undefined,
                color: isSelected ? mood.color : undefined 
              }}
            >
              <Icon 
                className="w-6 h-6" 
                style={{ color: isSelected ? mood.color : "var(--text-muted)" }}
              />
              <span className={`text-xs font-medium ${isSelected ? "" : "text-[var(--text-muted)]"}`}>
                {mood.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Weekly Overview */}
      <div className="p-3 rounded-xl bg-[var(--bg-tertiary)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Calendar className="w-3 h-3" />
            <span>Last 7 days</span>
          </div>
          {recorded.length > 0 && (
            <div className={`flex items-center gap-1 text-xs ${isPositiveTrend ? "text-[#22c55e]" : "text-[#f59e0b]"}`}>
              <TrendingUp className="w-3 h-3" />
              <span>{isPositiveTrend ? "Positive trend" : "Needs attention"}</span>
            </div>
          )}
        </div>

        {/* Week dots */}
        <div className="flex justify-between">
          {weeklyMoods.map((mood, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  w-8 h-8 rounded-lg flex items-center justify-center
                  ${getMoodColor(mood)}
                  ${index === 6 ? "ring-2 ring-[var(--text-muted)]/20" : ""}
                `}
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getMoodDotColor(mood) }}
                />
              </motion.div>
              <span className={`text-[10px] ${index === 6 ? "font-bold text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
                {days[index]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Motivation */}
      {todayMood && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]"
        >
          <Sparkles className="w-3 h-3 text-[#84cc16]" />
          <span>
            {todayMood === "great" && `${elderName.split(" ")[0]} is having an amazing day!`}
            {todayMood === "good" && `${elderName.split(" ")[0]} is doing well today.`}
            {todayMood === "okay" && `Keep an eye on ${elderName.split(" ")[0]} today.`}
            {todayMood === "low" && `Consider checking in with ${elderName.split(" ")[0]}.`}
          </span>
        </motion.div>
      )}
      {!todayMood && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]"
        >
          <Sparkles className="w-3 h-3 text-[#84cc16]" />
          <span>Log today&apos;s mood to keep the streak going.</span>
        </motion.div>
      )}
    </motion.div>
  );
}
