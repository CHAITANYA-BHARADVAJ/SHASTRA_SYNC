"use client";

import { motion } from "framer-motion";

interface SparklineChartProps {
  data: number[];
  color?: "lime" | "purple" | "success" | "warning" | "danger";
  height?: number;
  showDots?: boolean;
  animated?: boolean;
  filled?: boolean;
}

export function SparklineChart({
  data,
  color = "lime",
  height = 40,
  showDots = false,
  animated = true,
  filled = true,
}: SparklineChartProps) {
  const colorMap = {
    lime: { stroke: "#c8ff00", fill: "rgba(200, 255, 0, 0.2)" },
    purple: { stroke: "#a78bfa", fill: "rgba(167, 139, 250, 0.2)" },
    success: { stroke: "#22c55e", fill: "rgba(34, 197, 94, 0.2)" },
    warning: { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.2)" },
    danger: { stroke: "#ef4444", fill: "rgba(239, 68, 68, 0.2)" },
  };

  const colors = colorMap[color];
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const width = 100;
  const padding = 2;
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;
  
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return { x, y, value };
  });

  const pathD = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colors.stroke} stopOpacity="0.3" />
          <stop offset="100%" stopColor={colors.stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Filled area */}
      {filled && (
        <motion.path
          d={areaD}
          fill={`url(#gradient-${color})`}
          initial={animated ? { opacity: 0 } : undefined}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}

      {/* Line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={colors.stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animated ? { pathLength: 0 } : undefined}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />

      {/* Dots */}
      {showDots &&
        points.map((point, index) => (
          <motion.circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3"
            fill={colors.stroke}
            initial={animated ? { scale: 0 } : undefined}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
          />
        ))}

      {/* End dot (always visible) */}
      <motion.circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="4"
        fill={colors.stroke}
        initial={animated ? { scale: 0 } : undefined}
        animate={{ scale: 1 }}
        transition={{ delay: 0.8, duration: 0.3, type: "spring" }}
      />
    </svg>
  );
}
