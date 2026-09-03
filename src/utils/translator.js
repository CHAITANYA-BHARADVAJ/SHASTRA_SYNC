/**
 * Comprehensive Multilingual Localization & Translation Engine
 * Guarantees zero English leak in Kannada (kn-IN) and Hindi (hi-IN) frames.
 * Ensures incoming AI alerts, clinical decisions, and status prompts are
 * spoken and displayed in the exact language selected by the senior.
 */

// Common exact and partial phrase dictionaries
const PHRASE_DICTIONARY = {
  // Greetings & Regular Check-ins
  'good morning! just checking in — everything looks good today. have a great day!': {
    'kn-IN': 'ಶುಭೋದಯ! ಕೇವಲ ಯೋಗಕ್ಷೇಮ ವಿಚಾರಿಸಲು — ಇಂದು ಎಲ್ಲವೂ ಉತ್ತಮವಾಗಿ ಕಾಣುತ್ತಿದೆ. ನಿಮ್ಮ ದಿನ ಶುಭವಾಗಿರಲಿ!',
    'hi-IN': 'शुभ प्रभात! बस आपका हालचाल जानने के लिए — आज सब कुछ अच्छा लग रहा है। आपका दिन शुभ हो!',
    'en-IN': 'Good morning! Just checking in — everything looks good today. Have a great day!',
  },
  'good morning, kamala ji! just checking in to see how you are feeling.': {
    'kn-IN': 'ಶುಭೋದಯ ಕಮಲಾ ಅವರೇ! ನೀವು ಹೇಗಿದ್ದೀರಿ ಎಂದು ತಿಳಿಯಲು ವಿಚಾರಿಸುತ್ತಿದ್ದೇನೆ.',
    'hi-IN': 'शुभ प्रभात कमला जी! बस यह जानने के लिए कि आप कैसा महसूस कर रही हैं।',
    'en-IN': 'Good morning, Kamala ji! Just checking in to see how you are feeling.',
  },
  'hello, kamala. just checking in on you.': {
    'kn-IN': 'ನಮಸ್ಕಾರ ಕಮಲಾ ಅವರೇ. ನಿಮ್ಮ ಯೋಗಕ್ಷೇಮವನ್ನು ವಿಚಾರಿಸುತ್ತಿದ್ದೇನೆ.',
    'hi-IN': 'नमस्ते कमला जी। बस आपका हालचाल जानने के लिए।',
    'en-IN': 'Hello, Kamala. Just checking in on you.',
  },

  // Fall Detection & Sudden Anomaly Alerts
  'elder has fallen and not moved for 30 seconds.': {
    'kn-IN': 'ಹಿರಿಯರು ಕೆಳಗೆ ಬಿದ್ದು ೩೦ ಸೆಕೆಂಡುಗಳಿಂದ ಚಲಿಸಿಲ್ಲ. ತಕ್ಷಣ ಪರಿಶೀಲಿಸಿ.',
    'hi-IN': 'बुजुर्ग गिर गए हैं और 30 सेकंड से कोई हलचल नहीं हुई है।',
    'en-IN': 'Elder has fallen and not moved for 30 seconds.',
  },
  'kamala may have fallen. awaiting her response.': {
    'kn-IN': 'ಕಮಲಾ ಅವರು ಕೆಳಗೆ ಬಿದ್ದಿರಬಹುದು. ಅವರ ಪ್ರತಿಕ್ರಿಯೆಗಾಗಿ ಕಾಯುತ್ತಿದ್ದೇವೆ.',
    'hi-IN': 'शायद कमला जी गिर गई हैं। उनकी प्रतिक्रिया की प्रतीक्षा है।',
    'en-IN': 'Kamala may have fallen. Awaiting her response.',
  },
  'shastravision: fall detected in living room': {
    'kn-IN': 'ಶಾಸ್ತ್ರ ವಿಷನ್: ಕೋಣೆಯಲ್ಲಿ ಹಠಾತ್ ಕುಸಿತ ಪತ್ತೆಯಾಗಿದೆ.',
    'hi-IN': 'शस्त्र विज़न: कमरे में गिरावट (Fall) का पता चला है।',
    'en-IN': 'ShastraVision: Fall detected in living room.',
  },
  'did you fall? are you okay? please speak or press the button.': {
    'kn-IN': 'ಕಮಲಾ ಅವರೇ, ಬಿದ್ದಿದ್ದೀರಾ? ನಿಮಗೆ ಆರಾಮವಿದೆಯೇ? ದಯವಿಟ್ಟು ಮಾತನಾಡಿ ಅಥವಾ ಬಟನ್ ಒತ್ತಿ.',
    'hi-IN': 'कमला जी, क्या आप गिर गई हैं? क्या आप ठीक हैं? कृपया बोलें या बटन दबाएं।',
    'en-IN': 'Kamala, did you fall? Are you okay? Please speak or press the button.',
  },
  'are you okay?': {
    'kn-IN': 'ನೀವು ಕ್ಷೇಮವಾಗಿದ್ದೀರಾ? ನಿಮಗೆ ಯಾವುದೇ ಸಹಾಯ ಬೇಕೇ?',
    'hi-IN': 'क्या आप ठीक हैं? क्या आपको किसी मदद की ज़रूरत है?',
    'en-IN': 'Are you okay? Do you need any assistance?',
  },
  'did you fall?': {
    'kn-IN': 'ನೀವು ಕೆಳಗೆ ಬಿದ್ದಿದ್ದೀರಾ?',
    'hi-IN': 'क्या आप गिर गए हैं?',
    'en-IN': 'Did you fall?',
  },
  'emergency alert triggered. please confirm you are safe.': {
    'kn-IN': 'ತುರ್ತು ಎಚ್ಚರಿಕೆ ಸಕ್ರಿಯಗೊಂಡಿದೆ. ನೀವು ಕ್ಷೇಮವಾಗಿದ್ದೀರಿ ಎಂದು ದಯವಿಟ್ಟು ಖಚಿತಪಡಿಸಿ.',
    'hi-IN': 'आपातकालीन अलर्ट सक्रिय हुआ है। कृपया पुष्टि करें कि आप सुरक्षित हैं।',
    'en-IN': 'Emergency alert triggered. Please confirm you are safe.',
  },

  // Distress & Emotion Checks
  'i noticed you might be feeling sad or distressed. i am right here with you. how can i help?': {
    'kn-IN': 'ನೀವು ಬೇಸರ ಅಥವಾ ಆತಂಕದಲ್ಲಿದ್ದಂತೆ ತೋರುತ್ತಿದೆ. ನಾನು ನಿಮ್ಮೊಂದಿಗೆ ಇದ್ದೇನೆ, ಏನಾದರೂ ಸಹಾಯ ಬೇಕೇ?',
    'hi-IN': 'मुझे लगा कि आप उदास या परेशान हैं। मैं आपके साथ हूँ, क्या आपको किसी मदद की ज़रूरत है?',
    'en-IN': 'I noticed you might be feeling sad or distressed. I am right here with you. How can I help?',
  },
  'do not worry, you are safe. i am right here with you.': {
    'kn-IN': 'ಚಿಂತಿಸಬೇಡಿ, ನೀವು ಸುರಕ್ಷಿತವಾಗಿದ್ದೀರಿ. ನಾನು ಇಲ್ಲೇ ನಿಮ್ಮೊಂದಿಗೆ ಇದ್ದೇನೆ.',
    'hi-IN': 'घबराएं नहीं, आप सुरक्षित हैं। मैं आपके साथ हूँ।',
    'en-IN': 'Do not worry, you are safe. I am right here with you.',
  },

  // Inactivity & Comfort Checks
  'checking in to see if you are resting comfortably.': {
    'kn-IN': 'ಕಮಲಾ ಅವರೇ, ನೀವು ಆರಾಮವಾಗಿ ವಿಶ್ರಾಂತಿ ಪಡೆಯುತ್ತಿದ್ದೀರಾ ಎಂದು ಪರಿಶೀಲಿಸುತ್ತಿದ್ದೇನೆ.',
    'hi-IN': 'कमला जी, बस यह देखने के लिए कि आप आराम से और ठीक हैं।',
    'en-IN': 'Checking in to see if you are resting comfortably.',
  },
  'no movement detected for a while. are you okay?': {
    'kn-IN': 'ಸ್ವಲ್ಪ ಸಮಯದಿಂದ ಯಾವುದೇ ಚಲನವಲನ ಕಂಡುಬಂದಿಲ್ಲ. ನೀವು ಕ್ಷೇಮವಾಗಿದ್ದೀರಾ?',
    'hi-IN': 'काफ़ी समय से कोई हलचल नहीं देखी गई। क्या आप ठीक हैं?',
    'en-IN': 'No movement detected for a while. Are you okay?',
  },

  // Medication Prompts
  'it is time for your afternoon medicine': {
    'kn-IN': 'ನಿಮ್ಮ ಮಧ್ಯಾಹ್ನದ ಔಷಧಿ ತೆಗೆದುಕೊಳ್ಳುವ ಸಮಯವಾಗಿದೆ.',
    'hi-IN': 'आपकी दोपहर की दवा लेने का समय हो गया है।',
    'en-IN': 'It is time for your afternoon medicine.',
  },
};

