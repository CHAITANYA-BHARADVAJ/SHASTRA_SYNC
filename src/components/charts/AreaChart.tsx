"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface DataPoint {
  label: string;
  value: number;
}

interface AreaChartProps {
  data: DataPoint[];
  color?: "lime" | "purple" | "success" | "warning";
  height?: number;
  showGrid?: boolean;
  showLabels?: boolean;
  showTooltip?: boolean;
  animated?: boolean;
}

export function AreaChart({
  data,
  color = "lime",
  height = 200,
  showGrid = true,
  showLabels = true,
  showTooltip = true,
  animated = true,
}: AreaChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const colorMap = {
    lime: { 
      stroke: "#c8ff00", 
      fill: "lime-gradient",
      dot: "#c8ff00",
      glow: "rgba(200, 255, 0, 0.5)"
    },
    purple: { 
      stroke: "#a78bfa", 
      fill: "purple-gradient",
      dot: "#a78bfa",
      glow: "rgba(167, 139, 250, 0.5)"
    },
    success: { 
      stroke: "#22c55e", 
      fill: "success-gradient",
      dot: "#22c55e",
      glow: "rgba(34, 197, 94, 0.5)"
    },
    warning: { 
      stroke: "#f59e0b", 
      fill: "warning-gradient",
      dot: "#f59e0b",
      glow: "rgba(245, 158, 11, 0.5)"
    },
  };

  const colors = colorMap[color];
  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;

  const width = 100;
  const chartHeight = 70;
  const paddingTop = 5;
  const paddingBottom = showLabels ? 15 : 5;
  const paddingX = 2;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2);
    const y = paddingTop + (1 - (d.value - min) / range) * chartHeight;
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${paddingX} ${paddingTop + chartHeight} Z`;

  // Create smooth curve using bezier
  const smoothPathD = points.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    
    const prev = arr[i - 1];
    const cpx1 = prev.x + (point.x - prev.x) / 3;
    const cpx2 = prev.x + (point.x - prev.x) * 2 / 3;
    
    return `${acc} C ${cpx1} ${prev.y}, ${cpx2} ${point.y}, ${point.x} ${point.y}`;
  }, "");

  const smoothAreaD = `${smoothPathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${paddingX} ${paddingTop + chartHeight} Z`;

  return (
    <div className="relative" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${paddingTop + chartHeight + paddingBottom}`}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="lime-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c8ff00" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#c8ff00" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#c8ff00" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="purple-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="success-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#22c55e" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="warning-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {showGrid && (
          <g className="opacity-20">
            {[0, 25, 50, 75, 100].map((percent) => (
              <line
                key={percent}
                x1={paddingX}
                y1={paddingTop + (chartHeight * percent) / 100}
                x2={width - paddingX}
                y2={paddingTop + (chartHeight * percent) / 100}
                stroke="currentColor"
                strokeWidth="0.3"
                strokeDasharray="2 2"
              />
            ))}
          </g>
        )}

        {/* Filled area */}
        <motion.path
          d={smoothAreaD}
          fill={`url(#${colors.fill})`}
          initial={animated ? { opacity: 0 } : undefined}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* Line */}
        <motion.path
          d={smoothPathD}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={animated ? { pathLength: 0, opacity: 0 } : undefined}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        {/* Interactive areas & dots */}
        {points.map((point, index) => (
          <g key={index}>
            {/* Invisible hit area */}
            {showTooltip && (
              <rect
                x={point.x - (width / data.length) / 2}
                y={paddingTop}
                width={width / data.length}
                height={chartHeight}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              />
            )}

            {/* Vertical line on hover */}
            {hoveredIndex === index && (
              <motion.line
                x1={point.x}
                y1={paddingTop}
                x2={point.x}
                y2={paddingTop + chartHeight}
                stroke={colors.stroke}
                strokeWidth="1"
                strokeDasharray="3 3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
              />
            )}

            {/* Dot */}
            <motion.circle
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === index ? 5 : 3}
              fill={colors.dot}
              initial={animated ? { scale: 0 } : undefined}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8 + index * 0.05 }}
              style={{
                filter: hoveredIndex === index ? `drop-shadow(0 0 6px ${colors.glow})` : undefined,
              }}
            />
          </g>
        ))}

        {/* X-axis labels */}
        {showLabels && (
          <g>
            {points.map((point, index) => (
              // Only show some labels to avoid crowding
              (index === 0 || index === points.length - 1 || index % Math.ceil(data.length / 5) === 0) && (
                <text
                  key={index}
                  x={point.x}
                  y={paddingTop + chartHeight + 10}
                  textAnchor="middle"
                  className="text-[3px] fill-current opacity-50"
                  style={{ fontSize: "3px" }}
                >
                  {point.label}
                </text>
              )
            ))}
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {showTooltip && hoveredIndex !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute pointer-events-none px-3 py-2 rounded-lg text-xs font-medium"
          style={{
            left: `${(hoveredIndex / (data.length - 1)) * 100}%`,
            top: "10%",
            transform: "translateX(-50%)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-primary)",
            boxShadow: "var(--shadow-lg)",
            color: "var(--text-primary)",
          }}
        >
          <div className="font-bold" style={{ color: colors.stroke }}>
            {data[hoveredIndex].value}
          </div>
          <div className="text-[10px] opacity-70">{data[hoveredIndex].label}</div>
        </motion.div>
      )}
    </div>
  );
}
