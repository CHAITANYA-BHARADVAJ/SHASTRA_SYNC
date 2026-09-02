"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Send, 
  Smile,
  Heart,
  Coffee,
  Sun,
  Moon,
  ThumbsUp,
  Image,
  Mic,
  Sparkles
} from "lucide-react";

interface MessageComposerProps {
  isOpen: boolean;
  onClose: () => void;
  elderName: string;
  onSend: (message: string) => void | Promise<void>;
}

const quickMessages = [
  { icon: Heart, text: "Love you! ❤️", color: "#ef4444" },
  { icon: Coffee, text: "Had your tea?", color: "#f59e0b" },
  { icon: Sun, text: "Good morning!", color: "#c8ff00" },
  { icon: Moon, text: "Good night, sleep well!", color: "#a78bfa" },
  { icon: ThumbsUp, text: "Take care!", color: "#22c55e" },
  { icon: Smile, text: "Thinking of you!", color: "#f472b6" },
];

export function MessageComposer({ isOpen, onClose, elderName, onSend }: MessageComposerProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    setIsSending(true);
    
    try {
      // Actually send to backend
      await onSend(message);
      setMessage("");
      onClose();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickMessage = (text: string) => {
    setMessage(text);
  };

  const firstName = elderName.split(" ")[0];

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
            className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-50"
          >
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative p-5 border-b border-[var(--border-primary)] bg-gradient-to-r from-[#c8ff00]/10 to-[#a78bfa]/10">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#c8ff00] to-[#a78bfa] flex items-center justify-center text-[#1a1d29] font-bold text-lg">
                    {firstName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">
                      Message {firstName}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      Send a caring message
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

              {/* Quick Messages */}
              <div className="p-4 border-b border-[var(--border-primary)]">
                <p className="text-xs font-medium text-[var(--text-muted)] mb-3 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#c8ff00]" />
                  Quick Messages
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {quickMessages.map((qm, index) => {
                    const Icon = qm.icon;
                    return (
                      <motion.button
                        key={index}
                        onClick={() => handleQuickMessage(qm.text)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] transition-colors border border-transparent hover:border-[var(--border-primary)]"
                      >
                        <Icon className="w-5 h-5" style={{ color: qm.color }} />
                        <span className="text-[10px] text-[var(--text-muted)] text-center line-clamp-1">
                          {qm.text}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Message Input */}
              <div className="p-4">
                <div className="relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Write a message to ${firstName}...`}
                    rows={4}
                    className="w-full p-4 pr-12 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:border-[#c8ff00] transition-colors"
                  />
                  
                  {/* Character count */}
                  <span className="absolute bottom-3 right-3 text-[10px] text-[var(--text-muted)]">
                    {message.length}/500
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                      title="Add emoji"
                    >
                      <Smile className="w-5 h-5" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                      title="Add image"
                    >
                      <Image className="w-5 h-5" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                      title="Voice message"
                    >
                      <Mic className="w-5 h-5" />
                    </motion.button>
                  </div>

                  <motion.button
                    onClick={handleSend}
                    disabled={!message.trim() || isSending}
                    whileHover={{ scale: message.trim() ? 1.02 : 1 }}
                    whileTap={{ scale: message.trim() ? 0.98 : 1 }}
                    className={`
                      flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200
                      ${message.trim() 
                        ? "bg-[#c8ff00] text-[#1a1d29] shadow-lg shadow-[#c8ff00]/25 hover:shadow-[#c8ff00]/40" 
                        : "bg-[var(--bg-sunken)] text-[var(--text-muted)] cursor-not-allowed"
                      }
                    `}
                  >
                    {isSending ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-[#1a1d29] border-t-transparent rounded-full"
                        />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