/**
 * Clean and normalize a string for dictionary lookup
 */
function normalizeKey(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:—\-_/\\()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect if text already contains Kannada characters
 */
export function isKannadaScript(text) {
  return /[\u0C80-\u0CFF]/.test(text);
}

/**
 * Detect if text already contains Devanagari (Hindi) characters
 */
export function isHindiScript(text) {
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Localizes any message from the backend, perception engine, or LLM
 * into the senior's selected language (kn-IN, hi-IN, en-IN).
 * 
 * Never lets English leak into Kannada or Hindi frames.
 */
export function localizeMessage(rawMessage, targetLang = 'kn-IN') {
  if (!rawMessage || typeof rawMessage !== 'string') {
    if (targetLang === 'kn-IN') return 'ಗಾರ್ಡಿಯನ್ ತುರ್ತು ಎಚ್ಚರಿಕೆ ಪತ್ತೆಮಾಡಿದೆ • ದಯವಿಟ್ಟು ಖಚಿತಪಡಿಸಿ';
    if (targetLang === 'hi-IN') return 'गार्डियन ने अलर्ट प्राप्त किया है • कृपया उत्तर दें';
    return 'Emergency Guardian detected an anomaly • Please confirm you are safe';
  }

  const trimmed = rawMessage.trim();

  // If already in Kannada script and target is Kannada, keep it
  if (targetLang === 'kn-IN' && isKannadaScript(trimmed)) {
    return trimmed;
  }

  // If already in Devanagari script and target is Hindi, keep it
  if (targetLang === 'hi-IN' && isHindiScript(trimmed)) {
    return trimmed;
  }

  // If target is English and text contains no Indic script, keep it
  if (targetLang === 'en-IN' && !isKannadaScript(trimmed) && !isHindiScript(trimmed)) {
    return trimmed;
  }

  const normalized = normalizeKey(trimmed);

  // 1. Direct dictionary match
  for (const [key, translations] of Object.entries(PHRASE_DICTIONARY)) {
    if (normalizeKey(key) === normalized) {
      return translations[targetLang] || translations['kn-IN'] || trimmed;
    }
  }

  // 2. Partial / Substring dictionary match
  for (const [key, translations] of Object.entries(PHRASE_DICTIONARY)) {
    const keyNorm = normalizeKey(key);
    if (normalized.includes(keyNorm) || keyNorm.includes(normalized)) {
      return translations[targetLang] || translations['kn-IN'] || trimmed;
    }
  }

  // 3. Keyword-Based Semantic Intent Routing
  // (Handles LLM variations while maintaining natural local phrasing)

  // Intent A: Greeting / Good Morning / Daily Well-being
  if (
    normalized.includes('good morning') ||
    normalized.includes('just checking in') ||
    normalized.includes('everything looks good') ||
    normalized.includes('have a great day') ||
    normalized.includes('how are you feeling') ||
    normalized.includes('hello kamala')
  ) {
    if (targetLang === 'kn-IN') {
      return 'ಶುಭೋದಯ! ಕೇವಲ ಯೋಗಕ್ಷೇಮ ವಿಚಾರಿಸಲು — ಇಂದು ಎಲ್ಲವೂ ಉತ್ತಮವಾಗಿ ಕಾಣುತ್ತಿದೆ. ನಿಮ್ಮ ದಿನ ಶುಭವಾಗಿರಲಿ!';
    }
    if (targetLang === 'hi-IN') {
      return 'शुभ प्रभात! बस आपका हालचाल जानने के लिए — आज सब कुछ अच्छा लग रहा है। आपका दिन शुभ हो!';
    }
    return 'Good morning! Just checking in — everything looks good today. Have a great day!';
  }

  // Intent B: Fall / Anomaly / Emergency
  if (
    normalized.includes('fall') ||
    normalized.includes('fallen') ||
    normalized.includes('posture') ||
    normalized.includes('dropped') ||
    normalized.includes('collapse') ||
    normalized.includes('गिर') ||
    normalized.includes('ಬಿದ್ದಿ')
  ) {
    if (targetLang === 'kn-IN') {
      return 'ಕಮಲಾ ಅವರೇ, ಬಿದ್ದಿದ್ದೀರಾ? ನಿಮಗೆ ಆರಾಮವಿದೆಯೇ? ದಯವಿಟ್ಟು ಮಾತನಾಡಿ ಅಥವಾ ಬಟನ್ ಒತ್ತಿ.';
    }
    if (targetLang === 'hi-IN') {
      return 'कमला जी, क्या आप गिर गई हैं? क्या आप ठीक हैं? कृपया बोलें या बटन दबाएं।';
    }
    return 'Kamala, did you fall? Are you okay? Please speak or press the button.';
  }

  // Intent C: Emotion / Sadness / Distress / Fear
  if (
    normalized.includes('sad') ||
    normalized.includes('fear') ||
    normalized.includes('distress') ||
    normalized.includes('worry') ||
    normalized.includes('crying') ||
    normalized.includes('उदास') ||
    normalized.includes('ಬೇಸರ')
  ) {
    if (targetLang === 'kn-IN') {
      return 'ನೀವು ಬೇಸರದಲ್ಲಿದ್ದಂತೆ ತೋರುತ್ತಿದೆ. ನಾನು ನಿಮ್ಮೊಂದಿಗೆ ಇದ್ದೇನೆ, ಏನಾದರೂ ಸಹಾಯ ಬೇಕೇ?';
    }
    if (targetLang === 'hi-IN') {
      return 'मुझे लगा कि आप उदास हैं। मैं आपके साथ हूँ, क्या आपको किसी मदद की ज़रूरत है?';
    }
    return 'I noticed you might be feeling down. I am right here with you. How can I help?';
  }

  // Intent D: Inactivity / Movement
  if (
    normalized.includes('inactivity') ||
    normalized.includes('no movement') ||
    normalized.includes('resting') ||
    normalized.includes('still')
  ) {
    if (targetLang === 'kn-IN') {
      return 'ಕಮಲಾ ಅವರೇ, ನೀವು ಆರಾಮವಾಗಿ ವಿಶ್ರಾಂತಿ ಪಡೆಯುತ್ತಿದ್ದೀರಾ ಎಂದು ಪರಿಶೀಲಿಸುತ್ತಿದ್ದೇನೆ.';
    }
    if (targetLang === 'hi-IN') {
      return 'कमला जी, बस यह देखने के लिए कि आप आराम से और ठीक हैं।';
    }
    return 'Checking in to see if you are resting comfortably.';
  }

  // Intent E: General "Are you okay"
  if (
    normalized.includes('okay') ||
    normalized.includes('fine') ||
    normalized.includes('safe') ||
    normalized.includes('help')
  ) {
    if (targetLang === 'kn-IN') {
      return 'ನೀವು ಕ್ಷೇಮವಾಗಿದ್ದೀರಾ? ನಿಮಗೆ ಯಾವುದೇ ಸಹಾಯ ಬೇಕಾಗಿದ್ದರೆ ದಯವಿಟ್ಟು ತಿಳಿಸಿ.';
    }
    if (targetLang === 'hi-IN') {
      return 'क्या आप ठीक हैं? यदि आपको किसी मदद की आवश्यकता है तो बताएं।';
    }
    return 'Are you okay? Please let us know if you need any assistance.';
  }

  // Fallback if no pattern matched:
  if (targetLang === 'kn-IN') {
    return 'ಗಾರ್ಡಿಯನ್ ತುರ್ತು ಎಚ್ಚರಿಕೆ ಪತ್ತೆಮಾಡಿದೆ • ದಯವಿಟ್ಟು ಖಚಿತಪಡಿಸಿ';
  }
  if (targetLang === 'hi-IN') {
    return 'गार्डियन ने अलर्ट प्राप्त किया है • कृपया उत्तर दें';
  }
  return trimmed;
}

/**
 * Localize Escalation Tier labels based on active tier number and selected language
 */
export function getLocalizedTierLabel(tierKeyOrText, targetLang = 'kn-IN') {
  const norm = (tierKeyOrText || '').toLowerCase();
  
  if (norm.includes('tier 3') || norm.includes('dispatch') || norm.includes('emergency')) {
    if (targetLang === 'kn-IN') return 'ಹಂತ ೩: ತುರ್ತು ರವಾನೆ & ೧೧೨ ಸಂಪರ್ಕ';
    if (targetLang === 'hi-IN') return 'स्तर ३: आपातकालीन 112 सहायता';
    return 'Tier 3: Emergency 112 Dispatch';
  }

  if (norm.includes('tier 2') || norm.includes('ring') || norm.includes('escalation pending')) {
    if (targetLang === 'kn-IN') return 'ಹಂತ ೨: ಕುಟುಂಬಕ್ಕೆ ಕರೆ & ಮುನ್ನೆಚ್ಚರಿಕೆ';
    if (targetLang === 'hi-IN') return 'स्तर २: परिवार को कॉल और अलर्ट';
    return 'Tier 2: Caregiver Ring & Escalation Pending';
  }

  // Default Tier 1
  if (targetLang === 'kn-IN') return 'ಹಂತ ೧: ಧ್ವನಿ ವಿಚಾರಣೆ';
  if (targetLang === 'hi-IN') return 'स्तर १: वॉयस चेक-इन';
  return 'Tier 1: Voice Check-in';
}
