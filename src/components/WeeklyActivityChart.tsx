"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Activity,
  Footprints,
  Moon
} from "lucide-react";
import { AreaChart } from "./charts";

interface WeeklyActivityChartProps {
  elderName?: string;
}

type TimeRange = "week" | "month" | "year";
type MetricType = "activity" | "steps" | "sleep";

export function WeeklyActivityChart({ elderName = "Elder" }: WeeklyActivityChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("activity");

  const weeklyData = {
    activity: [
      { label: "Mon", value: 145 },
      { label: "Tue", value: 178 },
      { label: "Wed", value: 134 },
      { label: "Thu", value: 189 },
      { label: "Fri", value: 156 },
      { label: "Sat", value: 167 },
      { label: "Sun", value: 145 },
    ],
    steps: [
      { label: "Mon", value: 4200 },
      { label: "Tue", value: 5100 },
      { label: "Wed", value: 3800 },
      { label: "Thu", value: 5500 },
      { label: "Fri", value: 4700 },
      { label: "Sat", value: 4900 },
      { label: "Sun", value: 4100 },
    ],
    sleep: [
      { label: "Mon", value: 7.2 },
      { label: "Tue", value: 6.8 },
      { label: "Wed", value: 7.5 },
      { label: "Thu", value: 6.5 },
      { label: "Fri", value: 7.8 },
      { label: "Sat", value: 8.2 },
      { label: "Sun", value: 7.4 },
    ],
  };

  const monthlyData = {
    activity: [
      { label: "W1", value: 920 },
      { label: "W2", value: 1050 },
      { label: "W3", value: 890 },
      { label: "W4", value: 1114 },
    ],
    steps: [
      { label: "W1", value: 28000 },
      { label: "W2", value: 32000 },
      { label: "W3", value: 26000 },
      { label: "W4", value: 32300 },
    ],
    sleep: [
      { label: "W1", value: 49 },
      { label: "W2", value: 52 },
      { label: "W3", value: 48 },
      { label: "W4", value: 51 },
    ],
  };

  const data = timeRange === "week" ? weeklyData[selectedMetric] : monthlyData[selectedMetric];

  const metrics = [
    { id: "activity" as const, label: "Activity", icon: Activity, color: "lime" as const, unit: "min" },
    { id: "steps" as const, label: "Steps", icon: Footprints, color: "purple" as const, unit: "steps" },
    { id: "sleep" as const, label: "Sleep", icon: Moon, color: "success" as const, unit: "hrs" },
  ];

  const currentMetric = metrics.find(m => m.id === selectedMetric)!;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const average = Math.round(total / data.length);

  const formatValue = (val: number) => {
    if (selectedMetric === "steps") {
      return val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toString();
    }
    if (selectedMetric === "sleep") {
      return val.toFixed(1);
    }
    return val.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <motion.div 
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#c8ff00] to-[#a3e635] flex items-center justify-center shadow-lg"
            whileHover={{ scale: 1.1 }}
          >
            <TrendingUp className="w-6 h-6 text-[#1a1d29]" />
          </motion.div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Activity Trends</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {elderName.split(" ")[0]}&apos;s {timeRange === "week" ? "weekly" : "monthly"} progress
            </p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[var(--bg-tertiary)] rounded-xl p-1">
            {(["week", "month"] as TimeRange[]).map((range) => (
              <motion.button
                key={range}
                onClick={() => setTimeRange(range)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${timeRange === range 
                    ? "bg-[#c8ff00] text-[#1a1d29] shadow-md" 
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }
                `}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hidden pb-1">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const isActive = selectedMetric === metric.id;
          return (
            <motion.button
              key={metric.id}
              onClick={() => setSelectedMetric(metric.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap
                transition-all duration-200
                ${isActive 
                  ? metric.color === "lime" 
                    ? "bg-[#c8ff00]/20 text-[#c8ff00] border border-[#c8ff00]/30" 
                    : metric.color === "purple"
                    ? "bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/30"
                    : "bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30"
                  : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-transparent hover:border-[var(--border-primary)]"
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {metric.label}
            </motion.button>
          );
        })}
      </div>

      {/* Stats Summary */}
      <div className="flex items-center gap-6 mb-6">
        <div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">
            {formatValue(total)}
            <span className="text-sm font-normal text-[var(--text-muted)] ml-1">
              {currentMetric.unit}
            </span>
          </p>
          <p className="text-xs text-[var(--text-muted)]">Total this {timeRange}</p>
        </div>
        <div className="h-12 w-px bg-[var(--border-primary)]" />
        <div>
          <p className="text-xl font-bold text-[var(--text-primary)]">
            {formatValue(average)}
            <span className="text-sm font-normal text-[var(--text-muted)] ml-1">
              avg
            </span>
          </p>
          <p className="text-xs text-[var(--text-muted)]">Daily average</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-[#22c55e]">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm font-medium">+12.5%</span>
          <span className="text-xs text-[var(--text-muted)]">vs last {timeRange}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48">
        <AreaChart 
          data={data} 
          color={currentMetric.color}
          height={192}
          showGrid={true}
          showLabels={true}
          showTooltip={true}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-[var(--border-secondary)]">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            currentMetric.color === "lime" ? "bg-[#c8ff00]" :
            currentMetric.color === "purple" ? "bg-[#a78bfa]" : "bg-[#22c55e]"
          }`} />
          <span className="text-xs text-[var(--text-muted)]">{currentMetric.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
          <span className="text-xs text-[var(--text-muted)]">
            {timeRange === "week" ? "Last 7 days" : "Last 4 weeks"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
