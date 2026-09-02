"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Filter, X } from "lucide-react";

export type SeverityFilter = "all" | "critical" | "high" | "medium" | "low";
export type StatusFilter = "all" | "unread" | "acknowledged";

interface AlertFiltersProps {
  onFilterChange: (filters: {
    severity: SeverityFilter;
    status: StatusFilter;
    search: string;
  }) => void;
  totalCount: number;
  filteredCount: number;
}

export function AlertFilters({ onFilterChange, totalCount, filteredCount }: AlertFiltersProps) {
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    onFilterChange({ severity, status, search });
  }, [severity, status, search, onFilterChange]);

  const severityOptions: { value: SeverityFilter; label: string; color: string }[] = [
    { value: "all", label: "All", color: "var(--text-muted)" },
    { value: "critical", label: "Critical", color: "#ef4444" },
    { value: "high", label: "High", color: "#f59e0b" },
    { value: "medium", label: "Medium", color: "#a78bfa" },
    { value: "low", label: "Low", color: "#3b82f6" },
  ];

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "unread", label: "Unread" },
    { value: "acknowledged", label: "Read" },
  ];

  const hasActiveFilters = severity !== "all" || status !== "all" || search !== "";

  const clearFilters = () => {
    setSeverity("all");
    setStatus("all");
    setSearch("");
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search alerts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#c8ff00] transition-colors"
        />
        {search && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="w-3 h-3" />
          </motion.button>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Severity Filter */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-sunken)]">
          {severityOptions.map((option) => (
            <motion.button
              key={option.value}
              onClick={() => setSeverity(option.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                ${severity === option.value 
                  ? "bg-[var(--card-bg)] shadow-sm text-[var(--text-primary)]" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }
              `}
            >
              {option.value !== "all" && (
                <span 
                  className="inline-block w-2 h-2 rounded-full mr-1.5"
                  style={{ backgroundColor: option.color }}
                />
              )}
              {option.label}
            </motion.button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-sunken)]">
          {statusOptions.map((option) => (
            <motion.button
              key={option.value}
              onClick={() => setStatus(option.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                ${status === option.value 
                  ? "bg-[var(--card-bg)] shadow-sm text-[var(--text-primary)]" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }
              `}
            >
              {option.label}
            </motion.button>
          ))}
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </motion.button>
        )}

        {/* Count */}
        <span className="ml-auto text-xs text-[var(--text-muted)]">
          {filteredCount === totalCount 
            ? `${totalCount} alerts` 
            : `${filteredCount} of ${totalCount}`
          }
        </span>
      </div>
    </div>
  );
}
