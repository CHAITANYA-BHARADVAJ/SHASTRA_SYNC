"use client";

import { motion } from "framer-motion";

interface DonutSegment {
  value: number;
  color: string;
  label?: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerContent?: React.ReactNode;
  animated?: boolean;
}

export function DonutChart({
  segments,
  size = 120,
  strokeWidth = 12,
  centerContent,
  animated = true,
}: DonutChartProps) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedOffset = 0;

  return (
    <div className="donut-chart" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--bg-sunken)"
          strokeWidth={strokeWidth}
        />

        {/* Segments */}
        {segments.map((segment, index) => {
          const segmentLength = (segment.value / total) * circumference;
          const offset = accumulatedOffset;
          accumulatedOffset += segmentLength;

          return (
            <motion.circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${segmentLength} ${circumference}`}
              strokeDashoffset={-offset}
              initial={animated ? { strokeDasharray: `0 ${circumference}` } : undefined}
              animate={{ strokeDasharray: `${segmentLength} ${circumference}` }}
              transition={{ duration: 1, delay: index * 0.15, ease: "easeOut" }}
            />
          );
        })}
      </svg>

      {/* Center content */}
      {centerContent && (
        <motion.div
          className="donut-chart-center"
          initial={animated ? { opacity: 0, scale: 0.8 } : undefined}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          {centerContent}
        </motion.div>
      )}
    </div>
  );
}

// Preset color schemes
export const donutColors = {
  health: ["#22c55e", "#c8ff00", "#a78bfa", "#f472b6"],
  status: ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6"],
  activity: ["#c8ff00", "#a78bfa", "#22c55e", "#f59e0b"],
};
