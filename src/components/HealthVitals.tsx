"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, 
  Thermometer, 
  Wind, 
  Activity,
  Droplets,
  TrendingUp,
  TrendingDown,
  Minus,
  MoreHorizontal,
  RefreshCw
} from "lucide-react";
import { DonutChart } from "./charts";

interface VitalReading {
  value: number;
  unit: string;
  status: "normal" | "warning" | "critical";
  trend?: "up" | "down" | "stable";
  min?: number;
  max?: number;
}

interface HealthVitalsProps {
  elderId?: string;
  elderName?: string;
}

export function HealthVitals({ elderId = "kamala_001", elderName = "Elder" }: HealthVitalsProps) {
  const [vitals, setVitals] = useState({
    heartRate: { value: 72, unit: "bpm", status: "normal" as const, trend: "stable" as const, min: 60, max: 100 },
    bloodPressure: { systolic: 128, diastolic: 82, unit: "mmHg", status: "normal" as const, trend: "down" as const },
    temperature: { value: 98.2, unit: "°F", status: "normal" as const, trend: "stable" as const, min: 97, max: 99 },
    oxygen: { value: 97, unit: "%", status: "normal" as const, trend: "up" as const, min: 95, max: 100 },
    hydration: { value: 82, unit: "%", status: "normal" as const, trend: "stable" as const, min: 70, max: 100 },
  });

  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedVital, setSelectedVital] = useState<string | null>(null);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setVitals(prev => ({
        ...prev,
        heartRate: {
          ...prev.heartRate,
          value: prev.heartRate.value + Math.floor(Math.random() * 5) - 2,
        },
        oxygen: {
          ...prev.oxygen,
          value: Math.min(100, Math.max(94, prev.oxygen.value + Math.floor(Math.random() * 3) - 1)),
        },
      }));
      setLastUpdated(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal": return "#22c55e";
      case "warning": return "#f59e0b";
      case "critical": return "#ef4444";
      default: return "#22c55e";
    }
  };

  const TrendIcon = ({ trend }: { trend?: string }) => {
    if (trend === "up") return <TrendingUp className="w-3 h-3 text-[#22c55e]" />;
    if (trend === "down") return <TrendingDown className="w-3 h-3 text-[#f59e0b]" />;
    return <Minus className="w-3 h-3 text-[var(--text-muted)]" />;
  };

  // Calculate health score for main donut
  const healthScore = Math.round(
    (vitals.heartRate.status === "normal" ? 25 : 15) +
    (vitals.bloodPressure.status === "normal" ? 25 : 15) +
    (vitals.oxygen.status === "normal" ? 25 : 15) +
    (vitals.temperature.status === "normal" ? 25 : 15)
  );

  const donutSegments = [
    { value: healthScore, color: "#c8ff00", label: "Good" },
    { value: 100 - healthScore, color: "var(--bg-sunken)", label: "Risk" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <motion.div 
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center shadow-lg"
            whileHover={{ scale: 1.1 }}
          >
            <Activity className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Health Vitals</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Updated {lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <motion.button
            onClick={handleRefresh}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="btn-icon"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="btn-icon"
          >
            <MoreHorizontal className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Main Content - Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score Donut */}
        <div className="flex flex-col items-center justify-center p-4">
          <DonutChart
            segments={donutSegments}
            size={140}
            strokeWidth={14}
            centerContent={
              <div className="text-center">
                <motion.p 
                  className="text-3xl font-bold text-[var(--text-primary)]"
                  key={healthScore}
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                >
                  {healthScore}
                </motion.p>
                <p className="text-xs text-[var(--text-muted)]">Health Score</p>
              </div>
            }
          />
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#c8ff00]" />
              <span className="text-xs text-[var(--text-muted)]">Good</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[var(--bg-sunken)]" />
              <span className="text-xs text-[var(--text-muted)]">Monitor</span>
            </div>
          </div>
        </div>

        {/* Vital Cards Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          {/* Heart Rate */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => setSelectedVital(selectedVital === "heart" ? null : "heart")}
            className={`
              p-4 rounded-2xl cursor-pointer transition-all duration-200
              ${selectedVital === "heart" 
                ? "bg-[#ef4444]/10 border-2 border-[#ef4444]/30" 
                : "bg-[var(--bg-tertiary)] border-2 border-transparent hover:border-[var(--border-primary)]"
              }
            `}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#ef4444]/20 flex items-center justify-center">
                <Heart className="w-5 h-5 text-[#ef4444]" />
              </div>
              <TrendIcon trend={vitals.heartRate.trend} />
            </div>
            <motion.p 
              className="text-2xl font-bold text-[var(--text-primary)]"
              key={vitals.heartRate.value}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
            >
              {vitals.heartRate.value}
              <span className="text-sm font-normal text-[var(--text-muted)] ml-1">bpm</span>
            </motion.p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Heart Rate</p>
            
            {/* Mini progress bar */}
            <div className="mt-3 h-1.5 bg-[var(--bg-sunken)] rounded-full overflow-hidden">
              <motion.div 
                className="h-full rounded-full bg-[#ef4444]"
                initial={{ width: 0 }}
                animate={{ width: `${((vitals.heartRate.value - 40) / 80) * 100}%` }}
              />
            </div>
          </motion.div>

          {/* Blood Pressure */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => setSelectedVital(selectedVital === "bp" ? null : "bp")}
            className={`
              p-4 rounded-2xl cursor-pointer transition-all duration-200
              ${selectedVital === "bp" 
                ? "bg-[#a78bfa]/10 border-2 border-[#a78bfa]/30" 
                : "bg-[var(--bg-tertiary)] border-2 border-transparent hover:border-[var(--border-primary)]"
              }
            `}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#a78bfa]/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#a78bfa]" />
              </div>
              <TrendIcon trend={vitals.bloodPressure.trend} />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {vitals.bloodPressure.systolic}
              <span className="text-lg text-[var(--text-muted)]">/</span>
              {vitals.bloodPressure.diastolic}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Blood Pressure</p>
            
            <div className="mt-3 h-1.5 bg-[var(--bg-sunken)] rounded-full overflow-hidden">
              <motion.div 
                className="h-full rounded-full bg-[#a78bfa]"
                initial={{ width: 0 }}
                animate={{ width: `${((vitals.bloodPressure.systolic - 80) / 80) * 100}%` }}
              />
            </div>
          </motion.div>

          {/* Oxygen */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => setSelectedVital(selectedVital === "oxygen" ? null : "oxygen")}
            className={`
              p-4 rounded-2xl cursor-pointer transition-all duration-200
              ${selectedVital === "oxygen" 
                ? "bg-[#3b82f6]/10 border-2 border-[#3b82f6]/30" 
                : "bg-[var(--bg-tertiary)] border-2 border-transparent hover:border-[var(--border-primary)]"
              }
            `}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/20 flex items-center justify-center">
                <Wind className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <TrendIcon trend={vitals.oxygen.trend} />
            </div>
            <motion.p 
              className="text-2xl font-bold text-[var(--text-primary)]"
              key={vitals.oxygen.value}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
            >
              {vitals.oxygen.value}
              <span className="text-sm font-normal text-[var(--text-muted)] ml-1">%</span>
            </motion.p>
            <p className="text-xs text-[var(--text-muted)] mt-1">SpO₂ Level</p>
            
            <div className="mt-3 h-1.5 bg-[var(--bg-sunken)] rounded-full overflow-hidden">
              <motion.div 
                className="h-full rounded-full bg-[#3b82f6]"
                initial={{ width: 0 }}
                animate={{ width: `${vitals.oxygen.value}%` }}
              />
            </div>
          </motion.div>

          {/* Temperature */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => setSelectedVital(selectedVital === "temp" ? null : "temp")}
            className={`
              p-4 rounded-2xl cursor-pointer transition-all duration-200
              ${selectedVital === "temp" 
                ? "bg-[#f59e0b]/10 border-2 border-[#f59e0b]/30" 
                : "bg-[var(--bg-tertiary)] border-2 border-transparent hover:border-[var(--border-primary)]"
              }
            `}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/20 flex items-center justify-center">
                <Thermometer className="w-5 h-5 text-[#f59e0b]" />
              </div>
              <TrendIcon trend={vitals.temperature.trend} />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {vitals.temperature.value}
              <span className="text-sm font-normal text-[var(--text-muted)] ml-1">°F</span>
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Temperature</p>
            
            <div className="mt-3 h-1.5 bg-[var(--bg-sunken)] rounded-full overflow-hidden">
              <motion.div 
                className="h-full rounded-full bg-[#f59e0b]"
                initial={{ width: 0 }}
                animate={{ width: `${((vitals.temperature.value - 95) / 6) * 100}%` }}
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Expanded Detail View */}
      <AnimatePresence>
        {selectedVital && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-[var(--border-primary)]"
          >
            <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]">
              <p className="text-sm text-[var(--text-muted)]">
                {selectedVital === "heart" && `Normal range: 60-100 bpm. ${elderName.split(" ")[0]}'s heart rate has been stable.`}
                {selectedVital === "bp" && `Target: Below 120/80 mmHg. Current reading is within acceptable range.`}
                {selectedVital === "oxygen" && `Normal: 95-100%. Oxygen saturation is excellent.`}
                {selectedVital === "temp" && `Normal: 97-99°F. Body temperature is normal.`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
