"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Calendar,
  Clock,
  Plus,
  Stethoscope,
  Pill,
  Phone,
  Heart,
  User,
  ChevronLeft,
  ChevronRight,
  Check,
  Trash2
} from "lucide-react";

interface ScheduleManagerProps {
  isOpen: boolean;
  onClose: () => void;
  elderName: string;
  onToast: (type: "success" | "error", title: string, message?: string) => void;
}

interface Appointment {
  id: string;
  title: string;
  type: "doctor" | "medication" | "call" | "checkup" | "other";
  date: Date;
  time: string;
  notes?: string;
  completed: boolean;
}

const appointmentTypes = [
  { id: "doctor", label: "Doctor Visit", icon: Stethoscope, color: "#3b82f6" },
  { id: "medication", label: "Medication", icon: Pill, color: "#a78bfa" },
  { id: "call", label: "Video Call", icon: Phone, color: "#22c55e" },
  { id: "checkup", label: "Health Check", icon: Heart, color: "#ef4444" },
  { id: "other", label: "Other", icon: User, color: "#f59e0b" },
];

export function ScheduleManager({ isOpen, onClose, elderName, onToast }: ScheduleManagerProps) {
  const [view, setView] = useState<"list" | "add">("list");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: "1",
      title: "Dr. Sharma - Cardiology",
      type: "doctor",
      date: new Date(Date.now() + 86400000 * 2),
      time: "10:00 AM",
      notes: "Regular heart checkup",
      completed: false,
    },
    {
      id: "2",
      title: "Blood Pressure Check",
      type: "checkup",
      date: new Date(Date.now() + 86400000),
      time: "09:00 AM",
      completed: false,
    },
    {
      id: "3",
      title: "Family Video Call",
      type: "call",
      date: new Date(),
      time: "06:00 PM",
      completed: true,
    },
  ]);

  // New appointment form state
  const [newAppointment, setNewAppointment] = useState({
    title: "",
    type: "doctor" as string,
    date: "",
    time: "",
    notes: "",
  });

  const firstName = elderName.split(" ")[0];

  const handleAddAppointment = () => {
    if (!newAppointment.title || !newAppointment.date || !newAppointment.time) {
      onToast("error", "Missing Info", "Please fill in all required fields");
      return;
    }

    const appointment: Appointment = {
      id: Date.now().toString(),
      title: newAppointment.title,
      type: newAppointment.type as Appointment["type"],
      date: new Date(newAppointment.date),
      time: newAppointment.time,
      notes: newAppointment.notes,
      completed: false,
    };

    setAppointments(prev => [...prev, appointment]);
    setNewAppointment({ title: "", type: "doctor", date: "", time: "", notes: "" });
    setView("list");
    onToast("success", "Scheduled", `Appointment added for ${firstName}`);
  };

  const handleToggleComplete = (id: string) => {
    setAppointments(prev => 
      prev.map(apt => apt.id === id ? { ...apt, completed: !apt.completed } : apt)
    );
  };

  const handleDelete = (id: string) => {
    setAppointments(prev => prev.filter(apt => apt.id !== id));
    onToast("success", "Removed", "Appointment has been removed");
  };

  const getTypeConfig = (type: string) => {
    return appointmentTypes.find(t => t.id === type) || appointmentTypes[4];
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const upcomingAppointments = appointments
    .filter(apt => !apt.completed)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const completedAppointments = appointments.filter(apt => apt.completed);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[5%] bottom-[5%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg md:top-[10%] md:bottom-auto z-50"
          >
            <div className="h-full md:h-auto bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:max-h-[80vh]">
              {/* Header */}
              <div className="relative p-5 border-b border-[var(--border-primary)] bg-gradient-to-r from-[#f472b6]/10 to-[#a78bfa]/10 flex-shrink-0">
                <div className="flex items-center gap-4">
                  {view === "add" && (
                    <motion.button
                      onClick={() => setView("list")}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </motion.button>
                  )}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f472b6] to-[#a78bfa] flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">
                      {view === "list" ? `${firstName}'s Schedule` : "New Appointment"}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      {view === "list" ? `${upcomingAppointments.length} upcoming` : "Add a new event"}
                    </p>
                  </div>
                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5">
                <AnimatePresence mode="wait">
                  {view === "list" ? (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      {/* Add Button */}
                      <motion.button
                        onClick={() => setView("add")}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full flex items-center justify-center gap-2 py-3 mb-5 rounded-xl border-2 border-dashed border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#c8ff00]/50 hover:bg-[#c8ff00]/5 transition-all"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="font-medium">Add Appointment</span>
                      </motion.button>

                      {/* Upcoming */}
                      {upcomingAppointments.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                            Upcoming
                          </h4>
                          <div className="space-y-3">
                            {upcomingAppointments.map((apt) => {
                              const typeConfig = getTypeConfig(apt.type);
                              const TypeIcon = typeConfig.icon;
                              return (
                                <motion.div
                                  key={apt.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)] border border-transparent hover:border-[var(--border-primary)] transition-colors"
                                >
                                  <div 
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: `${typeConfig.color}20` }}
                                  >
                                    <TypeIcon className="w-5 h-5" style={{ color: typeConfig.color }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-[var(--text-primary)] truncate">{apt.title}</p>
                                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                      <span>{formatDate(apt.date)}</span>
                                      <span>•</span>
                                      <span>{apt.time}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <motion.button
                                      onClick={() => handleToggleComplete(apt.id)}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors"
                                    >
                                      <Check className="w-4 h-4" />
                                    </motion.button>
                                    <motion.button
                                      onClick={() => handleDelete(apt.id)}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </motion.button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Completed */}
                      {completedAppointments.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                            Completed
                          </h4>
                          <div className="space-y-2">
                            {completedAppointments.map((apt) => {
                              const typeConfig = getTypeConfig(apt.type);
                              const TypeIcon = typeConfig.icon;
                              return (
                                <div
                                  key={apt.id}
                                  className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]/50 opacity-60"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-[#22c55e]/10 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-[#22c55e]" />
                                  </div>
                                  <p className="flex-1 text-sm text-[var(--text-muted)] line-through">{apt.title}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {appointments.length === 0 && (
                        <div className="text-center py-12">
                          <Calendar className="w-12 h-12 mx-auto mb-4 text-[var(--text-muted)]" />
                          <p className="text-[var(--text-primary)] font-medium">No appointments</p>
                          <p className="text-sm text-[var(--text-muted)]">Add an appointment to get started</p>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="add"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      {/* Type Selection */}
                      <div>
                        <label className="text-xs font-medium text-[var(--text-muted)] mb-2 block">Type</label>
                        <div className="grid grid-cols-5 gap-2">
                          {appointmentTypes.map((type) => {
                            const Icon = type.icon;
                            const isSelected = newAppointment.type === type.id;
                            return (
                              <motion.button
                                key={type.id}
                                onClick={() => setNewAppointment(prev => ({ ...prev, type: type.id }))}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`
                                  flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all
                                  ${isSelected 
                                    ? "border-current bg-current/10" 
                                    : "border-transparent bg-[var(--bg-tertiary)] hover:border-[var(--border-primary)]"
                                  }
                                `}
                                style={{ 
                                  borderColor: isSelected ? type.color : undefined,
                                  color: isSelected ? type.color : undefined
                                }}
                              >
                                <Icon className="w-5 h-5" style={{ color: isSelected ? type.color : "var(--text-muted)" }} />
                                <span className={`text-[9px] ${isSelected ? "" : "text-[var(--text-muted)]"}`}>
                                  {type.label.split(" ")[0]}
                                </span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Title */}
                      <div>
                        <label className="text-xs font-medium text-[var(--text-muted)] mb-2 block">Title *</label>
                        <input
                          type="text"
                          value={newAppointment.title}
                          onChange={(e) => setNewAppointment(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g., Dr. Sharma - Cardiology"
                          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#c8ff00] transition-colors"
                        />
                      </div>

                      {/* Date & Time */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-[var(--text-muted)] mb-2 block">Date *</label>
                          <input
                            type="date"
                            value={newAppointment.date}
                            onChange={(e) => setNewAppointment(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[#c8ff00] transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-[var(--text-muted)] mb-2 block">Time *</label>
                          <input
                            type="time"
                            value={newAppointment.time}
                            onChange={(e) => setNewAppointment(prev => ({ ...prev, time: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[#c8ff00] transition-colors"
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="text-xs font-medium text-[var(--text-muted)] mb-2 block">Notes (optional)</label>
                        <textarea
                          value={newAppointment.notes}
                          onChange={(e) => setNewAppointment(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Add any notes..."
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:border-[#c8ff00] transition-colors"
                        />
                      </div>

                      {/* Submit */}
                      <motion.button
                        onClick={handleAddAppointment}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full py-3 rounded-xl bg-[#c8ff00] text-[#1a1d29] font-semibold shadow-lg shadow-[#c8ff00]/25"
                      >
                        Add Appointment
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
