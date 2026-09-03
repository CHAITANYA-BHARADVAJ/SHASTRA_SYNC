import { useState, useEffect, useRef, useCallback } from 'react';
import { CHECK_IN_CONFIG } from '../config/checkInConfig';

/**
 * Days of the week in English, Kannada & Hindi for Cognitive Check-In
 */
const DAYS_I18N = {
  'kn-IN': ['ಭಾನುವಾರ', 'ಸೋಮವಾರ', 'ಮಂಗಳವಾರ', 'ಬುಧವಾರ', 'ಗುರುವಾರ', 'ಶುಕ್ರವಾರ', 'ಶನಿವಾರ'],
  'hi-IN': ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
  'en-IN': ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

/**
 * useCheckInScheduler Hook
 * Manages local daily scheduled timers, queues, and responses for
 * Cognitive, Meal, Sleep, and Mobility check-ins.
 */
export function useCheckInScheduler({
  onSendEvent,
  speakThenListen,
  speak,
  listen,
  stopVoice,
  selectedLang = 'kn-IN',
  isBusy = false, // true if SOS active or assistant speaking
}) {
  const [activeCheckIn, setActiveCheckIn] = useState(null);
  const [checkInQueue, setCheckInQueue] = useState([]);
  const [interimVoiceText, setInterimVoiceText] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [followUpOffer, setFollowUpOffer] = useState(null);

  const mealRetriesRef = useRef({}); // { breakfast: timestamp, ... }
  const completedTodayRef = useRef(new Set());

  // Load today's completed check-ins from localStorage
  const getTodayKey = () => `checkins_${new Date().toISOString().split('T')[0]}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(getTodayKey());
      if (saved) {
        completedTodayRef.current = new Set(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  const markCompleted = useCallback((checkInId) => {
    completedTodayRef.current.add(checkInId);
    try {
      localStorage.setItem(getTodayKey(), JSON.stringify([...completedTodayRef.current]));
    } catch (e) {}
  }, []);

  // Queue a check-in
  const enqueueCheckIn = useCallback((checkInItem) => {
    setCheckInQueue((prev) => {
      // Avoid duplicate pending items in queue
      if (prev.some((item) => item.id === checkInItem.id)) return prev;
      return [...prev, checkInItem];
    });
  }, []);

  // Process next check-in from queue when not busy
  useEffect(() => {
    if (isBusy || activeCheckIn || checkInQueue.length === 0) return;

    const [nextItem, ...remaining] = checkInQueue;
    setCheckInQueue(remaining);
    setActiveCheckIn(nextItem);
  }, [isBusy, activeCheckIn, checkInQueue]);

  /**
   * 1. Cognitive Check-In Builder
   */
  const createCognitiveCheckIn = useCallback(() => {
    const todayIndex = new Date().getDay();
    const langKey = DAYS_I18N[selectedLang] ? selectedLang : 'en-IN';
    const dayNames = DAYS_I18N[langKey];
    const correctDay = dayNames[todayIndex];

    // Pick 2 random distinct decoy days
    const otherIndices = [0, 1, 2, 3, 4, 5, 6].filter((i) => i !== todayIndex);
    const shuffledOthers = otherIndices.sort(() => 0.5 - Math.random());
    const decoys = [dayNames[shuffledOthers[0]], dayNames[shuffledOthers[1]]];

    const options = [
      { label: correctDay, value: 'correct', isCorrect: true, variant: 'primary' },
      { label: decoys[0], value: 'decoy1', isCorrect: false, variant: 'neutral' },
      { label: decoys[1], value: 'decoy2', isCorrect: false, variant: 'neutral' },
    ].sort(() => 0.5 - Math.random());

    const promptText = selectedLang === 'kn-IN'
      ? 'ಇಂದು ವಾರದ ಯಾವ ದಿನ?'
      : (selectedLang === 'hi-IN'
        ? 'आज सप्ताह का कौन सा दिन है?'
        : 'What day of the week is it today?');

    return {
      id: `cognitive_${Date.now()}`,
      type: 'cognitive',
      badgeText: selectedLang === 'kn-IN' ? 'ದೈನಂದಿನ ನೆನಪಿನ ಪರಿಶೀಲನೆ' : (selectedLang === 'hi-IN' ? 'दैनिक स्मृति जांच' : 'Orientation Check-in'),
      prompt: promptText,
      subPrompt: selectedLang === 'kn-IN' ? 'ಸರಿಯಾದ ದಿನವನ್ನು ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ಮಾತನಾಡಿ' : 'Tap today\'s day or speak your answer',
      options,
      correctDayName: correctDay,
      allDayNamesInLang: dayNames,
    };
  }, [selectedLang]);

  /**
   * 2. Meal Check-In Builder
   */
  const createMealCheckIn = useCallback((mealName = 'breakfast') => {
    const mealLabels = {
      breakfast: { en: 'breakfast', kn: 'ಬೆಳಗಿನ ಉಪಹಾರ', hi: 'सुबह का नाश्ता' },
      lunch: { en: 'lunch', kn: 'ಮಧ್ಯಾಹ್ನದ ಊಟ', hi: 'दोपहर का खाना' },
      dinner: { en: 'dinner', kn: 'ರಾತ್ರಿಯ ಊಟ', hi: 'रात का खाना' },
    };

    const mealObj = mealLabels[mealName] || mealLabels.breakfast;
    const currentMealText = mealObj[selectedLang === 'kn-IN' ? 'kn' : (selectedLang === 'hi-IN' ? 'hi' : 'en')];

    const promptText = selectedLang === 'kn-IN'
      ? `ಇಂದು ನೀವು ${currentMealText} ಸೇವಿಸಿದ್ದೀರಾ?`
      : (selectedLang === 'hi-IN'
        ? `क्या आपने आज ${currentMealText} खाया?`
        : `Did you have ${mealName} today?`);

    const options = [
      {
        label: selectedLang === 'kn-IN' ? 'ಹೌದು, ತಿಂದಿದ್ದೇನೆ' : (selectedLang === 'hi-IN' ? 'हाँ, खा लिया' : 'Yes'),
        value: 'yes',
        transcriptSuffix: `ate ${mealName} normally`,
        variant: 'teal',
      },
      {
        label: selectedLang === 'kn-IN' ? 'ಇನ್ನೂ ಇಲ್ಲ' : (selectedLang === 'hi-IN' ? 'अभी नहीं' : 'Not yet'),
        value: 'not_yet',
        variant: 'amber',
      },
      {
        label: selectedLang === 'kn-IN' ? 'ಊಟ ಬಿಟ್ಟಿದ್ದೇನೆ' : (selectedLang === 'hi-IN' ? 'छोड़ दिया' : 'Skipped it'),
        value: 'skipped',
        transcriptSuffix: `skipped ${mealName}`,
        variant: 'neutral',
      },
    ];

    return {
      id: `meal_${mealName}_${Date.now()}`,
      type: 'meal',
      mealName,
      badgeText: selectedLang === 'kn-IN' ? 'ಆಹಾರ ಪರಿಶೀಲನೆ' : (selectedLang === 'hi-IN' ? 'भोजन जांच' : 'Meal Check-in'),
      prompt: promptText,
      subPrompt: selectedLang === 'kn-IN' ? 'ನಿಮ್ಮ ಆಹಾರ ಸೇವನೆಯ ಬಗ್ಗೆ ತಿಳಿಸಿ' : 'Let us know how your meals are going',
      options,
    };
  }, [selectedLang]);

  /**
   * 3. Sleep Check-In Builder
   */
  const createSleepCheckIn = useCallback(() => {
    const promptText = selectedLang === 'kn-IN'
      ? 'ನಿನ್ನೆ ರಾತ್ರಿ ನಿಮಗೆ ನಿದ್ರೆ ಹೇಗಿತ್ತು?'
      : (selectedLang === 'hi-IN'
        ? 'कल रात आपकी नींद कैसी रही?'
        : 'How did you sleep last night?');

    const options = [
      {
        label: selectedLang === 'kn-IN' ? 'ತುಂಬಾ ಚೆನ್ನಾಗಿ ನಿದ್ರೆ ಬಂತು' : (selectedLang === 'hi-IN' ? 'बहुत अच्छी नींद आई' : 'Well'),
        value: 'well',
        transcriptSuffix: 'reported sleeping well',
        variant: 'teal',
      },
      {
        label: selectedLang === 'kn-IN' ? 'ಪರವಾಗಿಲ್ಲ / ಸಾಧಾರಣ' : (selectedLang === 'hi-IN' ? 'ठीक-ठाक रही' : 'Okay'),
        value: 'okay',
        transcriptSuffix: 'reported sleeping okay',
        variant: 'primary',
      },
      {
        label: selectedLang === 'kn-IN' ? 'ನಿದ್ರೆ ಸರಿಯಾಗಿ ಬರಲಿಲ್ಲ' : (selectedLang === 'hi-IN' ? 'नींद ठीक नहीं थी' : 'Poorly'),
        value: 'poorly',
        transcriptSuffix: 'reported sleeping poorly',
        variant: 'neutral',
      },
    ];

    return {
      id: `sleep_${Date.now()}`,
      type: 'sleep',
      badgeText: selectedLang === 'kn-IN' ? 'ನಿದ್ರೆಯ ಪರಿಶೀಲನೆ' : (selectedLang === 'hi-IN' ? 'नींद की जांच' : 'Sleep Check-in'),
      prompt: promptText,
      subPrompt: selectedLang === 'kn-IN' ? 'ಆಯ್ಕೆಯನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ ಅಥವಾ ಮಾತನಾಡಿ' : 'Tap an option or speak how you slept',
      options,
    };
  }, [selectedLang]);

  /**
   * 4. Mobility / Steadiness Check-In Builder
   */
  const createMobilityCheckIn = useCallback(() => {
    const promptText = selectedLang === 'kn-IN'
      ? 'ಇಂದು ನಡೆಯುವಾಗ ನಿಮ್ಮ ಸಮತೋಲನ ಹೇಗಿದೆ?'
      : (selectedLang === 'hi-IN'
        ? 'आज चलते समय आप कैसा महसूस कर रहे हैं?'
        : 'How steady do you feel on your feet today?');

    const options = [
      {
        label: selectedLang === 'kn-IN' ? 'ಸ್ಥಿರವಾಗಿದ್ದೇನೆ / ಕ್ಷೇಮ' : (selectedLang === 'hi-IN' ? 'बिल्कुल स्थिर' : 'Steady'),
        value: 'steady',
        transcriptSuffix: 'reported feeling steady',
        variant: 'teal',
      },
      {
        label: selectedLang === 'kn-IN' ? 'ಸ್ವಲ್ಪ ತೂರಾಟವಿದೆ' : (selectedLang === 'hi-IN' ? 'थोड़ा लड़खड़ा रहे हैं' : 'A bit wobbly'),
        value: 'a bit wobbly',
        transcriptSuffix: 'reported feeling a bit wobbly',
        variant: 'amber',
      },
      {
        label: selectedLang === 'kn-IN' ? 'ಅಸ್ಥಿರ / ನಿಲ್ಲಲು ಕಷ್ಟವಾಗುತ್ತಿದೆ' : (selectedLang === 'hi-IN' ? 'अस्थिर महसूस हो रहा है' : 'Unsteady'),
        value: 'unsteady',
        transcriptSuffix: 'reported feeling unsteady',
        variant: 'purple',
      },
    ];

    return {
      id: `mobility_${Date.now()}`,
      type: 'mobility',
      badgeText: selectedLang === 'kn-IN' ? 'ಸಮತೋಲನ ಪರಿಶೀಲನೆ' : (selectedLang === 'hi-IN' ? 'संतुलन जांच' : 'Mobility Check-in'),
      prompt: promptText,
      subPrompt: selectedLang === 'kn-IN' ? 'ನಿಮ್ಮ ನಡಿಗೆಯ ಸ್ಥಿರತೆಯನ್ನು ತಿಳಿಸಿ' : 'Tell us about your balance and movement',
      options,
    };
  }, [selectedLang]);

  // Handle Option Tap
  const handleSelectOption = useCallback((option) => {
    if (!activeCheckIn) return;

    const { type, mealName } = activeCheckIn;

    // 1. Cognitive
    if (type === 'cognitive') {
      const suffix = option.isCorrect
        ? 'answered correctly about today\'s day'
        : 'seemed unsure about today\'s date';
      onSendEvent(`${CHECK_IN_CONFIG.prefixes.cognitive}${suffix}`);
      markCompleted('cognitive');
      setActiveCheckIn(null);
      return;
    }

    // 2. Meal
    if (type === 'meal') {
      if (option.value === 'not_yet') {
        const retryCount = (mealRetriesRef.current[mealName] || 0) + 1;
        mealRetriesRef.current[mealName] = retryCount;

        if (retryCount >= 2) {
          onSendEvent(`${CHECK_IN_CONFIG.prefixes.meal}had not eaten ${mealName} after extended wait`);
          markCompleted(`meal_${mealName}`);
        } else {
          // Schedule retry in 90 minutes
          setTimeout(() => {
            enqueueCheckIn(createMealCheckIn(mealName));
          }, CHECK_IN_CONFIG.mealRetryDelayMs);
        }
      } else {
        onSendEvent(`${CHECK_IN_CONFIG.prefixes.meal}${option.transcriptSuffix}`);
        markCompleted(`meal_${mealName}`);
      }
      setActiveCheckIn(null);
      return;
    }

    // 3. Sleep
    if (type === 'sleep') {
      onSendEvent(`${CHECK_IN_CONFIG.prefixes.sleep}${option.transcriptSuffix}`);
      markCompleted('sleep');
      setActiveCheckIn(null);
      return;
    }

    // 4. Mobility
    if (type === 'mobility') {
      onSendEvent(`${CHECK_IN_CONFIG.prefixes.mobility}${option.transcriptSuffix}`);
      markCompleted('mobility');

      // If "Unsteady", offer follow-up to call family
      if (option.value === 'unsteady') {
        setFollowUpOffer({
          prompt: selectedLang === 'kn-IN'
            ? 'ನಿಮ್ಮ ಕುಟುಂಬದವರಿಗೆ ಈ ಬಗ್ಗೆ ಮಾಹಿತಿ ನೀಡಲು ಬಯಸುವಿರಾ?'
            : (selectedLang === 'hi-IN'
              ? 'क्या आप अपने परिवार को इसके बारे में सूचित करना चाहेंगे?'
              : 'Would you like to let your family know?'),
        });
        return;
      }
      setActiveCheckIn(null);
    }
  }, [activeCheckIn, onSendEvent, markCompleted, createMealCheckIn, enqueueCheckIn, selectedLang]);

  // Dismiss Check-In
  const dismissCheckIn = useCallback(() => {
    if (activeCheckIn && activeCheckIn.type === 'cognitive') {
      onSendEvent(`${CHECK_IN_CONFIG.prefixes.cognitive}seemed unsure about today's date`);
      markCompleted('cognitive');
    }
    setActiveCheckIn(null);
    setFollowUpOffer(null);
  }, [activeCheckIn, onSendEvent, markCompleted]);

  // Voice Interaction for Cognitive / Sleep
  useEffect(() => {
    if (!activeCheckIn) {
      setIsVoiceActive(false);
      setInterimVoiceText('');
      return;
    }

    // If Cognitive, speak prompt and listen
    if (activeCheckIn.type === 'cognitive' && speakThenListen) {
      setIsVoiceActive(true);
      speakThenListen(activeCheckIn.prompt, selectedLang, (transcript) => {
        setIsVoiceActive(false);
        if (!transcript) {
          onSendEvent(`${CHECK_IN_CONFIG.prefixes.cognitive}seemed unsure about today's date`);
          markCompleted('cognitive');
          setActiveCheckIn(null);
          return;
        }

        const lower = transcript.toLowerCase();
        const correct = activeCheckIn.correctDayName.toLowerCase();
        const isMatch = lower.includes(correct);

        const suffix = isMatch
          ? 'answered correctly about today\'s day'
          : 'seemed unsure about today\'s date';

        onSendEvent(`${CHECK_IN_CONFIG.prefixes.cognitive}${suffix}`);
        markCompleted('cognitive');
        setActiveCheckIn(null);
      });
    }

    // If Sleep, listen for keyword matching
    if (activeCheckIn.type === 'sleep' && listen) {
      setIsVoiceActive(true);
      listen(selectedLang, (transcript) => {
        setIsVoiceActive(false);
        if (!transcript) return;

        const lower = transcript.toLowerCase();
        let suffix = 'gave an unclear response';

        if (/good|well|great|fine|ಚೆನ್ನಾಗಿ|अच्छी/.test(lower)) {
          suffix = 'reported sleeping well';
        } else if (/okay|alright|ಸಾಧಾರಣ|ठीक/.test(lower)) {
          suffix = 'reported sleeping okay';
        } else if (/bad|poor|terrible|tired|ಕಡಿಮೆ|खराब/.test(lower)) {
          suffix = 'reported sleeping poorly';
        }

        onSendEvent(`${CHECK_IN_CONFIG.prefixes.sleep}${suffix}`);
        markCompleted('sleep');
        setActiveCheckIn(null);
      });
    }
  }, [activeCheckIn?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic Daily Time Checker (Checks every 30 seconds against schedules)
  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const { schedules } = CHECK_IN_CONFIG;

      if (timeStr === schedules.sleepCheckIn && !completedTodayRef.current.has('sleep')) {
        enqueueCheckIn(createSleepCheckIn());
      }
      if (timeStr === schedules.breakfastCheckIn && !completedTodayRef.current.has('meal_breakfast')) {
        enqueueCheckIn(createMealCheckIn('breakfast'));
      }
      if (timeStr === schedules.cognitiveCheckIn && !completedTodayRef.current.has('cognitive')) {
        enqueueCheckIn(createCognitiveCheckIn());
      }
      if (timeStr === schedules.lunchCheckIn && !completedTodayRef.current.has('meal_lunch')) {
        enqueueCheckIn(createMealCheckIn('lunch'));
      }
      if (timeStr === schedules.mobilityCheckIn && !completedTodayRef.current.has('mobility')) {
        enqueueCheckIn(createMobilityCheckIn());
      }
      if (timeStr === schedules.dinnerCheckIn && !completedTodayRef.current.has('meal_dinner')) {
        enqueueCheckIn(createMealCheckIn('dinner'));
      }
    };

    const interval = setInterval(checkSchedule, 30000);
    return () => clearInterval(interval);
  }, [enqueueCheckIn, createSleepCheckIn, createMealCheckIn, createCognitiveCheckIn, createMobilityCheckIn]);

  // Manual Trigger Functions (Exposed for Testing and On-Demand Mobility Check)
  const triggerCognitive = useCallback(() => {
    enqueueCheckIn(createCognitiveCheckIn());
  }, [enqueueCheckIn, createCognitiveCheckIn]);

  const triggerMeal = useCallback((meal = 'breakfast') => {
    enqueueCheckIn(createMealCheckIn(meal));
  }, [enqueueCheckIn, createMealCheckIn]);

  const triggerSleep = useCallback(() => {
    enqueueCheckIn(createSleepCheckIn());
  }, [enqueueCheckIn, createSleepCheckIn]);

  const triggerMobility = useCallback(() => {
    enqueueCheckIn(createMobilityCheckIn());
  }, [enqueueCheckIn, createMobilityCheckIn]);

  return {
    activeCheckIn,
    followUpOffer,
    isVoiceActive,
    interimVoiceText,
    handleSelectOption,
    dismissCheckIn,
    triggerCognitive,
    triggerMeal,
    triggerSleep,
    triggerMobility,
  };
}
