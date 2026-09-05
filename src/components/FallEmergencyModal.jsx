import { useEffect, useState, useRef } from 'react';
import { playEmergencyAlarm, playSuccessChime } from '../utils/audioChimes';
import { localizeMessage } from '../utils/translator';
import './FallEmergencyModal.css';

const MODAL_I18N = {
  'en-IN': {
    title: 'DID YOU FALL? ARE YOU OKAY?',
    subtitle: 'Did you fall? Are you fine? Please confirm if you are safe or we will call for help.',
    countdownLabel: 'Connecting to 112 & Family Help in:',
    safePrimary: 'I AM OKAY',
    safeSub: 'I am fine • Cancel Alert',
    helpPrimary: 'I NEED HELP',
    helpSub: 'Call 112 & Family Now',
    secondsShort: 's',
  },
  'kn-IN': {
    title: 'ನೀವು ಕೆಳಗೆ ಬಿದ್ದಿದ್ದೀರಾ? ಕ್ಷೇಮವಾಗಿದ್ದೀರಾ?',
    subtitle: 'ಕಮಲಾ ಅವರೇ, ನೀವು ಬಿದ್ದಿದ್ದೀರಾ? ನಿಮಗೆ ಆರಾಮವಿದೆಯೇ? ದಯವಿಟ್ಟು ತಿಳಿಸಿ.',
    countdownLabel: 'ಸ್ವಯಂಚಾಲಿತ ತುರ್ತು ಕರೆ ಇನ್ನು:',
    safePrimary: 'ನಾನು ಕ್ಷೇಮವಾಗಿದ್ದೇನೆ',
    safeSub: 'ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ • ಎಚ್ಚರಿಕೆ ರದ್ದುಮಾಡಿ',
    helpPrimary: 'ತಕ್ಷಣ ಸಹಾಯ ಬೇಕು',
    helpSub: '೧೧೨ ಮತ್ತು ಕುಟುಂಬಕ್ಕೆ ಕರೆ',
    secondsShort: 'ಸೆ',
  },
  'hi-IN': {
    title: 'क्या आप गिर गए हैं? क्या आप ठीक हैं?',
    subtitle: 'कमला जी, क्या आप गिर गईं? क्या आप ठीक हैं? कृपया बताएं।',
    countdownLabel: 'स्वतः आपातकालीन कॉल में शेष समय:',
    safePrimary: 'मैं ठीक हूँ',
    safeSub: 'मैं सुरक्षित हूँ • अलर्ट रद्द करें',
    helpPrimary: 'तुरंत मदद चाहिए',
    helpSub: '112 और परिवार को कॉल',
    secondsShort: 'से',
  },
};

/**
 * Fall & Critical Distress Emergency Verification Modal.
 * Prompts the senior with an empathetic, caring voice/tap countdown.
 */
export function FallEmergencyModal({
  isOpen,
  fallReason,
  onConfirmSafe,
  onEmergencyEscalate,
  selectedLang = 'en-IN',
  elderName = 'Kamala',
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const timerRef = useRef(null);

  const t = MODAL_I18N[selectedLang] || MODAL_I18N['en-IN'];
  const defaultFallPrompt = `${elderName}, did you fall? Are you fine? Please let us know if you need help.`;
  const localizedReason = fallReason ? localizeMessage(fallReason, selectedLang) : defaultFallPrompt;

  useEffect(() => {
    if (isOpen) {
      setSecondsRemaining(30);
      playEmergencyAlarm();

      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            if (onEmergencyEscalate) onEmergencyEscalate('Timeout - No Response from Elder');
            return 0;
          }
          if (prev % 5 === 0) {
            playEmergencyAlarm();
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, onEmergencyEscalate]);

  if (!isOpen) return null;

  const handleSafeClick = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    playSuccessChime();
    onConfirmSafe();
  };

  const handleHelpClick = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (onEmergencyEscalate) onEmergencyEscalate('Manual Emergency Escalation');
  };

  const progressPct = (secondsRemaining / 30) * 100;

  return (
    <div className="emergency-modal-backdrop" role="dialog" aria-modal="true">
      <div className="emergency-modal-card">
        {/* Pulsing Emergency Header */}
        <div className="emergency-beacon-header">
          <div className="beacon-ring"></div>
          <span className="beacon-icon">🚨</span>
        </div>

        <h1 className="emergency-title">{t.title}</h1>
        <h2 className="emergency-hindi-title">{t.subtitle}</h2>

        <p className="emergency-reason-text">
          {localizedReason}
        </p>

        {/* 30-Second Countdown Meter */}
        <div className="emergency-countdown-box">
          <div className="countdown-number">{secondsRemaining}{t.secondsShort}</div>
          <div className="countdown-label">{t.countdownLabel}</div>
          <div className="countdown-bar-bg">
            <div className="countdown-bar-fill" style={{ transform: `scaleX(${progressPct / 100})` }} />
          </div>
        </div>

        {/* Big Accessible Choice Actions */}
        <div className="emergency-actions-grid">
          <button className="btn-modal-safe" onClick={handleSafeClick}>
            <span className="btn-modal-icon">💚</span>
            <div className="btn-modal-text">
              <span className="modal-primary">{t.safePrimary}</span>
              <span className="modal-secondary">{t.safeSub}</span>
            </div>
          </button>

          <button className="btn-modal-help" onClick={handleHelpClick}>
            <span className="btn-modal-icon">🚨</span>
            <div className="btn-modal-text">
              <span className="modal-primary">{t.helpPrimary}</span>
              <span className="modal-secondary">{t.helpSub}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
