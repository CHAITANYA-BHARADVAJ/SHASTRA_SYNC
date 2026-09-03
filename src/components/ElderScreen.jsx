import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useVoiceHandler } from '../hooks/useVoiceHandler';
import { useCheckInScheduler } from '../hooks/useCheckInScheduler';
import CheckInCard from './CheckInCard';
import { FallEmergencyModal } from './FallEmergencyModal';
import { postSensorEvent, postDecision, fetchLatestEvents, fetchLatestDecisions } from '../api/api';
import { playEmergencyAlarm, playGentleChime, playSuccessChime } from '../utils/audioChimes';
import { localizeMessage, getLocalizedTierLabel } from '../utils/translator';
import './ElderScreen.css';

const ELDER_ID = import.meta.env.VITE_ELDER_ID || 'elder_kamala_001';

/**
 * UI Translations (English)
 */
const I18N = {
  'en-IN': {
    appName: 'SHASTRA GUARDIAN',
    appSub: 'Elder Companion & Safety',
    familySynced: 'Family Synced',
    calmStatus: 'Kamala is Safe & Comfortable',
    calmSub: 'ShastraVision Active • Vitals & Posture Normal',
    listening: 'Listening...',
    listeningSub: 'Speak naturally in your language',
    sentConfirmation: '✓ Dispatched to Care Team',
    sosSentStatus: 'Emergency SOS Dispatched',
    sosSentSub: 'Dispatched to 112 & Family • Help on the way',
    speakingStatus: 'Companion Speaking...',
    speakingSub: 'Empathetic voice assistant responding',
    reconnectingStatus: 'Reconnecting to Cloud',
    reconnectingSub: 'Re-establishing live medical WebSocket stream',

    // Companion Persona
    companionGreeting: 'Hello, Kamala',
    companionGreetingSub: "I'm your personal care companion. How are you feeling today?",
    companionPresenceHint: 'Tap anytime to ask questions, report symptoms, or chat',
    companionIdleBubble: 'Feel free to talk with me about your health, medicines, or how your day is going.',
    companionYouSaid: 'You said:',
    companionReplayBtn: '🔊 Replay Voice',

    // Family Glance Card
    familyGlanceTitle: 'Family Message',
    familyGlanceSender: 'Priya (Daughter)',
    familyGlanceTime: '10m ago',
    familyGlanceNote: 'Had breakfast Amma? Don\'t forget your afternoon medicine, visiting this evening! ❤️',
    familyQuickReply: '❤️ Send "I\'m Doing Well"',
    familyReplySent: '✓ Quick reply sent to Priya',

    // Primary SOS Tile
    sosBadge: 'Emergency Help • 112',
    sosBtnLabel: 'I Need Help',
    sosBtnSub: 'Immediate alert to 112 & family',
    sosBtnActiveLabel: 'Help Requested',
    sosBtnActiveSub: '112 & family alerted • Help is coming',

    // 3 Major Action Buttons
    callFamilyBadge: 'Family Direct',
    callFamilyBtn: 'Call Priya',
    callFamilySub: 'Priya (Daughter) • Instant phone call',
    callFamilyStatus: 'Calling Priya directly...',

    // Daily Mood / Rhythm Row
    moodRowTitle: "Today's Wellness & Rhythm",
    moodGood: 'Energetic',
    moodCalm: 'Peaceful',
    moodResting: 'Resting',
    moodRecordedToast: 'Wellness state shared with family',

    // Voice Intercom Dock
    voiceBadge: 'Care Companion',
    voiceIntercomLabel: 'Speak freely with your companion',
    voiceIntercomSub: 'Ask health questions, report symptoms, or chat anytime',
    talkBtnTapToSpeak: 'Tap to Talk With Me',
    talkBtnListening: 'Listening to you...',
    talkBtnSpeakNow: 'Speak clearly now',

    // Medication Tracker
    medTrackerTitle: 'Medication Schedule',
    medTakenBadge: 'Taken',
    medDueBadge: 'Due Now',
    medMarkTakenBtn: '✓ Took This',

    // Fall & Vision Perception Translations
    fallAlertTitle: 'Did you fall?',
    fallAlertPrompt: 'ShastraVision detected a sudden fall or posture anomaly. Are you okay?',
    fallVoiceCheck: 'Kamala, did you fall? Are you okay? Please speak or press the button.',
    emotionSadPrompt: 'I noticed you might be feeling sad or distressed. I am right here with you. How can I help?',
    emotionFearPrompt: 'Do not worry, you are safe. I am right here with you.',
    inactivityPrompt: 'Checking in to see if you are resting comfortably.',

    // Escalation Mode Translations
    alertTitle: 'Are you okay?',
    alertSub: 'Emergency Guardian detected an anomaly • Please confirm you are safe',
    yesImFineBtn: 'I\'M OKAY — STOP TIMER',
    yesImFineSub: 'Reset and cancel emergency escalation',
    fineConfirmationTts: 'Glad you are safe. Escalation cancelled.',
    escalationWarning: 'Auto-escalating to Family & 112 if no response',

    // Escalation Tiers
    tier1: 'Tier 1: Voice Check-in',
    tier2: 'Tier 2: Caregiver Ring & Escalation Pending',
    tier3: 'Tier 3: Caregiver Escalation & Emergency Dispatch',
    secondsShort: 's',

    // Alert Actions & Subtexts
    streamingAudioSub: 'Streaming audio response live',
    speakToExplainSub: 'Speak to explain your situation',
    sosEmergencyBadge: '(112 Emergency)',

    // Voice & Telemetry
    telemetryHubLabel: 'Hub Link:',
    telemetryHubConnected: 'Connected',
    telemetryHubReconnecting: 'Reconnecting',
    telemetryVoiceLabel: 'Voice:',
    telemetryVoiceReady: 'Ready',
    telemetryVoiceListening: 'Listening',
    telemetryVoiceSpeaking: 'Speaking',
    toolVisionSim: '👁️ Vision Sim',
    toolCheckIns: '📋 Check-ins',
    toolSteadiness: '🚶 Steadiness',

    // Voice States
    voiceStateListening: '● LISTENING',
    voiceStateSpeaking: '● SPEAKING',
    voiceStateReady: '● READY',
    liveSpeechStream: 'LIVE SPEECH STREAM:',
    dialFamilyPill: 'DIAL 📞',
    voiceIssueHeadline: 'Voice issue — tap to retry',
    voiceIssueDetail: 'Microphone permission check recommended',

    // Drawers
    drawerVisionTitle: '👁️ ShastraVision Perception Stream Triggers:',
    drawerTriggerFall: '💥 Trigger Fall Detected',
    drawerTriggerSad: '😢 Trigger Distress (Sad)',
    drawerTriggerFear: '😨 Trigger Distress (Fear)',
    drawerTriggerInactivity: '🛑 Trigger Inactivity',
    drawerCheckInTitle: '📋 Health Check-Ins:',
    drawerCognitive: '🧠 Cognitive Check',
    drawerBreakfast: '🥣 Breakfast',
    drawerLunch: '🍲 Lunch',
    drawerSleep: '🌙 Sleep Quality',
    drawerMobility: '🚶 Mobility steadiness',
  },
};

/**
 * Build a SensorEvent payload strictly matching Schema A.
 */
function buildSensorEvent({
  eventType = 'voice_input',
  confidence = 1.0,
  voiceTranscript = null,
  emotion = null,
}) {
  return {
    type: 'SensorEvent',
    event_id: crypto.randomUUID(),
    elder_id: ELDER_ID,
    event_type: eventType,
    confidence,
    voice_transcript: voiceTranscript,
    emotion,
    timestamp: new Date().toISOString(),
  };
}

