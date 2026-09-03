import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Helper to auto-detect language from speech transcript
 */
export function detectLanguage(text, fallback = 'en-IN') {
  return 'en-IN';
}

/**
 * Native Web Speech API Voice Handler.
 * Captures both interim and finalized speech transcript seamlessly.
 */
export function useVoiceHandler() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [interimText, setInterimText] = useState('');
  const [debugLogs, setDebugLogs] = useState([]);

  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const isSessionActiveRef = useRef(false);
  const listeningSecondsLeftRef = useRef(5);
  const listeningTimerIntervalRef = useRef(null);
  const accumulatedTranscriptRef = useRef('');
  const latestSpokenTranscriptRef = useRef('');
  const onTranscriptCallbackRef = useRef(null);
  const languageCodeRef = useRef('en-IN');

  const silenceTimeoutRef = useRef(null);

  // Debug logging
  const log = useCallback((msg, type = 'info') => {
    const ts = new Date().toLocaleTimeString('en-IN', { hour12: false });
    console.log(`[${ts}] [${type}] ${msg}`);
    setDebugLogs((prev) => [{ ts, msg, type, id: Date.now() + Math.random() }, ...prev].slice(0, 100));
  }, []);

  const clearLogs = useCallback(() => setDebugLogs([]), []);

  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognition;
  const isTTSSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;

  const clearTimers = useCallback(() => {
    if (listeningTimerIntervalRef.current) {
      clearInterval(listeningTimerIntervalRef.current);
      listeningTimerIntervalRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  /**
   * Stop recognition session and cancel any speech synthesis
   */
  const stop = useCallback(() => {
    clearTimers();
    isSessionActiveRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    setIsListening(false);
    setSecondsLeft(0);
    setInterimText('');
    accumulatedTranscriptRef.current = '';
    latestSpokenTranscriptRef.current = '';
    onTranscriptCallbackRef.current = null;
  }, [clearTimers]);

  /**
   * Finish recognition session and deliver speech transcript
   */
  const finishListening = useCallback(() => {
    clearTimers();
    isSessionActiveRef.current = false;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }

    setIsListening(false);
    setSecondsLeft(0);
    setInterimText('');

    const cb = onTranscriptCallbackRef.current;
    onTranscriptCallbackRef.current = null;

    const finalResult = (latestSpokenTranscriptRef.current || accumulatedTranscriptRef.current).trim();

    if (finalResult) {
      log(`📝 Captured Speech: "${finalResult}"`, 'success');
      if (cb) cb(finalResult, languageCodeRef.current || 'en-IN');
    } else {
      log('⚠️ Listening concluded with no speech detected.', 'warn');
      if (cb) cb(null, languageCodeRef.current || 'en-IN');
    }

    accumulatedTranscriptRef.current = '';
    latestSpokenTranscriptRef.current = '';
  }, [clearTimers, log]);

  /**
   * Test mic hardware
   */
  const testMicrophone = useCallback(async () => {
    setError(null);
    log('🎙️ Testing hardware microphone...', 'info');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = 'navigator.mediaDevices.getUserMedia is unavailable.';
      setError(msg);
      log(msg, 'error');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let maxVol = 0;

      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 60));
        analyser.getByteFrequencyData(buffer);
        const currentVol = buffer.reduce((a, b) => a + b, 0) / buffer.length;
        if (currentVol > maxVol) maxVol = currentVol;
      }

      stream.getTracks().forEach((t) => t.stop());
      audioCtx.close().catch(() => {});

      if (maxVol > 3) {
        log(`🎉 HARDWARE SUCCESS! Peak volume: ${maxVol.toFixed(1)}/128`, 'success');
      } else {
        log(`⚠️ Hardware volume very low (${maxVol.toFixed(1)}/128). Check if mic is muted in Windows or Stereo Mix is default.`, 'error');
      }
      return true;
    } catch (err) {
      log(`❌ Mic permission error: ${err.message}`, 'error');
      return false;
    }
  }, [log]);

  /**
   * Start listening (supports both positional and object options)
   */
  const listen = useCallback(
    (arg1 = 'en-IN', arg2) => {
      setError(null);
      setInterimText('');

      let targetLang = 'en-IN';
      let onTranscriptCb = null;

      if (typeof arg1 === 'object' && arg1 !== null) {
        targetLang = arg1.languageCode || arg1.language || 'en-IN';
        onTranscriptCb = arg1.onTranscript || null;
      } else if (typeof arg1 === 'string') {
        targetLang = arg1;
        onTranscriptCb = arg2 || null;
      }

      if (!SpeechRecognition) {
        const msg = 'Web Speech API not supported in this browser. Please use Chrome or Edge.';
        setError(msg);
        log(msg, 'error');
        if (onTranscriptCb) onTranscriptCb(null);
        return;
      }

      // Forcibly stop any ongoing speech/audio so microphone can record cleanly
      stop();

      const duration = (typeof arg1 === 'object' && arg1?.duration) ? arg1.duration : 5;

      onTranscriptCallbackRef.current = onTranscriptCb;
      languageCodeRef.current = targetLang;
      accumulatedTranscriptRef.current = '';
      latestSpokenTranscriptRef.current = '';
      isSessionActiveRef.current = true;
      listeningSecondsLeftRef.current = duration;
      setSecondsLeft(duration);
      setIsListening(true);

      log(`🎙️ Live Microphone Open (${targetLang} • ${duration}s). Ready...`, 'info');

      // 1. Countdown timer (5 seconds)
      listeningTimerIntervalRef.current = setInterval(() => {
        listeningSecondsLeftRef.current -= 1;
        setSecondsLeft(Math.max(0, listeningSecondsLeftRef.current));

        if (listeningSecondsLeftRef.current <= 0) {
          finishListening();
        }
      }, 1000);

      // 2. SpeechRecognition instance with High-Precision Multi-turn Buffering
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 3;
        rec.lang = targetLang;

        rec.onstart = () => {
          log(`🎙️ SpeechRecognition active (lang: ${targetLang})`, 'success');
          setIsListening(true);
        };

        rec.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = 0; i < event.results.length; ++i) {
            const resultItem = event.results[i];
            const transcriptChunk = resultItem[0]?.transcript || '';

            if (resultItem.isFinal) {
              finalTranscript += transcriptChunk + ' ';
            } else {
              interimTranscript += transcriptChunk;
            }
          }

          const cleanCombined = (finalTranscript + interimTranscript).trim().replace(/\s+/g, ' ');

          if (cleanCombined) {
            latestSpokenTranscriptRef.current = cleanCombined;
            setInterimText(cleanCombined);
            log(`📝 Heard: "${cleanCombined}"`, 'success');

            // ⚡ Smart Voice Activity Snapping:
            // 1.35s quiet buffer prevents cutting off seniors mid-sentence
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = setTimeout(() => {
              finishListening();
            }, 1350);
          }
        };

        rec.onerror = (e) => {
          log(`Speech Recognition event: ${e.error}`, e.error === 'no-speech' ? 'warn' : 'error');
          if (e.error === 'not-allowed') {
            setError('Microphone access blocked in browser settings.');
          } else if (e.error === 'network') {
            setError('Google Speech server was unreachable on this Wi-Fi network.');
          }
        };

        rec.onend = () => {
          if (isSessionActiveRef.current && listeningSecondsLeftRef.current > 0) {
            try {
              rec.start();
            } catch (err) {}
          }
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (err) {
        log(`Failed to start SpeechRecognition: ${err.message}`, 'error');
        setIsListening(false);
        if (onTranscriptCb) onTranscriptCb(null);
      }
    },
    [SpeechRecognition, stop, finishListening, log]
  );

  // Load voices dynamically on launch
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  /**
   * Helper to select appropriate synthesizer voice matching language (Kannada, Hindi, English)
   */
  /**
   * Select crystal-clear, natural, non-robotic synthesizer voice with pleasant accent
   */
  /**
   * Select crystal-clear, authentic natural voice tailored for each language
   */
  const getVoiceForLanguage = useCallback((langCode) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const langLower = (langCode || 'en-IN').toLowerCase();
    const prefix = langLower.split('-')[0]; // 'kn', 'hi', 'ta', 'te', 'en'

    // 1. Kannada ('kn' / 'kn-IN')
    if (prefix === 'kn') {
      const knVoice =
        voices.find((v) => (v.name.toLowerCase().includes('gagan') || v.name.toLowerCase().includes('sapna')) && v.name.toLowerCase().includes('natural')) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('kn') && (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('neural'))) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('kn') || v.name.toLowerCase().includes('kannada') || v.name.includes('ಕನ್ನಡ')) ||
        voices.find((v) => v.lang.toLowerCase() === 'kn-in');

      if (knVoice) {
        log(`🎙️ Using Natural Kannada Voice: "${knVoice.name}" (${knVoice.lang})`, 'success');
        return knVoice;
      }
    }

    // 2. Hindi ('hi' / 'hi-IN')
    if (prefix === 'hi') {
      const hiVoice =
        voices.find((v) => (v.name.toLowerCase().includes('swara') || v.name.toLowerCase().includes('madhur')) && v.name.toLowerCase().includes('natural')) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('hi') && (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('neural'))) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('hi') || v.name.toLowerCase().includes('hindi') || v.name.includes('हिन्दी')) ||
        voices.find((v) => v.lang.toLowerCase() === 'hi-in');

      if (hiVoice) {
        log(`🎙️ Using Natural Hindi Voice: "${hiVoice.name}" (${hiVoice.lang})`, 'success');
        return hiVoice;
      }
    }

    // 3. Tamil ('ta' / 'ta-IN')
    if (prefix === 'ta') {
      const taVoice =
        voices.find((v) => (v.name.toLowerCase().includes('pallavi') || v.name.toLowerCase().includes('valluvar')) && v.name.toLowerCase().includes('natural')) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('ta') && (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('neural'))) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('ta') || v.name.toLowerCase().includes('tamil'));

      if (taVoice) {
        log(`🎙️ Using Natural Tamil Voice: "${taVoice.name}" (${taVoice.lang})`, 'success');
        return taVoice;
      }
    }

    // 4. Telugu ('te' / 'te-IN')
    if (prefix === 'te') {
      const teVoice =
        voices.find((v) => (v.name.toLowerCase().includes('mohan') || v.name.toLowerCase().includes('shruti')) && v.name.toLowerCase().includes('natural')) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('te') && (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('neural'))) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('te') || v.name.toLowerCase().includes('telugu'));

      if (teVoice) {
        log(`🎙️ Using Natural Telugu Voice: "${teVoice.name}" (${teVoice.lang})`, 'success');
        return teVoice;
      }
    }

    // 5. English ('en' / 'en-IN' / 'en-US') - Natural & Clear
    const preferredEnglishVoices = [
      'neerja',
      'jenny',
      'aria',
      'google us english',
      'google uk english female',
      'guy',
      'sonia',
      'samantha',
      'karen',
      'microsoft zira'
    ];

    for (const name of preferredEnglishVoices) {
      const match = voices.find(
        (v) =>
          v.name.toLowerCase().includes(name) &&
          (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('online') || !v.name.toLowerCase().includes('desktop'))
      );
      if (match) {
        log(`🎙️ Using Clear English Voice: "${match.name}"`, 'success');
        return match;
      }
    }

    // Fallback: any voice matching language prefix that is not a legacy robotic voice
    const matchedPrefix = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith(prefix) &&
        !v.name.toLowerCase().includes('ravi') &&
        !v.name.toLowerCase().includes('neera') &&
        !v.name.toLowerCase().includes('david')
    );
    if (matchedPrefix) return matchedPrefix;

    const anyEn = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    return anyEn || voices[0];
  }, [log]);

  /**
   * Speak TTS then listen immediately with zero latency (supports both object and positional args)
   */
  const speakThenListen = useCallback(
    (arg1, arg2 = 'en-IN', arg3) => {
      setError(null);

      let msg = '';
      let targetLang = 'en-IN';
      let onTranscriptCb = null;

      if (typeof arg1 === 'object' && arg1 !== null) {
        msg = arg1.prompt || arg1.message || '';
        targetLang = arg1.languageCode || arg1.language || 'en-IN';
        onTranscriptCb = arg1.onTranscript || null;
      } else {
        msg = arg1 || '';
        targetLang = arg2;
        onTranscriptCb = arg3 || null;
      }

      // Auto-detect language script
      if (/[\u0C80-\u0CFF]/.test(msg)) targetLang = 'kn-IN';
      else if (/[\u0900-\u097F]/.test(msg)) targetLang = 'hi-IN';
      else if (/[\u0B80-\u0BFF]/.test(msg)) targetLang = 'ta-IN';
      else if (/[\u0C00-\u0C7F]/.test(msg)) targetLang = 'te-IN';

      log(`⚡ Clear Voice TTS (${targetLang}): "${msg.substring(0, 60)}..."`, 'info');

      if (!isTTSSupported) {
        listen(targetLang, onTranscriptCb);
        return;
      }

      // Clear any pending browser speech queue and wake up synthesizer
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        try { window.speechSynthesis.resume(); } catch (e) {}
      }

      const isIndic = ['kn', 'hi', 'ta', 'te'].includes(targetLang.split('-')[0]);
      const targetVoice = getVoiceForLanguage(targetLang);

      const utterance = new SpeechSynthesisUtterance(msg);
      utterance.lang = targetVoice ? targetVoice.lang : (isIndic ? targetLang : 'en-US');
      utterance.rate = isIndic ? 0.90 : 1.0;
      utterance.pitch = 1.0;

      if (targetVoice) {
        utterance.voice = targetVoice;
      }

      isSpeakingRef.current = true;
      setIsSpeaking(true);

      utterance.onend = () => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        listen(targetLang, onTranscriptCb);
      };

      utterance.onerror = () => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        listen(targetLang, onTranscriptCb);
      };

      window.speechSynthesis.speak(utterance);
    },
    [isTTSSupported, listen, log, getVoiceForLanguage]
  );

  const speak = useCallback(
    (message, languageCode = 'en-IN') => {
      if (!isTTSSupported) return;
      window.speechSynthesis.cancel();

      // Auto-detect language script
      let detectedLang = languageCode || 'en-IN';
      if (/[\u0C80-\u0CFF]/.test(message)) detectedLang = 'kn-IN';
      else if (/[\u0900-\u097F]/.test(message)) detectedLang = 'hi-IN';
      else if (/[\u0B80-\u0BFF]/.test(message)) detectedLang = 'ta-IN';
      else if (/[\u0C00-\u0C7F]/.test(message)) detectedLang = 'te-IN';

      const isIndic = ['kn', 'hi', 'ta', 'te'].includes(detectedLang.split('-')[0]);
      const targetVoice = getVoiceForLanguage(detectedLang);

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = targetVoice ? targetVoice.lang : (isIndic ? detectedLang : 'en-US');
      utterance.rate = isIndic ? 0.90 : 1.0;
      utterance.pitch = 1.0;

      if (targetVoice) {
        utterance.voice = targetVoice;
      }

      isSpeakingRef.current = true;
      setIsSpeaking(true);

      utterance.onend = () => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
      };
      utterance.onerror = () => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [isTTSSupported, getVoiceForLanguage]
  );

  return {
    speakThenListen,
    speak,
    listen,
    stop,
    finishListening,
    testMicrophone,
    isSpeaking,
    isListening,
    error,
    isSupported,
    isSecureContext,
    secondsLeft,
    interimText,
    debugLogs,
    clearLogs,
  };
}
