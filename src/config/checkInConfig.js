/**
 * Configurable Check-In Schedule & Question Settings
 * Adjust times per elder without touching component logic.
 */

export const CHECK_IN_CONFIG = {
  // Times of day (24-hour HH:MM format)
  schedules: {
    sleepCheckIn: '08:00',       // Morning sleep quality
    breakfastCheckIn: '09:30',   // Breakfast
    cognitiveCheckIn: '10:30',   // Mid-morning orientation
    lunchCheckIn: '13:30',       // Lunch
    mobilityCheckIn: '15:00',    // Afternoon steadiness
    dinnerCheckIn: '19:30',      // Dinner
  },

  // Meal retry delay in milliseconds (90 minutes default)
  mealRetryDelayMs: 90 * 60 * 1000,

  // Transcript Tagging Prefixes (EXACT MATCH FOR DOWNSTREAM LLM)
  prefixes: {
    cognitive: 'Cognitive check-in: ',
    meal: 'Meal check-in: ',
    sleep: 'Sleep check-in: ',
    mobility: 'Mobility check-in: ',
  },
};
