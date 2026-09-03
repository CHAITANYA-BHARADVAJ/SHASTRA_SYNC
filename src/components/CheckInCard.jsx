import React from 'react';
import './CheckInCard.css';

const CHECKIN_I18N = {
  'kn-IN': {
    listeningHint: 'ನಿಮ್ಮ ಉತ್ತರವನ್ನು ಆಲಿಸಲಾಗುತ್ತಿದೆ...',
    callFamilyBtn: '📞 ಕುಟುಂಬಕ್ಕೆ ಈಗಲೇ ಕರೆ ಮಾಡಿ',
    imOkayBtn: 'ಬೇಡ, ನಾನು ಕ್ಷೇಮ',
    reassuranceFooter: 'ಗಾರ್ಡಿಯನ್ ಆರೋಗ್ಯ ಪರಿಶೀಲನೆ • ಆಯ್ಕೆಯನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ ಅಥವಾ ಮಾತನಾಡಿ',
  },
  'hi-IN': {
    listeningHint: 'आपका उत्तर सुन रहे हैं...',
    callFamilyBtn: '📞 परिवार को अभी कॉल करें',
    imOkayBtn: 'नहीं, मैं ठीक हूँ',
    reassuranceFooter: 'गार्डियन स्वास्थ्य जांच • विकल्प चुनें या बोलें',
  },
  'en-IN': {
    listeningHint: 'Listening to your answer...',
    callFamilyBtn: '📞 Call family now',
    imOkayBtn: "No, I'm okay",
    reassuranceFooter: 'Care Guardian Health Signal • Tap any option or speak clearly',
  },
};

/**
 * Reusable CheckInCard Component
 * Renders all 4 check-in types (Cognitive, Meal, Sleep, Mobility)
 * with large tap targets, accessible contrast, and calm presentation.
 * Fully localized for Kannada, Hindi, and English.
 */
export default function CheckInCard({
  checkInType,
  badgeText = 'Daily Check-in',
  prompt,
  subPrompt,
  options = [],
  onSelectOption,
  onDismiss,
  isListening = false,
  interimVoiceText = '',
  followUpPrompt = null,
  onFollowUpAction = null,
  selectedLang = 'kn-IN',
}) {
  const t = CHECKIN_I18N[selectedLang] || CHECKIN_I18N['kn-IN'];

  return (
    <div className="checkin-backdrop" role="dialog" aria-modal="true" aria-labelledby="checkin-title">
      <div className={`checkin-card checkin-${checkInType}`}>
        
        {/* Header Badge */}
        <div className="checkin-header">
          <span className="checkin-badge">
            <span className="checkin-badge-dot"></span>
            {badgeText}
          </span>
          {onDismiss && (
            <button
              className="checkin-btn-dismiss"
              onClick={onDismiss}
              aria-label="Close check-in"
            >
              ✕
            </button>
          )}
        </div>

        {/* Question Prompt */}
        <div className="checkin-prompt-box">
          <h2 id="checkin-title" className="checkin-title">
            {prompt}
          </h2>
          {subPrompt && <p className="checkin-subtitle">{subPrompt}</p>}
        </div>

        {/* Live Voice Indicator if mic active */}
        {isListening && (
          <div className="checkin-voice-pill">
            <span className="checkin-mic-pulse">🎙️</span>
            <span className="checkin-voice-text">
              {interimVoiceText ? `"${interimVoiceText}"` : t.listeningHint}
            </span>
          </div>
        )}

        {/* Follow-up Prompt (e.g., Unsteady steadiness follow-up to call family) */}
        {followUpPrompt ? (
          <div className="checkin-followup-box">
            <p className="checkin-followup-text">{followUpPrompt}</p>
            <div className="checkin-followup-actions">
              <button
                className="checkin-btn-followup-primary"
                onClick={onFollowUpAction}
              >
                {t.callFamilyBtn}
              </button>
              <button
                className="checkin-btn-followup-secondary"
                onClick={onDismiss}
              >
                {t.imOkayBtn}
              </button>
            </div>
          </div>
        ) : (
          /* Main Large Tap Options */
          <div className="checkin-options-grid">
            {options.map((opt, idx) => (
              <button
                key={opt.value || idx}
                className={`checkin-opt-btn checkin-opt-${opt.variant || 'neutral'}`}
                onClick={() => onSelectOption(opt)}
              >
                <span className="checkin-opt-label">{opt.label}</span>
                {opt.subLabel && <span className="checkin-opt-sub">{opt.subLabel}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Reassurance Footer */}
        <div className="checkin-footer">
          <span className="checkin-footer-shield">🛡️</span>
          <span>{t.reassuranceFooter}</span>
        </div>

      </div>
    </div>
  );
}
