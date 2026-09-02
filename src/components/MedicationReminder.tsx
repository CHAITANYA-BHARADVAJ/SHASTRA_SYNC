"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Pill, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Bell,
  Sparkles,
  Brain,
  MoreHorizontal
} from "lucide-react";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
  takenAt?: Date;
}

interface MedicationReminderProps {
  elderId?: string;
  elderName?: string;
}

export function MedicationReminder({ elderId = "kamala_001", elderName = "Elder" }: MedicationReminderProps) {
  const [medications, setMedications] = useState<Medication[]>([
    { id: "1", name: "Metformin", dosage: "500mg", time: "08:00 AM", taken: true, takenAt: new Date(Date.now() - 3600000 * 4) },
    { id: "2", name: "Lisinopril", dosage: "10mg", time: "08:00 AM", taken: true, takenAt: new Date(Date.now() - 3600000 * 4) },
    { id: "3", name: "Aspirin", dosage: "81mg", time: "12:00 PM", taken: true, takenAt: new Date(Date.now() - 3600000 * 1) },
    { id: "4", name: "Atorvastatin", dosage: "20mg", time: "08:00 PM", taken: false },
  ]);

  // Simulate AI updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMedications(prev => {
        const pending = prev.filter(m => !m.taken);
        if (pending.length > 0 && Math.random() > 0.7) {
          const toUpdate = pending[0];
          return prev.map(m => 
            m.id === toUpdate.id ? { ...m, taken: true, takenAt: new Date() } : m
          );
        }
        return prev;
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const takenCount = medications.filter(m => m.taken).length;
  const totalCount = medications.length;
  const progress = totalCount > 0 ? (takenCount / totalCount) * 100 : 0;

  const getNextMedication = () => {
    const pending = medications.filter(m => !m.taken);
    return pending[0];
  };

  const nextMed = getNextMedication();

  const formatTime = (date?: Date) => {
    if (!date) return "";
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <motion.div 
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] flex items-center justify-center"
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Pill className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Medications</h3>
            <div className="flex items-center gap-1 text-xs text-[#c8ff00]">
              <Brain className="w-3 h-3" />
              <span>AI Monitored</span>
            </div>
          </div>
        </div>
        
        {/* Completion badge */}
        <div className={`
          px-3 py-1.5 rounded-xl text-xs font-bold
          ${progress === 100 
            ? "bg-[#22c55e]/10 text-[#22c55e]" 
            : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
          }
        `}>
          {takenCount}/{totalCount}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-[var(--text-muted)]">Today&apos;s Progress</span>
          <span className="font-semibold text-[var(--text-primary)]">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-[var(--bg-sunken)] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#c8ff00] to-[#a3e635]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Next Medication Alert */}
      {nextMed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/20"
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="w-9 h-9 rounded-lg bg-[#f59e0b] flex items-center justify-center"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Bell className="w-4 h-4 text-white" />
            </motion.div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {nextMed.name} {nextMed.dosage}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Scheduled: {nextMed.time}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Medication List */}
      <div className="space-y-2">
        {medications.map((med, index) => (
          <motion.div
            key={med.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`
              flex items-center gap-3 p-3 rounded-xl transition-all duration-200
              ${med.taken 
                ? "bg-[#22c55e]/5 border border-[#22c55e]/10" 
                : "bg-[var(--bg-tertiary)] border border-transparent"
              }
            `}
          >
            {/* Status Icon */}
            <div className={`
              w-9 h-9 rounded-lg flex items-center justify-center
              ${med.taken 
                ? "bg-[#22c55e]" 
                : "bg-[var(--bg-sunken)]"
              }
            `}>
              {med.taken ? (
                <CheckCircle className="w-4 h-4 text-white" />
              ) : (
                <Clock className="w-4 h-4 text-[var(--text-muted)]" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${med.taken ? "text-[#22c55e]" : "text-[var(--text-primary)]"}`}>
                {med.name}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {med.dosage} • {med.time}
              </p>
            </div>

            {/* Status */}
            {med.taken ? (
              <div className="flex items-center gap-1 text-[10px] text-[#22c55e]">
                <Sparkles className="w-3 h-3" />
                <span>{formatTime(med.takenAt)}</span>
              </div>
            ) : (
              <span className="px-2 py-1 rounded-md bg-[var(--bg-sunken)] text-[10px] font-medium text-[var(--text-muted)]">
                Pending
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      {takenCount === totalCount && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 pt-4 border-t border-[var(--border-primary)] text-center"
        >
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#22c55e]">
            <Sparkles className="w-4 h-4" />
            All medications taken today!
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