export default function ElderScreen() {
  const { isConnected, lastMessage, sendMessage } = useWebSocket();
  const {
    speakThenListen,
    speak,
    listen,
    stop,
    finishListening,
    isSpeaking,
    isListening,
    error: voiceError,
    secondsLeft,
    interimText,
  } = useVoiceHandler();

  const [sosSent, setSosSent] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [moodToast, setMoodToast] = useState(null);
  const [familyReplied, setFamilyReplied] = useState(false);
  const [familyVoiceReplyActive, setFamilyVoiceReplyActive] = useState(false);
  const [lastSpokenText, setLastSpokenText] = useState(null);
  const [selectedLang] = useState('en-IN');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCheckInMenu, setShowCheckInMenu] = useState(false);
  const [showVisionMenu, setShowVisionMenu] = useState(false);
  const [showMedDrawer, setShowMedDrawer] = useState(false);
  const [showFamilySimMenu, setShowFamilySimMenu] = useState(false);

  // Default Idle Family Message
  const DEFAULT_FAMILY_MESSAGE = {
    sender: 'Priya (Daughter)',
    text: "Hello! I'm here if you need anything. Just let me know whenever you'd like to talk.",
    time: 'Just now',
    timestamp: Date.now(),
  };

  // Live Family Dashboard Bidirectional State
  const [familyMessage, setFamilyMessage] = useState(DEFAULT_FAMILY_MESSAGE);
  const [incomingCall, setIncomingCall] = useState(null); // { caller: string, timestamp: number }
  const [activeCall, setActiveCall] = useState(null); // { call_id: string, caller: string, startTime: number }
  const [activeCallDuration, setActiveCallDuration] = useState(0);
  const handledCallsRef = useRef(new Set());
  const activeCallRef = useRef(null);
  activeCallRef.current = activeCall;

  useEffect(() => {
    if (!activeCall) {
      setActiveCallDuration(0);
      return;
    }
    const interval = setInterval(() => {
      setActiveCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall]);

  const formatCallDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  const [familyAck, setFamilyAck] = useState(null); // { acknowledgedBy: string, message: string, timestamp: number }
  const [aiAgentStatus, setAiAgentStatus] = useState(null); // { action: string, message: string, reasoning: string }

  // Scheduled Medications State
  const [medications, setMedications] = useState([
    {
      id: 'med_bp',
      name: 'Amlodipine 5mg (BP)',
      nameKn: 'ರಕ್ತದೊತ್ತಡದ ಮಾತ್ರೆ (BP)',
      nameHi: 'ब्लड प्रेशर की दवा (BP)',
      timeSlot: 'Morning 8:00 AM',
      timeSlotKn: 'ಬೆಳಗ್ಗೆ ೮:೦೦',
      timeSlotHi: 'सुबह ८:००',
      icon: '🌅',
      taken: true,
      timeTaken: '8:15 AM',
      dueNow: false,
    },
    {
      id: 'med_calcium',
      name: 'Calcium + Vit D3',
      nameKn: 'ಕ್ಯಾಲ್ಸಿಯಂ & ವಿಟಮಿನ್ ಡಿ',
      nameHi: 'कैल्शियम & विटामिन डी',
      timeSlot: 'Afternoon 1:30 PM',
      timeSlotKn: 'ಮಧ್ಯಾಹ್ನ ೧:೩೦',
      timeSlotHi: 'दोपहर १:३०',
      icon: '☀️',
      taken: false,
      dueNow: true,
    },
    {
      id: 'med_sugar',
      name: 'Metformin 500mg',
      nameKn: 'ಸಕ್ಕರೆ ಕಾಯಿಲೆ ಮಾತ್ರೆ (Sugar)',
      nameHi: 'शुगर की दवा (Sugar)',
      timeSlot: 'Night 8:30 PM',
      timeSlotKn: 'ರಾತ್ರಿ ೮:೩೦',
      timeSlotHi: 'रात ८:३०',
      icon: '🌙',
      taken: false,
      dueNow: false,
    },
  ]);

  // Fall Emergency Modal State
  const [fallModalOpen, setFallModalOpen] = useState(false);
  const [fallReason, setFallReason] = useState('');

  // Dedicated Outgoing Call Modal State (Calling Priya)
  const [outgoingCall, setOutgoingCall] = useState(null);

  // Full Screen Incoming Backend Alert & Privilege Escalation Mode State
  const [backendAlertActive, setBackendAlertActive] = useState(false);
  const [incomingAlertMessage, setIncomingAlertMessage] = useState(null);
  const [rawAlertMessage, setRawAlertMessage] = useState(null);
  const [escalationTierKey, setEscalationTierKey] = useState('tier1');
  const [escalationSecondsLeft, setEscalationSecondsLeft] = useState(15);

  const t = I18N['en-IN'];

  // Concurrency & Debounce Guards
  const processedDecisionsRef = useRef(new Set());
  const displayTimeoutRef = useRef(null);
  const escalationTimerRef = useRef(null);
  const familyMessageResetTimerRef = useRef(null);
  const lastSosTimeRef = useRef(0);
  const lastTalkTimeRef = useRef(0);
  // Cooldown guard: suppress new alerts for N ms after user dismisses one
  const alertDismissedAtRef = useRef(0);
  const ALERT_COOLDOWN_MS = 12000; // 12-second cooldown after dismissal

  // Pure derived localization for active alert message: 0ms latency on language switch
  const displayedAlertMessage = rawAlertMessage
    ? (localizeMessage(rawAlertMessage, selectedLang) || t.alertSub)
    : (incomingAlertMessage || t.alertSub);

  // Real-time Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Escalation Countdown Timer
  useEffect(() => {
    if (!backendAlertActive) {
      if (escalationTimerRef.current) clearInterval(escalationTimerRef.current);
      setEscalationSecondsLeft(15);
      return;
    }

    setEscalationSecondsLeft(15);
    if (escalationTimerRef.current) clearInterval(escalationTimerRef.current);

    escalationTimerRef.current = setInterval(() => {
      setEscalationSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(escalationTimerRef.current);
          setEscalationTierKey('tier3');
          playEmergencyAlarm();
          // Auto-dismiss the alert screen after 5 seconds at tier3
          setTimeout(() => {
            setBackendAlertActive(false);
            setRawAlertMessage(null);
            setIncomingAlertMessage(null);
            setEscalationTierKey('tier1');
            alertDismissedAtRef.current = Date.now();
          }, 5000);
          return 0;
        }
        if (prev === 8) {
          setEscalationTierKey('tier2');
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (escalationTimerRef.current) clearInterval(escalationTimerRef.current);
    };
  }, [backendAlertActive]);

  /**
   * Reset the active backend emergency/escalation mode.
   * Sets a cooldown timestamp so the polling loop won't immediately re-trigger.
   */
  /**
   * Reset the active backend emergency/escalation mode.
   * Sets a cooldown timestamp so the polling loop won't immediately re-trigger.
   */
  const handleFallModalSafe = useCallback(async () => {
    stop();
    setFallModalOpen(false);
    setBackendAlertActive(false);
    setSosSent(false);
    setRawAlertMessage(null);
    setIncomingAlertMessage(null);

    if (escalationTimerRef.current) clearInterval(escalationTimerRef.current);
    setEscalationTierKey('tier1');
    setEscalationSecondsLeft(15);

    // Mark cooldown so polling / WS won't re-trigger the same alert immediately
    alertDismissedAtRef.current = Date.now();

    playGentleChime();
    speak(t.fineConfirmationTts, selectedLang);

    // Broadcast cancel/safe status via WebSocket to Family Dashboard & Hub
    sendMessage({
      type: 'alert_cancelled',
      elder_id: ELDER_ID,
      status: 'safe',
      message: 'Kamala confirmed: I am safe, emergency cancelled.',
      timestamp: new Date().toISOString(),
    });

    try {
      const payload = buildSensorEvent({
        eventType: 'voice_input',
        confidence: 1.0,
        voiceTranscript: 'User confirmed: I am safe, cancel emergency alert.',
      });
      await postSensorEvent(payload);
    } catch (e) {
      console.warn('Failed to post safe confirmation event to Hub:', e);
    }
  }, [stop, speak, selectedLang, t, sendMessage]);

  /**
   * Primary SOS Panic Button (Major Button 1)
   * Dispatches via Hub REST API (triggering immediate Hub FamilyAlert broadcast)
   * and direct WebSocket for instantaneous alert cards on Teammate 4's dashboard.
   */
  const handleSOS = useCallback(async () => {
    const now = Date.now();
    if (now - lastSosTimeRef.current < 2000) return;
    lastSosTimeRef.current = now;

    setSosSent(true);
    setFallModalOpen(false); // Do not open generic fall questionnaire when elder explicitly pressed SOS
    playEmergencyAlarm();

    const eventId = crypto.randomUUID ? crypto.randomUUID() : `evt_${Date.now()}`;
    const decId = `dec_${Date.now()}`;
    const alertMsg = '🚨 CRITICAL EMERGENCY: Kamala Devi pressed SOS Button on tablet!';

    // Register in dedup set so own decision does not loop back to open questionnaire
    processedDecisionsRef.current.add(decId);
    processedDecisionsRef.current.add(eventId);

    const payload = buildSensorEvent({
      eventType: 'manual_panic',
      confidence: 1.0,
      eventId: eventId,
    });

    // 1. Direct WebSocket Broadcasts to Teammate 4's Dashboard
    sendMessage({
      type: 'FamilyAlert',
      alert_id: `alert_${Date.now()}`,
      decision_id: decId,
      message: alertMsg,
      severity: 'critical',
      reasoning_trace: 'Elder Kamala Devi pressed manual SOS button on tablet interface.',
      timestamp: new Date().toISOString(),
    });

    sendMessage({
      type: 'AgentDecision',
      decision_id: decId,
      event_id: eventId,
      severity: 'critical',
      action: 'call_emergency',
      reasoning_trace: 'Elder Kamala Devi pressed manual SOS button on tablet interface.',
      voice_message_to_elder: 'Emergency services and your family have been notified.',
      language_code: 'en-IN',
      family_message: alertMsg,
      timestamp: new Date().toISOString(),
    });

    sendMessage({
      type: 'manual_panic',
      elder_id: 'kamala_001',
      event_type: 'manual_panic',
      severity: 'critical',
      alert: alertMsg,
      timestamp: new Date().toISOString(),
    });

    // 2. Hub REST API POSTs
    try {
      await Promise.allSettled([
        postSensorEvent(payload),
        postDecision({
          type: 'AgentDecision',
          decision_id: decId,
          event_id: eventId,
          severity: 'critical',
          action: 'call_emergency',
          reasoning_trace: 'Elder Kamala Devi pressed manual SOS button on tablet interface.',
          voice_message_to_elder: 'Emergency services and your family have been notified.',
          language_code: 'en-IN',
          family_message: alertMsg,
        }),
      ]);
    } catch (e) {
      console.warn('Failed to post SOS to Hub:', e);
    }
  }, [sendMessage]);

  /**
   * Cancel Emergency SOS / Confirm Safe
   */
  const handleCancelSOS = useCallback(async () => {
    setSosSent(false);
    setFallModalOpen(false);
    playSuccessChime();
    speak('Emergency alert cancelled. You are safe.', selectedLang);

    sendMessage({
      type: 'emergency_cancelled',
      elder_id: 'kamala_001',
      message: 'Kamala confirmed she is safe. Alert cancelled.',
      timestamp: new Date().toISOString(),
    });

    const payload = buildSensorEvent({
      eventType: 'voice_input',
      confidence: 1.0,
      voiceTranscript: 'User confirmed: I am safe, cancel emergency alert.',
    });
    postSensorEvent(payload).catch(() => {});
  }, [selectedLang, speak, sendMessage]);

  /**
   * Quick Mood Check-In Handler (Schema A: event_type = "emotion_detected")
   */
  const handleMoodSelect = useCallback(async (emotionType, moodLabel) => {
    setSelectedMood(emotionType);
    playGentleChime();

    const payload = buildSensorEvent({
      eventType: 'emotion_detected',
      emotion: emotionType, // "happy" | "neutral" | "sad"
      confidence: 0.95,
    });

    // Broadcast to Family Dashboard
    sendMessage({
      type: 'wellness_update',
      elder_id: ELDER_ID,
      emotion: emotionType,
      mood_label: moodLabel,
      timestamp: new Date().toISOString(),
    });

    try {
      await postSensorEvent(payload);
      setMoodToast(`${moodLabel} • ${t.moodRecordedToast}`);
      setTimeout(() => setMoodToast(null), 3500);
    } catch (e) {
      console.warn('Failed to post emotion_detected SensorEvent:', e);
    }
  }, [t, sendMessage]);

  /**
   * Family Glance Quick Reply: Instant message to Priya / Family Dashboard
   */
  const handleFamilyReply = useCallback(async () => {
    setFamilyReplied(true);
    playSuccessChime();

    const replyText = 'Amma replied: Doing well, love you too! ❤️';

    // Broadcast live over WebSocket to Family Dashboard
    sendMessage({
      type: 'family_reply',
      elder_id: ELDER_ID,
      sender: 'Kamala (Elder)',
      message: replyText,
      timestamp: new Date().toISOString(),
    });

    const payload = buildSensorEvent({
      eventType: 'voice_input',
      voiceTranscript: replyText,
      confidence: 1.0,
    });

    try {
      await postSensorEvent(payload);
      setTimeout(() => setFamilyReplied(false), 5000);
    } catch (e) {
      console.warn('Failed to post family reply:', e);
    }
  }, [sendMessage]);

  /**
   * Dedicated Voice Note to Family: Records audio for 5 seconds and sends transcript directly to Family Dashboard
   */
  const handleVoiceReplyToFamily = useCallback(() => {
    if (isListening) {
      finishListening();
      setFamilyVoiceReplyActive(false);
      return;
    }

    stop();
    setFamilyVoiceReplyActive(true);

    listen({
      language: selectedLang,
      duration: 5,
      onTranscript: async (transcript) => {
        setFamilyVoiceReplyActive(false);
        if (!transcript) return;
        playSuccessChime();
        speak('Your voice note was sent to Priya.', selectedLang);

        // Broadcast to Family Dashboard via WebSocket
        sendMessage({
          type: 'family_reply',
          elder_id: 'kamala_001',
          sender: 'Kamala (Elder)',
          message: transcript,
          category: 'voice_message',
          timestamp: new Date().toISOString(),
        });

        const payload = buildSensorEvent({
          eventType: 'voice_input',
          confidence: 1.0,
          voiceTranscript: `Voice Note from Kamala: "${transcript}"`,
          sender: 'Kamala (Elder)',
        });

        try {
          await postSensorEvent(payload);
          setFamilyReplied(true);
          setTimeout(() => setFamilyReplied(false), 5000);
        } catch (e) {
          console.warn('Failed to post voice reply to family:', e);
        }
      },
    });
  }, [isListening, finishListening, stop, listen, selectedLang, speak, sendMessage]);

  /**
   * Answer Incoming Call from Family Dashboard (Teammate 4 Schema E CallResponse)
   */
  const handleAcceptIncomingCall = useCallback(() => {
    const caller = incomingCall?.caller || 'Family (Priya)';
    const callId = incomingCall?.call_id || `call_${Date.now()}`;
    const elderId = incomingCall?.elder_id || ELDER_ID;

    // 1. Mark this call as handled so it NEVER loops or re-prompts
    handledCallsRef.current.add(callId);
    setIncomingCall(null);
    setActiveCall({ call_id: callId, caller, startTime: Date.now() });

    playSuccessChime();
    speak(`Call connected with ${caller}. You can speak now.`, selectedLang);

    // 2. Send Schema E CallResponse directly over WebSocket to Teammate 4 Dashboard
    sendMessage({
      type: 'CallResponse',
      call_id: callId,
      elder_id: elderId,
      response: 'accepted',
      timestamp: new Date().toISOString(),
    });

    // 3. Dual-dispatch backward compatible status event
    sendMessage({
      type: 'call_accepted',
      call_id: callId,
      elder_id: elderId,
      caller: caller,
      status: 'connected',
      timestamp: new Date().toISOString(),
    });

    const payload = buildSensorEvent({
      eventType: 'voice_input',
      confidence: 1.0,
      voiceTranscript: `Live call connected with ${caller}.`,
      sender: 'Kamala Devi (Elder)',
    });
    postSensorEvent(payload).catch(() => {});
  }, [incomingCall, speak, selectedLang, sendMessage]);

  /**
   * End Active In-Progress Live Call
   */
  const handleEndActiveCall = useCallback(() => {
    const caller = activeCall?.caller || 'Family (Priya)';
    const callId = activeCall?.call_id || `call_${Date.now()}`;

    setActiveCall(null);
    playGentleChime();
    speak('Call ended.', selectedLang);

    sendMessage({
      type: 'call_ended',
      call_id: callId,
      elder_id: ELDER_ID,
      caller: caller,
      status: 'ended',
      timestamp: new Date().toISOString(),
    });
  }, [activeCall, speak, selectedLang, sendMessage]);

  /**
   * Decline Incoming Call from Family Dashboard (Teammate 4 Schema E CallResponse)
   */
  const handleDeclineIncomingCall = useCallback(() => {
    const caller = incomingCall?.caller || 'Family (Priya)';
    const callId = incomingCall?.call_id || `call_${Date.now()}`;
    const elderId = incomingCall?.elder_id || ELDER_ID;

    // Mark call as handled so it never re-triggers
    handledCallsRef.current.add(callId);
    setIncomingCall(null);
    playGentleChime();

    // 1. Send Schema E CallResponse directly over WebSocket to Teammate 4 Dashboard
    sendMessage({
      type: 'CallResponse',
      call_id: callId,
      elder_id: elderId,
      response: 'declined',
      timestamp: new Date().toISOString(),
    });

    // 2. Dual-dispatch backward compatible status event
    sendMessage({
      type: 'call_declined',
      call_id: callId,
      elder_id: elderId,
      caller: caller,
      status: 'declined',
      timestamp: new Date().toISOString(),
    });
  }, [incomingCall, sendMessage]);

  /**
   * Silent Medication Toggle
   */
  const handleToggleMedication = useCallback(async (medId) => {
    let nextTaken = false;
    setMedications((prev) =>
      prev.map((m) => {
        if (m.id === medId) {
          nextTaken = !m.taken;
          return {
            ...m,
            taken: nextTaken,
            dueNow: false,
            timeTaken: nextTaken ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          };
        }
        return m;
      })
    );

    // Broadcast medication status to Family Dashboard
    sendMessage({
      type: 'medication_update',
      elder_id: ELDER_ID,
      med_id: medId,
      taken: nextTaken,
      timestamp: new Date().toISOString(),
    });

    try {
      const payload = buildSensorEvent({
        eventType: 'medication_missed',
        confidence: 1.0,
        voiceTranscript: `Medication dose ${medId} marked ${nextTaken ? 'taken' : 'untaken'} by elder`,
      });
      await postSensorEvent(payload);
    } catch (e) {
      console.warn('Failed to send medication update to Hub:', e);
    }
  }, [sendMessage]);

  /**
   * Direct Family Phone Call Trigger (Major Button 3)
   * Opens dedicated Outgoing Call modal and notifies Family Dashboard via CallInvite.
   */
  const handleDirectFamilyCall = useCallback(async () => {
    const familyPhone = '+919876543210';
    const confirmationMsg = t.callFamilyStatus || 'Calling Priya directly...';

    playGentleChime();
    speak(confirmationMsg, selectedLang);

    // 1. Open dedicated Outgoing Call modal on tablet screen
    setOutgoingCall({
      target: 'Priya (Daughter)',
      phone: familyPhone,
      startTime: Date.now(),
    });

    const callId = `call_${Date.now()}`;
    const callDecId = `dec_${Date.now()}`;
    const callEvtId = `evt_${Date.now()}`;
    const callMsg = '📞 INCOMING CALL: Kamala Devi (Mother) is calling you! Tap to connect.';

    // Register in dedup set so own call decision doesn't loop back to elder
    processedDecisionsRef.current.add(callDecId);
    processedDecisionsRef.current.add(callEvtId);

    // 2. Broadcast FamilyAlert and AgentDecision (What Teammate 4's dashboard listens for!)
    sendMessage({
      type: 'FamilyAlert',
      alert_id: `alert_${Date.now()}`,
      decision_id: callDecId,
      message: callMsg,
      severity: 'high',
      reasoning_trace: 'Kamala Devi initiated a live phone call to Priya.',
      timestamp: new Date().toISOString(),
    });

    sendMessage({
      type: 'AgentDecision',
      decision_id: callDecId,
      event_id: callEvtId,
      severity: 'high',
      action: 'notify_family',
      reasoning_trace: 'Kamala Devi initiated a live phone call to Priya.',
      voice_message_to_elder: 'Calling Priya.',
      language_code: 'en-IN',
      family_message: callMsg,
      timestamp: new Date().toISOString(),
    });

    // 3. Send CallInvite for Teammate 4's /elder interface
    sendMessage({
      type: 'CallInvite',
      call_id: callId,
      elder_id: 'kamala_001',
      caller_name: 'Kamala Devi (Mother)',
      call_type: 'voice',
      timestamp: new Date().toISOString(),
    });

    sendMessage({
      type: 'elder_call_initiated',
      elder_id: 'kamala_001',
      target: 'Priya (Daughter)',
      phone: familyPhone,
      timestamp: new Date().toISOString(),
    });

    // 4. Post to Hub REST API:
    // Calling postDecision causes FastAPI Hub to broadcast FamilyAlert to ALL connected WebSocket clients!
    try {
      await Promise.allSettled([
        postSensorEvent(
          buildSensorEvent({
            eventType: 'normal',
            confidence: 1.0,
            voiceTranscript: 'Elder initiated phone call to family (Priya)',
            eventId: callEvtId,
          })
        ),
        postDecision({
          type: 'AgentDecision',
          decision_id: callDecId,
          event_id: callEvtId,
          severity: 'high',
          action: 'notify_family',
          reasoning_trace: 'Kamala Devi initiated a live phone call to Priya.',
          voice_message_to_elder: 'Calling Priya.',
          language_code: 'en-IN',
          family_message: callMsg,
        }),
      ]);
    } catch (e) {
      console.warn('Failed to post direct family call event/decision:', e);
    }
  }, [selectedLang, t, speak, sendMessage]);

  /**
   * End Outgoing Call Handler
   */
  const handleEndOutgoingCall = useCallback(() => {
    setOutgoingCall(null);
    playGentleChime();
    speak('Call ended.', selectedLang);

    sendMessage({
      type: 'call_ended',
      elder_id: 'kamala_001',
      target: 'Priya (Daughter)',
      timestamp: new Date().toISOString(),
    });
  }, [selectedLang, speak, sendMessage]);

  /**
   * Speech Handler: Tapping microphone triggers STT & POSTs SensorEvent (Schema A)
   */
  const handleTalkTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTalkTimeRef.current < 400) return;
    lastTalkTimeRef.current = now;

    if (isListening) {
      finishListening();
      return;
    }

    stop();

    listen({
      language: selectedLang,
      duration: 5,
      onTranscript: async (transcript) => {
        if (!transcript) return;
        setLastSpokenText(transcript);
        playSuccessChime();

        // Check for vocal cancellation
        const lower = transcript.toLowerCase();
        if (
          lower.includes('fine') ||
          lower.includes('okay') ||
          lower.includes('good') ||
          lower.includes('safe')
        ) {
          handleFallModalSafe();
          return;
        }

        // Spoken audio feedback confirming receipt
        const audioConfirmation = 'I heard you clearly. Your message has been sent to your family.';
        speak(audioConfirmation, selectedLang);

        // Broadcast to Family Dashboard & AI Agent
        sendMessage({
          type: 'elder_voice',
          elder_id: 'kamala_001',
          transcript: transcript,
          timestamp: new Date().toISOString(),
        });

        const payload = buildSensorEvent({
          eventType: 'voice_input',
          confidence: 1.0,
          voiceTranscript: transcript,
          sender: 'Kamala Devi (Elder)',
        });

        if (payload.event_id) {
          processedDecisionsRef.current.add(payload.event_id);
        }

        try {
          await postSensorEvent(payload);
        } catch (e) {
          console.warn('Failed to post voice_input SensorEvent:', e);
        }
      },
    });
  }, [isListening, finishListening, stop, listen, selectedLang, handleFallModalSafe, speak, sendMessage]);

  /**
   * Universal Intelligent Payload Classifier & Router.
   * Understands exact intent from Family Dashboard & AI LLM Agent:
   * - Incoming Calls (audio/video/family requests)
   * - Family Messages/Notes
   * - Family Acknowledgment & Reassurance
   * - Family Medication Nudges
   * - AI Companion Voice Check-ins
   * - Only escalates to Critical Emergency Alert Window on genuine life-safety emergencies!
   */
  const classifyAndDispatchMessage = useCallback(
    (data) => {
      if (!data) return;

      // Extract and normalize payload data
      let payload = data;
      if (typeof data === 'string') {
        try {
          payload = JSON.parse(data);
        } catch {
          payload = { text: data };
        }
      }

      const rawText = String(
        payload.voice_transcript ||
        payload.transcript ||
        payload.voice_message_to_elder ||
        payload.family_message ||
        payload.message ||
        payload.text ||
        payload.raw ||
        payload.note ||
        payload.reasoning_trace ||
        payload.reason ||
        ''
      ).trim();

      const lowerText = rawText.toLowerCase();
      const type = String(payload.type || '').toLowerCase();
      const action = String(payload.action || '').toLowerCase();
      const eventType = String(payload.event_type || payload.event || '').toLowerCase();
      const severity = String(payload.severity || '').toLowerCase();

      // Deduplication guard
      const dedupKey =
        payload.decision_id ||
        payload.event_id ||
        payload.alert_id ||
        `${type}_${action}_${rawText.slice(0, 30)}_${payload.timestamp || ''}`;

      if (dedupKey && processedDecisionsRef.current.has(dedupKey)) return;
      if (dedupKey) processedDecisionsRef.current.add(dedupKey);

      // =========================================================================
      // 0. CALL RESPONSES, TERMINATIONS & ECHOES (NEVER TRIGGER INCOMING CALL ALERT)
      // =========================================================================
      const isCallStatusOrTermination =
        type === 'callresponse' ||
        type === 'call_response' ||
        type === 'call_accepted' ||
        type === 'call_declined' ||
        type === 'call_ended' ||
        type === 'call_rejected' ||
        type === 'call_cancelled' ||
        payload.type === 'CallResponse' ||
        payload.type === 'call_accepted' ||
        payload.type === 'call_ended' ||
        payload.response === 'accepted' ||
        payload.response === 'declined' ||
        payload.status === 'connected' ||
        payload.status === 'accepted' ||
        payload.status === 'declined' ||
        payload.status === 'ended' ||
        lowerText.includes('call connected') ||
        lowerText.includes('call accepted') ||
        lowerText.includes('call declined') ||
        lowerText.includes('call ended') ||
        lowerText.includes('live call connected');

      if (isCallStatusOrTermination) {
        if (type === 'call_ended' || payload.status === 'ended' || lowerText.includes('call ended')) {
          setActiveCall(null);
          setIncomingCall(null);
        }
        if (payload.call_id) {
          handledCallsRef.current.add(payload.call_id);
        }
        return;
      }

      // Do NOT process self-initiated calls or already handled calls
      if (
        lowerText.includes('elder initiated phone call') ||
        lowerText.includes('calling priya') ||
        lowerText.includes('kamala devi is calling') ||
        lowerText.includes('kamala devi pressed sos') ||
        payload.caller_name === 'Kamala Devi (Mother)' ||
        (payload.call_id && handledCallsRef.current.has(payload.call_id)) ||
        activeCallRef.current !== null // Cannot receive another call if already connected!
      ) {
        return;
      }

      console.log('📬 Ingesting & Classifying Payload:', { type, action, eventType, severity, rawText });

      // =========================================================================
      // 1. INCOMING CALL FROM FAMILY DASHBOARD (Teammate 4 Schema D CallInvite)
      // =========================================================================
      if (type === 'callinvite' || payload.type === 'CallInvite') {
        const callerName = payload.caller_name || 'Family (Priya)';
        // Ignore calls initiated by the elder herself
        if (callerName.includes('Kamala')) return;

        const callId = payload.call_id || `call_${Date.now()}`;
        if (handledCallsRef.current.has(callId)) return;

        const callType = payload.call_type || 'voice';
        setIncomingCall({
          call_id: callId,
          elder_id: payload.elder_id || ELDER_ID,
          caller: callerName,
          callType: callType,
          message: `${callerName} is calling you live (${callType} call)`,
          timestamp: Date.now(),
        });
        playGentleChime();
        speak(`${callerName} is calling you on a ${callType} call. Tap green to answer.`, selectedLang);
        return;
      }

      const isCall =
        ['call', 'family_call', 'video_call', 'audio_call', 'incoming_call', 'call_request', 'call_elder', 'start_call', 'webrtc_call', 'phone_call'].includes(type) ||
        ['call', 'family_call', 'video_call', 'audio_call', 'incoming_call', 'call_elder', 'start_call', 'call_request'].includes(action) ||
        ['call', 'family_call', 'video_call', 'call_request', 'incoming_call'].includes(eventType) ||
        (payload.call_id && !handledCallsRef.current.has(payload.call_id) && (type.includes('invite') || action.includes('invite') || lowerText.includes('is calling') || lowerText.includes('incoming')));

      if (isCall) {
        const callId = payload.call_id || `call_${Date.now()}`;
        if (handledCallsRef.current.has(callId)) return;

        const callerName = payload.caller || payload.caller_name || payload.sender || 'Family (Priya)';
        const callType = (type.includes('video') || action.includes('video') || lowerText.includes('video')) ? 'video' : 'audio';
        setIncomingCall({
          call_id: callId,
          elder_id: payload.elder_id || ELDER_ID,
          caller: callerName,
          callType: callType,
          message: rawText || `${callerName} is calling you live from the Family Dashboard`,
          timestamp: Date.now(),
        });
        playGentleChime();
        speak(`${callerName} is calling you live from the family dashboard. Tap green to answer.`, selectedLang);
        return;
      }

      // =========================================================================
      // 2. FAMILY ALERT ACKNOWLEDGMENT / REASSURANCE (Family clicked Acknowledge)
      // =========================================================================
      const isAck =
        ['family_acknowledgement', 'alert_acknowledged', 'familyalertack', 'escalation.status_changed', 'ack', 'acknowledge'].includes(type) ||
        ['acknowledge', 'ack', 'caregiver_ack', 'acknowledge_alert'].includes(action) ||
        (lowerText.includes('acknowledged') || lowerText.includes('on my way') || lowerText.includes('coming home') || lowerText.includes('arjun dispatched') || lowerText.includes('priya responded'));

      if (isAck) {
        const ackBy = payload.acknowledged_by || payload.changed_by_name || payload.sender || 'Priya (Daughter)';
        const ackMsg = rawText || `${ackBy} acknowledged your alert and is on her way home!`;
        setFamilyAck({ acknowledgedBy: ackBy, message: ackMsg, timestamp: Date.now() });
        playGentleChime();
        speak(`${ackBy} has acknowledged your alert and is on the way to help you.`, selectedLang);
        setTimeout(() => setFamilyAck(null), 14000);
        return;
      }

      // =========================================================================
      // 3. INCOMING FAMILY MESSAGE / NOTE (from MessageComposer or sendFamilyMessage)
      // Captures ONLY the raw, genuine human message directly from Teammate 4
      // Strictly rejects ANY AI agent decision, LLM synthesis, or reasoning trace!
      // =========================================================================
      const isAiAgentPayload =
        type === 'agentdecision' ||
        type === 'decision' ||
        Boolean(payload.decision_id) ||
        Boolean(payload.reasoning_trace) ||
        Boolean(payload.voice_message_to_elder);

      const isRawFamilySensorEvent =
        eventType === 'voice_input' &&
        Boolean(payload.voice_transcript) &&
        !payload.sender?.includes('Kamala') &&
        !lowerText.includes('call connected') &&
        !lowerText.includes('user confirmed') &&
        !lowerText.includes('elder initiated') &&
        !lowerText.includes('calling priya') &&
        !lowerText.includes('direct phone call');

      const isDirectFamilyMessage =
        ['family_message', 'familymessage', 'family_note'].includes(type) ||
        (type === 'message' && !payload.sender?.includes('Kamala'));

      if (!isAiAgentPayload && (isRawFamilySensorEvent || isDirectFamilyMessage)) {
        // Take the EXACT verbatim message directly as typed by Teammate 4 - NO translation, NO refining!
        const exactMsg = String(payload.voice_transcript || payload.message || payload.text || '');
        if (exactMsg.trim()) {
          const senderName = 'Priya (Daughter)';

          console.log('📬 Live Family Card: Displaying exact verbatim message (resets in 7s):', exactMsg);
          setFamilyMessage({
            sender: senderName,
            text: exactMsg,
            time: 'Just now',
            timestamp: Date.now(),
          });

          playGentleChime();
          // Speak exact message text as-is without any AI modification
          speak(exactMsg, selectedLang);

          // Reset back to default message after exactly 7 seconds
          if (familyMessageResetTimerRef.current) {
            clearTimeout(familyMessageResetTimerRef.current);
          }
          familyMessageResetTimerRef.current = setTimeout(() => {
            setFamilyMessage(DEFAULT_FAMILY_MESSAGE);
          }, 7000);

          return;
        }
      }

      // =========================================================================
      // 4. FAMILY DAILY CHECK-IN SYNC (Teammate 4 sendCheckIn: emotion_detected)
      // =========================================================================
      if (eventType === 'emotion_detected') {
        const emotion = payload.emotion || 'happy';
        const moodDesc = emotion === 'happy' ? 'Great & Happy ☀️' : emotion === 'sad' ? 'Needs Attention & Care 🌧️' : 'Calm & Restful 🌤️';
        setMoodToast(`👨‍👩‍👧 Family logged Daily Check-in: ${moodDesc}`);
        playGentleChime();
        setTimeout(() => setMoodToast(null), 6000);
        return;
      }

      // =========================================================================
      // 5. FAMILY MEDICATION NUDGE / REMINDER (Teammate 4 sendMedicationMissed)
      // =========================================================================
      const isMedNudge =
        ['medication_reminder', 'family_nudge', 'task', 'task.created', 'medication_nudge'].includes(type) ||
        ['remind_medication', 'medication_reminder', 'nudge'].includes(action) ||
        eventType === 'medication_missed' ||
        (['medicine', 'pill', 'tablet', 'dose', 'calcium', 'bp', 'metformin'].some((w) => lowerText.includes(w)) &&
          (lowerText.includes('take') || lowerText.includes('reminder') || lowerText.includes('time for') || lowerText.includes('priya') || lowerText.includes('missed')));

      if (isMedNudge) {
        const fromWho = payload.from || payload.sender || 'Family (Priya)';
        const taskMsg = rawText || 'Please take your scheduled medicine with warm water';
        setMoodToast(`💊 ${fromWho}: ${taskMsg}`);
        playGentleChime();
        speak(`${fromWho} sent a reminder: ${taskMsg}`, selectedLang);
        setTimeout(() => setMoodToast(null), 7000);
        return;
      }

      // =========================================================================
      // 5. TRUE CRITICAL EMERGENCY (Fall detected, 112 Escalation, Manual Panic)
      // =========================================================================
      const isCriticalEmergency =
        (action === 'emergency_escalate' || action === 'escalate_112') ||
        (eventType === 'fall') ||
        (severity === 'critical' && (lowerText.includes('fall') || lowerText.includes('unresponsive')) && !lowerText.includes('sos button') && !lowerText.includes('phone call') && !lowerText.includes('calling priya'));

      if (isCriticalEmergency) {
        const promptToSpeak = localizeMessage(rawText, selectedLang) || t.alertSub;
        setFallReason(promptToSpeak);
        setFallModalOpen(true);
        playEmergencyAlarm();
        return;
      }

      // =========================================================================
      // 6. AI CORE DIRECT VOICE REPLIES & INQUIRIES (Teammate 2 AgentDecision)
      // Speaks whatever the AI Core gives clearly and precisely!
      // Displays directly in the Companion Sanctuary Card (top card with microphone)
      // =========================================================================
      const isAiCoreDecision =
        type === 'agentdecision' ||
        type === 'decision' ||
        payload.type === 'AgentDecision' ||
        Boolean(payload.voice_message_to_elder) ||
        Boolean(payload.ai_reply) ||
        Boolean(payload.reply_to_elder);

      if (isAiCoreDecision) {
        // Extract the exact voice reply given by the AI Core
        const aiVoiceReply = String(
          payload.voice_message_to_elder ||
          payload.ai_reply ||
          payload.reply_to_elder ||
          payload.family_message ||
          payload.reasoning_trace ||
          rawText ||
          ''
        ).trim();

        if (aiVoiceReply) {
          console.log('🤖 Speaking AI Core Voice Reply:', aiVoiceReply);

          setAiAgentStatus({
            action: action || 'ai_reply',
            message: aiVoiceReply,
            reasoning: payload.reasoning_trace || 'AI Core real-time reasoning',
            severity: payload.severity || 'low',
            timestamp: Date.now(),
          });

          playGentleChime();
          setLastSpokenText(aiVoiceReply);

          // If AI Core requested a two-way voice check, speak then listen
          if (action === 'voice_check') {
            speakThenListen({
              prompt: aiVoiceReply,
              language: selectedLang,
              duration: 5,
              onTranscript: async (elderReply) => {
                if (!elderReply) return;
                setLastSpokenText(elderReply);
                playSuccessChime();

                sendMessage({
                  type: 'elder_reply_to_agent',
                  elder_id: 'kamala_001',
                  reply: elderReply,
                  timestamp: new Date().toISOString(),
                });

                const responseEvent = buildSensorEvent({
                  eventType: 'voice_input',
                  confidence: 1.0,
                  voiceTranscript: elderReply,
                  sender: 'Kamala Devi (Elder)',
                });

                try {
                  await postSensorEvent(responseEvent);
                } catch (e) {}
              },
            });
          } else {
            // Speak the AI Core's reply clearly and precisely
            speak(aiVoiceReply, selectedLang);
          }

          return;
        }
      }

      // End of classification pipeline
    },
    [selectedLang, t, speak, speakThenListen, sendMessage]
  );

  /**
   * Router: Ingests every WebSocket event directly into classifyAndDispatchMessage
   */
  useEffect(() => {
    if (!lastMessage) return;
    try {
      classifyAndDispatchMessage(lastMessage);
    } catch (err) {
      console.warn('Failed to classify incoming WebSocket message:', err);
    }
  }, [lastMessage, classifyAndDispatchMessage]);

  // Active Sync Polling Loop: Checks for latest decisions and events from Teammate 4 & AI Agent
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      // Skip if modal open or in cooldown
      if (fallModalOpen) return;
      if (Date.now() - alertDismissedAtRef.current < ALERT_COOLDOWN_MS) return;

      try {
        const [decisions, events] = await Promise.all([
          fetchLatestDecisions(5).catch(() => []),
          fetchLatestEvents(10).catch(() => []),
        ]);
        const decisionsList = Array.isArray(decisions) ? decisions : (decisions?.decisions || []);
        const eventsList = Array.isArray(events) ? events : (events?.events || []);
        const items = [...decisionsList, ...eventsList];
        for (const item of items) {
          classifyAndDispatchMessage(item);
        }
      } catch (err) {
        // Silent fallback catch
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [classifyAndDispatchMessage, fallModalOpen]);

  // Simulation Handlers for Team Demonstration & Testing
  const simulateIncomingFamilyMessage = useCallback((sender = 'Priya (Daughter)', text = 'Had lunch Amma? Taking my break now, visiting this evening! ❤️') => {
    setFamilyMessage({
      sender,
      text,
      time: 'Just now',
      timestamp: Date.now(),
    });
    playGentleChime();
    speak(`Message from ${sender}: ${text}`, selectedLang);
  }, [selectedLang, speak]);

  const simulateIncomingFamilyCall = useCallback((caller = 'Priya (Daughter)') => {
    setIncomingCall({ caller, timestamp: Date.now() });
    playGentleChime();
    speak(`${caller} is calling you from the family dashboard.`, selectedLang);
  }, [selectedLang, speak]);

  const simulateFamilyAcknowledgment = useCallback((acknowledgedBy = 'Priya (Daughter)', message = "Priya acknowledged: 'On my way home Amma! Hang tight.'") => {
    setFamilyAck({ acknowledgedBy, message, timestamp: Date.now() });
    playGentleChime();
    speak(`${acknowledgedBy} has acknowledged your alert and is on her way!`, selectedLang);
    setTimeout(() => setFamilyAck(null), 12000);
  }, [selectedLang, speak]);

  const simulateFamilyMedNudge = useCallback((from = 'Priya (Daughter)', task = 'Please take your 1:30 PM Calcium pill with water.') => {
    setMoodToast(`💊 ${from}: ${task}`);
    playGentleChime();
    speak(`${from} sent a reminder: ${task}`, selectedLang);
    setTimeout(() => setMoodToast(null), 7000);
  }, [selectedLang, speak]);

  const simulateAiAgentVoiceCheck = useCallback(() => {
    classifyAndDispatchMessage({
      type: 'AgentDecision',
      decision_id: crypto.randomUUID(),
      action: 'voice_check',
      severity: 'high',
      voice_message_to_elder: 'Kamala, did you fall? Are you okay? Please speak or press the button.',
      reasoning_trace: 'ShastraVision detected sudden posture drop. AI Agent initiates empathetic voice inquiry.',
      timestamp: new Date().toISOString(),
    });
  }, [classifyAndDispatchMessage]);

  const simulateAiAgentEmergencyEscalate = useCallback(() => {
    classifyAndDispatchMessage({
      type: 'AgentDecision',
      decision_id: crypto.randomUUID(),
      action: 'call_emergency',
      severity: 'critical',
      voice_message_to_elder: 'Emergency Guardian detected unresponsiveness. Escalating to 112 and family.',
      reasoning_trace: 'No vocal response from elder after fall event. Immediate 112 escalation triggered.',
      timestamp: new Date().toISOString(),
    });
  }, [classifyAndDispatchMessage]);

  // Check-In Scheduler
  const { currentCheckIn, handleResponse: handleCheckInResponse, dismissCheckIn, triggerCheckInNow } =
    useCheckInScheduler({ elderId: ELDER_ID, selectedLang });

  const triggerCognitive = useCallback(() => triggerCheckInNow('cognitive'), [triggerCheckInNow]);
  const triggerMeal = useCallback((meal) => triggerCheckInNow('meal', meal), [triggerCheckInNow]);
  const triggerSleep = useCallback(() => triggerCheckInNow('sleep'), [triggerCheckInNow]);
  const triggerMobility = useCallback(() => triggerCheckInNow('mobility'), [triggerCheckInNow]);

  // Vision Simulator
  const triggerSimulatedVisionEvent = useCallback(
    async (eventType, emotionVal = null) => {
      setShowVisionMenu(false);
      const payload = buildSensorEvent({
        eventType,
        emotion: emotionVal,
        confidence: 0.96,
      });

      try {
        await postSensorEvent(payload);
        if (eventType === 'fall') {
          setFallReason(t.fallAlertPrompt || 'ಶಾಸ್ತ್ರ ವಿಷನ್: ಕೋಣೆಯಲ್ಲಿ ಹಠಾತ್ ಕುಸಿತ ಪತ್ತೆಯಾಗಿದೆ');
          setFallModalOpen(true);
          playEmergencyAlarm();
        } else if (eventType === 'emotion_detected') {
          playGentleChime();
          speak(t.emotionSadPrompt, selectedLang);
        }
      } catch (e) {
        console.warn('Failed to post simulated vision event:', e);
      }
    },
    [selectedLang, t, speak]
  );

  const timeString = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const hourMinute = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const fullDateString = currentTime.toLocaleDateString('en-IN',
    { weekday: 'long', month: 'short', day: 'numeric' }
  );

  const dateString = currentTime.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Calculate status indicator state
  let statusTone = 'emerald';
  let statusHeadline = t.calmStatus;
  let statusDetail = t.calmSub;

  if (sosSent) {
    statusTone = 'rose';
    statusHeadline = t.sosSentStatus;
    statusDetail = t.sosSentSub;
  } else if (isSpeaking) {
    statusTone = 'cyan';
    statusHeadline = t.speakingStatus;
    statusDetail = t.speakingSub;
  } else if (voiceError) {
    statusTone = 'amber';
    statusHeadline = t.voiceIssueHeadline;
    statusDetail = t.voiceIssueDetail;
  } else if (!isConnected) {
    statusTone = 'amber';
    statusHeadline = t.reconnectingStatus;
    statusDetail = t.reconnectingSub;
  } else if (medications.some((m) => m.dueNow && !m.taken)) {
    statusTone = 'amber';
    statusHeadline = '⚠️ Afternoon Medication Due (1:30 PM)';
    statusDetail = 'Calcium + Vit D3 — Tap 💊 to mark as taken';
  }

  return (
    <main className={`liquid-glass-root ${backendAlertActive ? 'in-alert-state' : ''}`}>
      {/* Bioluminescent Ambient Floating Light Orbs */}
      <div className="ambient-orb orb-cyan" aria-hidden="true"></div>
      <div className="ambient-orb orb-indigo" aria-hidden="true"></div>
      <div className="ambient-orb orb-teal" aria-hidden="true"></div>
      <div
        className={`ambient-orb orb-crimson ${
          backendAlertActive || sosSent ? 'orb-crimson-active' : ''
        }`}
        aria-hidden="true"
      ></div>

      <div className="liquid-glass-container">
        {/* ============================================================
            1. PEACEFUL COMPANION TOP NAV (Clean & Spacious)
            ============================================================ */}
        <header className="companion-top-nav">
          <div className="companion-nav-identity">
            <div className="guardian-glow-beacon">
              <span className={`beacon-pulse-ring beacon-${statusTone}`}></span>
              <div className={`beacon-core beacon-core-${statusTone}`}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
            </div>

            <div className="companion-nav-meta">
              <span className="companion-brand-title">{t.appName}</span>
              <span className="companion-time-subtitle">{hourMinute} • {fullDateString}</span>
            </div>
          </div>

          <div className="companion-nav-actions">
            {/* Sleek Medication Pill */}
            <button
              className={`glass-med-pill ${
                medications.some((m) => m.dueNow && !m.taken) ? 'med-pill-alert' : 'med-pill-calm'
              }`}
              onClick={() => setShowMedDrawer((prev) => !prev)}
              aria-label="Medications Menu"
              title="Medication Tracker"
            >
              <span className="med-pill-emoji">💊</span>
              <span className="med-pill-label">
                {medications.some((m) => m.dueNow && !m.taken)
                  ? `${medications.filter((m) => !m.taken).length} ${t.medDueBadge}`
                  : `${medications.filter((m) => m.taken).length}/${medications.length} ✓`}
              </span>
            </button>


          </div>
        </header>

        {/* IN-FLOW COLLAPSIBLE MEDICATION SCHEDULE DRAWER */}
        {showMedDrawer && (
          <section className="glass-drawer-panel med-drawer">
            <div className="drawer-header">
              <span className="drawer-title">💊 {t.medTrackerTitle}</span>
              <div className="med-popover-badge-group">
                <span className="med-popover-count">
                  {medications.filter((m) => m.taken).length}/{medications.length} {t.medTakenBadge}
                </span>
                <button
                  className="btn-close-drawer"
                  onClick={() => setShowMedDrawer(false)}
                  title="Close Drawer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Untaken Due Alert Banner */}
            {medications.some((m) => m.dueNow && !m.taken) && (
              <div className="med-popover-alert-banner">
                ⚠️ <strong>Dose Due Now:</strong>{' '}
                1:30 PM (Calcium + Vit D3)
              </div>
            )}

            <div className="med-popover-list">
              {medications.map((med) => {
                const displayName = med.name;
                const displaySlot = med.timeSlot;

                return (
                  <div
                    key={med.id}
                    className={`med-popover-item ${
                      med.taken ? 'popover-item-taken' : med.dueNow ? 'popover-item-due' : 'popover-item-pending'
                    }`}
                  >
                    <div className="popover-item-info">
                      <span className="popover-item-icon">{med.icon}</span>
                      <div className="popover-item-text">
                        <span className="popover-med-name">{displayName}</span>
                        <span className="popover-med-slot">
                          {displaySlot} {med.taken && med.timeTaken ? `• ✓ ${med.timeTaken}` : ''}
                        </span>
                      </div>
                    </div>

                    <button
                      className={`btn-popover-check ${med.taken ? 'btn-popover-done' : 'btn-popover-action'}`}
                      onClick={() => handleToggleMedication(med.id)}
                    >
                      {med.taken ? `✓ ${t.medTakenBadge}` : t.medMarkTakenBtn}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ShastraVision Live Perception Simulator Drawer */}
        {showVisionMenu && (
          <section className="glass-drawer-panel vision-drawer">
            <div className="drawer-header">
              <span className="drawer-title">{t.drawerVisionTitle}</span>
              <span className="drawer-badge">MediaPipe + DeepFace</span>
            </div>
            <div className="drawer-buttons-row">
              <button
                className="drawer-btn btn-trigger-fall"
                onClick={() => triggerSimulatedVisionEvent('fall')}
              >
                {t.drawerTriggerFall}
              </button>
              <button
                className="drawer-btn btn-trigger-sad"
                onClick={() => triggerSimulatedVisionEvent('emotion_detected', 'sad')}
              >
                {t.drawerTriggerSad}
              </button>
              <button
                className="drawer-btn btn-trigger-fear"
                onClick={() => triggerSimulatedVisionEvent('emotion_detected', 'fear')}
              >
                {t.drawerTriggerFear}
              </button>
              <button
                className="drawer-btn btn-trigger-inactivity"
                onClick={() => triggerSimulatedVisionEvent('inactivity')}
              >
                {t.drawerTriggerInactivity}
              </button>
            </div>
          </section>
        )}

        {/* Family & AI LLM Live Simulators Drawer */}
        {showFamilySimMenu && (
          <section className="glass-drawer-panel family-sim-drawer">
            <div className="drawer-header">
              <span className="drawer-title">👨‍👩‍👧 Family Dashboard &amp; AI LLM Live Simulators</span>
              <span className="drawer-badge">Bidirectional Test</span>
            </div>
            <div className="drawer-buttons-row">
              <button
                className="drawer-btn drawer-btn-family"
                onClick={() => simulateIncomingFamilyMessage('Priya (Daughter)', 'Amma, checking in! Did you take your medicine? Coming home at 6 PM! ❤️')}
              >
                💬 Msg from Priya
              </button>
              <button
                className="drawer-btn drawer-btn-family"
                onClick={() => simulateIncomingFamilyCall('Priya (Daughter)')}
              >
                📞 Call from Priya
              </button>
              <button
                className="drawer-btn drawer-btn-family"
                onClick={() => simulateFamilyAcknowledgment('Priya (Daughter)', "Priya acknowledged: 'On my way home Amma! Don\'t worry.'")}
              >
                🤝 Family Ack
              </button>
              <button
                className="drawer-btn drawer-btn-family"
                onClick={() => simulateFamilyMedNudge('Priya (Daughter)', 'Please take your 1:30 PM Calcium pill with water.')}
              >
                💊 Med Nudge
              </button>
              <button
                className="drawer-btn drawer-btn-ai"
                onClick={simulateAiAgentVoiceCheck}
              >
                🧠 AI Voice Check
              </button>
              <button
                className="drawer-btn drawer-btn-ai"
                onClick={simulateAiAgentEmergencyEscalate}
              >
                🚨 AI Emergency 112
              </button>
            </div>
          </section>
        )}

        {/* Health Check-Ins Drawer */}
        {showCheckInMenu && (
          <section className="glass-drawer-panel checkin-drawer">
            <div className="drawer-header">
              <span className="drawer-title">{t.drawerCheckInTitle}</span>
            </div>
            <div className="drawer-buttons-row">
              <button className="drawer-btn" onClick={() => { triggerCognitive(); setShowCheckInMenu(false); }}>
                {t.drawerCognitive}
              </button>
              <button className="drawer-btn" onClick={() => { triggerMeal('breakfast'); setShowCheckInMenu(false); }}>
                {t.drawerBreakfast}
              </button>
              <button className="drawer-btn" onClick={() => { triggerMeal('lunch'); setShowCheckInMenu(false); }}>
                {t.drawerLunch}
              </button>
              <button className="drawer-btn" onClick={() => { triggerSleep(); setShowCheckInMenu(false); }}>
                {t.drawerSleep}
              </button>
              <button className="drawer-btn" onClick={() => { triggerMobility(); setShowCheckInMenu(false); }}>
                {t.drawerMobility}
              </button>
            </div>
          </section>
        )}

        {/* ============================================================
            2. BACKEND INCOMING ALERT & PRIVILEGE ESCALATION MODE
            ============================================================ */}
        {backendAlertActive && !fallModalOpen ? (
          <section className="glass-critical-alert-card">
            <div className="alert-tier-chip">
              <span className="alert-pulse-flame"></span>
              <span className="alert-tier-name">{t[escalationTierKey] || t.tier1}</span>
              <span className="alert-countdown-tag">⏱️ {escalationSecondsLeft}{t.secondsShort}</span>
            </div>

            <h1 className="alert-main-title">{t.alertTitle}</h1>
            <p className="alert-main-message">{displayedAlertMessage}</p>

            <div className="alert-auto-escalate-warning">
              ⚠️ {t.escalationWarning} ({escalationSecondsLeft}{t.secondsShort})
            </div>

            <div className="alert-glass-actions-grid">
              <button
                className="btn-glass-action btn-glass-fine"
                onClick={handleFallModalSafe}
                aria-label={t.yesImFineBtn}
              >
                <div className="action-icon-circle">✓</div>
                <div className="action-text-column">
                  <span className="action-primary-text">{t.yesImFineBtn}</span>
                  <span className="action-sub-text">{t.yesImFineSub}</span>
                </div>
              </button>

              <button
                className={`btn-glass-action btn-glass-talk ${isListening ? 'action-listening-active' : ''}`}
                onClick={handleTalkTap}
                aria-label="Talk to Clarify"
              >
                <div className="action-icon-circle">🎙️</div>
                <div className="action-text-column">
                  <span className="action-primary-text">
                    {isListening ? `${t.talkBtnListening} (${secondsLeft}${t.secondsShort})` : t.talkBtnTapToSpeak}
                  </span>
                  <span className="action-sub-text">
                    {isListening ? t.streamingAudioSub : t.speakToExplainSub}
                  </span>
                </div>
              </button>

              <button
                className="btn-glass-action btn-glass-panic"
                onClick={handleSOS}
                aria-label="I need emergency help"
              >
                🚨 {t.sosBtnLabel} {t.sosEmergencyBadge}
              </button>
            </div>
          </section>
        ) : (
          /* ============================================================
             3. MOBILE VERTICAL STACK: THE 3 MAJOR BUTTONS & ALTERNATE FEATURES
             ============================================================ */
          <div className="companion-main-canvas">
            {/* Emergency SOS Active Banner */}
            {sosSent && (
              <section className="family-ack-banner" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.35) 100%)', borderColor: '#EF4444' }} role="alert">
                <div className="ack-icon" style={{ background: '#EF4444' }}>🚨</div>
                <div className="ack-text-stack">
                  <span className="ack-title" style={{ color: '#FCA5A5' }}>🚨 EMERGENCY SOS DISPATCHED</span>
                  <p className="ack-body">Alert sent to Priya (Daughter) &amp; 112 Emergency Services. Help is on the way.</p>
                </div>
                <button
                  onClick={handleCancelSOS}
                  style={{ marginLeft: 'auto', background: 'rgba(255, 255, 255, 0.15)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '12px', padding: '8px 16px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                >
                  ✓ Cancel / I Am Safe
                </button>
              </section>
            )}

            {/* Reassuring Family Acknowledgment Banner (if family acknowledged an alert) */}
            {familyAck && (
              <section className="family-ack-banner" role="status">
                <div className="ack-icon">🤝</div>
                <div className="ack-text-stack">
                  <span className="ack-title">✓ {familyAck.acknowledgedBy} Acknowledged Your Alert</span>
                  <p className="ack-body">{familyAck.message}</p>
                </div>
              </section>
            )}

            {/* ============================================================
                HERO: THE PERSONAL HEALTHCARE COMPANION SANCTUARY
                ============================================================ */}
            <section className="liquid-card companion-sanctuary">
              <div className="glass-specular-edge" aria-hidden="true"></div>

              {/* 1. Warm Personal Greeting & Companion Identity */}
              <div className="companion-greeting-header">
                <div className="companion-status-tag">
                  <span className="companion-status-dot"></span>
                  <span className="companion-status-text">{t.calmStatus}</span>
                </div>
                <h1 className="companion-greeting-title">{t.companionGreeting}</h1>
                <p className="companion-greeting-subtitle">{t.companionGreetingSub}</p>
              </div>

              {/* 2. Living Companion Presence Aura & Interactive Center Mic */}
              <div className="companion-stage">
                <div className={`companion-presence-cluster ${isListening ? 'state-listening' : isSpeaking ? 'state-speaking' : 'state-breathing'}`}>
                  <div className="companion-ambient-halo"></div>
                  <div className="companion-ripple-ring ring-1"></div>
                  <div className="companion-ripple-ring ring-2"></div>

                  <button
                    className="btn-companion-core"
                    onClick={handleTalkTap}
                    aria-label={isListening ? t.talkBtnListening : t.talkBtnTapToSpeak}
                  >
                    <div className="companion-core-inner">
                      <svg
                        className="icon-companion-mic"
                        width="38"
                        height="38"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" x2="12" y1="19" y2="22" />
                      </svg>
                    </div>
                  </button>
                </div>

                <button
                  className={`companion-talk-pill ${isListening ? 'talk-pill-active' : ''}`}
                  onClick={handleTalkTap}
                  aria-label={isListening ? t.talkBtnListening : t.talkBtnTapToSpeak}
                >
                  <span className="talk-pill-label">
                    {isListening
                      ? `🎙️ ${t.talkBtnListening} (${secondsLeft}${t.secondsShort})`
                      : isSpeaking
                      ? `🔊 ${t.speakingStatus}`
                      : `🎙️ ${t.talkBtnTapToSpeak}`}
                  </span>
                </button>
              </div>

              {/* 3. Conversational Dialogue Bubble (Spacious & Easy to Read) */}
              <div className="companion-dialogue-box">
                {isListening ? (
                  <div className="companion-speech-card dialogue-live" style={{ borderColor: '#F59E0B', background: 'rgba(245, 158, 11, 0.08)' }}>
                    <div className="speech-card-header">
                      <span className="speech-sender-tag" style={{ color: '#F59E0B', fontWeight: '700' }}>
                        🎙️ Listening ({secondsLeft}s)...
                      </span>
                    </div>
                    {voiceError ? (
                      <p className="speech-transcript-text" style={{ color: '#EF4444' }}>
                        ⚠️ {voiceError}
                      </p>
                    ) : interimText ? (
                      <p className="speech-transcript-text" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                        &ldquo;{interimText}&rdquo;
                      </p>
                    ) : (
                      <p className="speech-transcript-text" style={{ color: 'rgba(255, 255, 255, 0.7)', fontStyle: 'italic' }}>
                        Listening... please speak your message now
                      </p>
                    )}
                  </div>
                ) : interimText ? (
                  <div className="companion-speech-card dialogue-live">
                    <div className="speech-card-header">
                      <span className="speech-sender-tag">● Live Speech Stream</span>
                    </div>
                    <p className="speech-transcript-text">&ldquo;{interimText}&rdquo;</p>
                  </div>
                ) : lastSpokenText ? (
                  <div className="companion-speech-card dialogue-confirmed">
                    <div className="speech-card-header">
                      <span className="speech-sender-tag">
                        {aiAgentStatus?.message === lastSpokenText ? '🤖 AI Core Reply:' : '🗣️ You said:'}
                      </span>
                      <button
                        className="btn-replay-voice"
                        onClick={() => {
                          speak(lastSpokenText, selectedLang);
                        }}
                      >
                        🔊 Replay Voice
                      </button>
                    </div>
                    <p className="speech-transcript-text">&ldquo;{lastSpokenText}&rdquo;</p>
                  </div>
                ) : (
                  <div className="companion-idle-helper">
                    <p className="companion-helper-text">
                      {t.companionIdleBubble}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* ============================================================
                FAMILY DASHBOARD LIVE SYNC CARD (Bidirectional Family Link)
                ============================================================ */}
            <section className="family-live-card">
              <div className="glass-specular-edge" aria-hidden="true"></div>
              <div className="family-card-header">
                <div className="family-sender-identity">
                  <div className="family-avatar-orb">👩‍💼</div>
                  <div className="family-sender-meta">
                    <span className="family-sender-name">{familyMessage.sender}</span>
                    <span className="family-time-tag">Sent {familyMessage.time}</span>
                  </div>
                </div>
                <div className="family-sync-indicator">
                  <span className="sync-pulse-dot"></span>
                  <span>Live Synced</span>
                </div>
              </div>

              <div className="family-message-bubble">
                <p className="family-message-text">&ldquo;{familyMessage.text}&rdquo;</p>
              </div>

              <div className="family-actions-row">
                <button
                  className="btn-family-quick-reply"
                  onClick={handleFamilyReply}
                  title="Send quick reassurance"
                >
                  <span>❤️</span>
                  <span>Send &quot;I&apos;m Doing Well&quot;</span>
                </button>

                <button
                  className={`btn-family-voice-reply ${familyVoiceReplyActive ? 'voice-recording-pulse' : ''}`}
                  onClick={handleVoiceReplyToFamily}
                  title="Record voice note to Priya"
                >
                  <span>🎙️</span>
                  <span>{familyVoiceReplyActive ? `Listening... (${secondsLeft}s)` : 'Voice Reply'}</span>
                </button>

                {familyReplied && (
                  <span className="family-reply-sent-tag">
                    ✓ Dispatched to {familyMessage.sender.split(' ')[0]}
                  </span>
                )}
              </div>
            </section>

            {/* ============================================================
                SUPPORT ACTIONS: 📞 CALL PRIYA & 🚨 EMERGENCY SOS
                ============================================================ */}
            <div className="companion-actions-grid">
              {/* Call Priya (Daughter) */}
              <button
                className="liquid-card action-card-family"
                onClick={handleDirectFamilyCall}
                aria-label={t.callFamilyBtn}
              >
                <div className="glass-specular-edge" aria-hidden="true"></div>
                <div className="action-card-content">
                  <div className="action-icon-circle orb-emerald">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div className="action-text-stack">
                    <span className="action-badge-chip badge-sage">{t.callFamilyBadge}</span>
                    <h2 className="action-main-title">{t.callFamilyBtn}</h2>
                    <p className="action-sub-text">{t.callFamilySub}</p>
                  </div>
                </div>
              </button>

              {/* Emergency SOS */}
              <button
                className={`liquid-card action-card-sos ${sosSent ? 'card-sos-active' : ''}`}
                onClick={handleSOS}
                aria-label={t.sosBtnLabel}
              >
                <div className="glass-specular-edge" aria-hidden="true"></div>
                <div className="action-card-content">
                  <div className="action-icon-circle orb-crimson">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div className="action-text-stack">
                    <span className="action-badge-chip badge-rose">{t.sosBadge}</span>
                    <h2 className="action-main-title">{sosSent ? t.sosBtnActiveLabel : t.sosBtnLabel}</h2>
                    <p className="action-sub-text">{sosSent ? t.sosBtnActiveSub : t.sosBtnSub}</p>
                  </div>
                </div>
              </button>
            </div>

            {/* ============================================================
                DAILY WELLNESS & RHYTHM (Spacious & Inviting)
                ============================================================ */}
            <section className="companion-wellness-section">
              <div className="wellness-header">
                <span className="wellness-header-title">{t.moodRowTitle}</span>
                {moodToast && <span className="wellness-toast-badge">{moodToast}</span>}
              </div>

              <div className="wellness-pills-row" role="group" aria-label="Daily Wellness Check-in">
                <button
                  className={`wellness-pill-btn pill-good ${selectedMood === 'happy' ? 'wellness-pill-selected' : ''}`}
                  onClick={() => handleMoodSelect('happy', `☀️ ${t.moodGood}`)}
                >
                  <span className="wellness-emoji">☀️</span>
                  <span className="wellness-label">{t.moodGood}</span>
                </button>

                <button
                  className={`wellness-pill-btn pill-calm ${selectedMood === 'neutral' ? 'wellness-pill-selected' : ''}`}
                  onClick={() => handleMoodSelect('neutral', `🍵 ${t.moodCalm}`)}
                >
                  <span className="wellness-emoji">🍵</span>
                  <span className="wellness-label">{t.moodCalm}</span>
                </button>

                <button
                  className={`wellness-pill-btn pill-resting ${selectedMood === 'sad' ? 'wellness-pill-selected' : ''}`}
                  onClick={() => handleMoodSelect('sad', `🌙 ${t.moodResting}`)}
                >
                  <span className="wellness-emoji">🌙</span>
                  <span className="wellness-label">{t.moodResting}</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ============================================================
            4. Ambient Telemetry Glass Footer
            ============================================================ */}
        <footer className="glass-telemetry-footer">
          <div className="telemetry-item">
            <span className="telemetry-icon">⚡</span>
            <span className="telemetry-label">{t.telemetryHubLabel}</span>
            <span className={`telemetry-status status-${isConnected ? 'online' : 'offline'}`}>
              {isConnected ? t.telemetryHubConnected : t.telemetryHubReconnecting}
            </span>
          </div>

          <div className="telemetry-item">
            <span className="telemetry-icon">🎙️</span>
            <span className="telemetry-label">{t.telemetryVoiceLabel}</span>
            <span className="telemetry-status status-online">
              {isListening ? t.telemetryVoiceListening : isSpeaking ? t.telemetryVoiceSpeaking : t.telemetryVoiceReady}
            </span>
          </div>

          <div className="telemetry-buttons-group">
            <button
              className="btn-footer-tool"
              onClick={() => setShowFamilySimMenu((prev) => !prev)}
              title="Family Dashboard & AI Simulators"
            >
              👨‍👩‍👧 Family &amp; AI
            </button>
            <button
              className="btn-footer-tool"
              onClick={() => setShowVisionMenu((prev) => !prev)}
              title="ShastraVision Simulator"
            >
              {t.toolVisionSim}
            </button>
            <button
              className="btn-footer-tool"
              onClick={() => setShowCheckInMenu((prev) => !prev)}
              title="Health Check-ins"
            >
              {t.toolCheckIns}
            </button>
            <button className="btn-footer-tool" onClick={triggerMobility}>
              {t.toolSteadiness}
            </button>
          </div>
        </footer>
      </div>

      {/* Incoming Family Call Modal Overlay */}
      {incomingCall && (
        <div className="incoming-call-overlay" role="dialog" aria-modal="true">
          <div className="incoming-call-card">
            <div className="call-pulse-cluster">
              <div className="call-ripple-ring"></div>
              <div className="call-ripple-ring"></div>
              <div className="call-avatar-circle">👩‍💼</div>
            </div>
            <div className="call-meta-stack">
              <span className="call-incoming-label">Incoming Call</span>
              <h2 className="call-caller-name">{incomingCall.caller}</h2>
              <p className="call-sub-note">Live call request from Family Dashboard</p>
            </div>
            <div className="call-actions-row">
              <button className="btn-call-accept" onClick={handleAcceptIncomingCall}>
                <span>📞</span>
                <span>Answer &amp; Talk</span>
              </button>
              <button className="btn-call-decline" onClick={handleDeclineIncomingCall}>
                <span>✕</span>
                <span>Decline</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active In-Progress Live Call Overlay */}
      {activeCall && (
        <div className="incoming-call-overlay" role="dialog" aria-modal="true">
          <div className="incoming-call-card active-call-card" style={{ borderColor: '#10B981', boxShadow: '0 24px 60px rgba(16, 185, 129, 0.25)' }}>
            <div className="call-pulse-cluster">
              <div className="call-ripple-ring" style={{ borderColor: 'rgba(16, 185, 129, 0.5)' }}></div>
              <div className="call-ripple-ring" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}></div>
              <div className="call-avatar-circle" style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}>👩‍💼</div>
            </div>
            <div className="call-meta-stack">
              <span className="call-incoming-label" style={{ color: '#34D399', letterSpacing: '0.08em', fontWeight: '800' }}>● LIVE CALL CONNECTED</span>
              <h2 className="call-caller-name">{activeCall.caller}</h2>
              <p className="call-sub-note" style={{ color: '#A7F3D0', fontWeight: '600' }}>
                Speaking live • {formatCallDuration(activeCallDuration)}
              </p>
            </div>
            <div className="call-actions-row">
              <button
                className="btn-call-decline"
                style={{ minWidth: '180px', background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', color: '#FFFFFF', borderColor: 'transparent', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)' }}
                onClick={handleEndActiveCall}
              >
                <span>🔴</span>
                <span>End Call</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outgoing Call to Priya Overlay */}
      {outgoingCall && (
        <div className="incoming-call-overlay" role="dialog" aria-modal="true">
          <div className="incoming-call-card outgoing-call-card">
            <div className="call-pulse-cluster">
              <div className="call-ripple-ring"></div>
              <div className="call-ripple-ring"></div>
              <div className="call-avatar-circle" style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}>👩‍💼</div>
            </div>
            <div className="call-meta-stack">
              <span className="call-incoming-label" style={{ color: '#34D399', letterSpacing: '0.08em', fontWeight: '800' }}>CALLING PRIYA</span>
              <h2 className="call-caller-name">{outgoingCall.target}</h2>
              <p className="call-sub-note">{outgoingCall.phone} • Ringing Family Dashboard</p>
            </div>
            <div className="call-actions-row">
              <button
                className="btn-call-decline"
                style={{ minWidth: '170px', background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', color: '#FFFFFF', borderColor: 'transparent', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)' }}
                onClick={handleEndOutgoingCall}
              >
                <span>🔴</span>
                <span>End Call</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fall Emergency 30s Countdown Modal Overlay */}
      {fallModalOpen && (
        <FallEmergencyModal
          isOpen={fallModalOpen}
          fallReason={fallReason}
          onConfirmSafe={handleFallModalSafe}
          onEmergencyEscalate={handleSOS}
          selectedLang={selectedLang}
        />
      )}

      {/* Health Check-In Interactive Overlay Card */}
      {currentCheckIn && (
        <CheckInCard
          checkIn={currentCheckIn}
          onAnswer={handleCheckInResponse}
          onDismiss={dismissCheckIn}
          isListening={isListening}
          interimText={interimText}
        />
      )}
    </main>
  );
}
