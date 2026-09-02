"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Smile, 
  Meh, 
  Frown,
  Sun,
  Cloud,
  CloudRain,
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

export function DailyCheckIn({ elderId = "kamala_001", elderName = "Elder", onToast }: DailyCheckInProps) {
  const [todayMood, setTodayMood] = useState<Mood | null>("good");
  const [streak, setStreak] = useState(7);

  const moodOptions: { id: Mood; icon: React.ElementType; label: string; color: string; bg: string }[] = [
    { id: "great", icon: Sun, label: "Great", color: "#c8ff00", bg: "bg-[#c8ff00]/10" },
    { id: "good", icon: Smile, label: "Good", color: "#22c55e", bg: "bg-[#22c55e]/10" },
    { id: "okay", icon: Cloud, label: "Okay", color: "#f59e0b", bg: "bg-[#f59e0b]/10" },
    { id: "low", icon: CloudRain, label: "Low", color: "#a78bfa", bg: "bg-[#a78bfa]/10" },
  ];

  // Weekly mood history (simulated)
  const weeklyMoods: (Mood | null)[] = ["good", "great", "good", "okay", "great", "good", todayMood];
  const days = ["M", "T", "W", "T", "F", "S", "S"];

  const getMoodColor = (mood: Mood | null) => {
    if (!mood) return "bg-[var(--bg-sunken)]";
    const option = moodOptions.find(m => m.id === mood);
    return option?.bg || "bg-[var(--bg-sunken)]";
  };

  const getMoodDotColor = (mood: Mood | null) => {
    if (!mood) return "var(--text-muted)";
    const option = moodOptions.find(m => m.id === mood);
    return option?.color || "var(--text-muted)";
  };

  const handleMoodSelect = async (mood: Mood) => {
    setTodayMood(mood);
    
    // Map mood to API emotion type
    const emotionMap: Record<Mood, "happy" | "neutral" | "sad"> = {
      great: "happy",
      good: "happy",
      okay: "neutral",
      low: "sad",
    };
    
    // Send to backend
    const result = await sendCheckIn(elderId, emotionMap[mood]);
    if (result.success) {
      onToast?.("success", "Mood Logged", `${elderName.split(" ")[0]}'s mood has been recorded`);
    } else {
      onToast?.("error", "Failed", result.error || "Could not send check-in");
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

        {/* Streak Badge */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f59e0b]/10 text-[#f59e0b]"
        >
          <Flame className="w-4 h-4" />
          <span className="text-xs font-bold">{streak} day streak</span>
        </motion.div>
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
            <span>This Week</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#22c55e]">
            <TrendingUp className="w-3 h-3" />
            <span>Positive trend</span>
          </div>
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
          <Sparkles className="w-3 h-3 text-[#c8ff00]" />
          <span>
            {todayMood === "great" && `${elderName.split(" ")[0]} is having an amazing day!`}
            {todayMood === "good" && `${elderName.split(" ")[0]} is doing well today.`}
            {todayMood === "okay" && `Keep an eye on ${elderName.split(" ")[0]} today.`}
            {todayMood === "low" && `Consider checking in with ${elderName.split(" ")[0]}.`}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
