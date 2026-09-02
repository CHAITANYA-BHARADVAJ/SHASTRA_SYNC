"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Phone,
  MapPin,
  Heart,
  Pill,
  Bell,
  Shield,
  Mail,
  Calendar,
  Edit3,
  LogOut,
} from "lucide-react";
import { ElderProfile as ElderProfileType } from "@/types/alerts";

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  elder: ElderProfileType;
  onSignOut?: () => void;
  onToast?: (type: "success" | "error", title: string, message?: string) => void;
}

export function ProfilePanel({ isOpen, onClose, elder, onSignOut, onToast }: ProfilePanelProps) {
  const familyMember = {
    name: "Priya Sharma",
    relation: "Daughter (Primary Caregiver)",
    email: "priya.sharma@email.com",
    phone: "+91 98765 12345",
  };

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
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] shadow-2xl overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[var(--bg-secondary)]/90 backdrop-blur-xl border-b border-[var(--border-primary)]">
              <div className="flex items-center justify-between p-5">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Profile</h2>
                  <p className="text-sm text-[var(--text-muted)]">Family & elder details</p>
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
            <div className="p-5 space-y-6">
              {/* Family Member Card */}
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                  Your Account
                </h3>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#c8ff00]/10 to-[#a78bfa]/10 border border-[var(--card-border)]">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c8ff00] to-[#a78bfa] flex items-center justify-center text-[#1a1d29] font-bold text-xl">
                      {familyMember.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-[var(--text-primary)]">{familyMember.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{familyMember.relation}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                      <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                      {familyMember.email}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                      <Phone className="w-4 h-4 text-[var(--text-muted)]" />
                      {familyMember.phone}
                    </div>
                  </div>
                  <motion.button
                    onClick={() => onToast?.("success", "Profile", "Edit profile coming soon")}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--bg-tertiary)] text-sm font-medium text-[var(--text-primary)] border border-[var(--border-primary)] hover:border-[#c8ff00]/50 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Profile
                  </motion.button>
                </div>
              </div>

              {/* Elder Being Monitored */}
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                  Monitoring
                </h3>
                <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)]">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center text-white font-bold text-xl">
                      {elder.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-[var(--text-primary)]">{elder.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{elder.age} years old</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-[#22c55e]/10 text-[#22c55e] text-xs font-semibold capitalize">
                      {elder.status}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                      <span className="text-[var(--text-secondary)]">{elder.address}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-[var(--text-secondary)]">{elder.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Shield className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-[var(--text-secondary)]">
                        Emergency: {elder.emergencyContact} • {elder.emergencyPhone}
                      </span>
                    </div>
                  </div>

                  {/* Medical Conditions */}
                  <div className="mt-4 pt-4 border-t border-[var(--border-primary)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4 text-[#ef4444]" />
                      <span className="text-xs font-semibold text-[var(--text-primary)]">Conditions</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {elder.medicalConditions.map((c) => (
                        <span key={c} className="px-2.5 py-1 rounded-lg bg-[#ef4444]/10 text-[#ef4444] text-xs font-medium">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Medications */}
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="w-4 h-4 text-[#a78bfa]" />
                      <span className="text-xs font-semibold text-[var(--text-primary)]">Medications</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {elder.medications.map((m) => (
                        <span key={m} className="px-2.5 py-1 rounded-lg bg-[#a78bfa]/10 text-[#a78bfa] text-xs font-medium">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sign Out */}
              <motion.button
                onClick={onSignOut}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#ef4444]/10 text-[#ef4444] font-semibold border border-[#ef4444]/20 hover:bg-[#ef4444]/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
