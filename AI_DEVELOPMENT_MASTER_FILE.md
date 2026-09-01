# SHASTRA SYNC - The "God Document" (Master AI Context)

> **CRITICAL INSTRUCTIONS FOR THE AI ASSISTANT (CURSOR / COPILOT / CLAUDE):**
> You are building a complex, life-saving system for a team of students. They understand the concepts but are relying on YOU to write the actual code. 
> 
> **Your Rules:**
> 1. **No placeholders.** Write the complete, functional code. Implement the business logic exactly as described in the "Logic Story" sections below.
> 2. **Exact commands.** Provide the exact terminal commands to run (e.g., `pip install fastapi`).
> 3. **Stay in your lane.** Your human will tell you they are "Teammate X". Only build the code for Teammate X's module. Assume the other modules exist perfectly and communicate via the JSON schemas below.

---

## 0. The Universal JSON Contracts (DO NOT MODIFY)
All communication between modules happens via these JSON payloads. 
**CRITICAL:** Do NOT hardcode `localhost:8000`. You must use environment variables (e.g., `API_URL` or `NEXT_PUBLIC_API_URL`) so the app can be deployed live. Default local values are HTTP (`http://localhost:8000`) and WebSockets (`ws://localhost:8000/ws`).

### Schema A: `SensorEvent` (Simulator ➔ Core API)
```json
{
  "type": "SensorEvent",
  "event_id": "uuid",
  "elder_id": "string",
  "event_type": "fall | inactivity | medication_missed | manual_panic | voice_input | emotion_detected | normal",
  "confidence": 0.95,
  "voice_transcript": "string or null (e.g., 'Mujhe madad chahiye')",
  "emotion": "sad | fear | happy | neutral | null",
  "timestamp": "ISO8601"
}
```

### Schema B: `AgentDecision` (Agent ➔ Core API)
```json
{
  "type": "AgentDecision",
  "decision_id": "uuid",
  "event_id": "uuid",
  "severity": "low | medium | high | critical",
  "action": "monitor | voice_check | notify_family | call_emergency",
  "reasoning_trace": "Elder has fallen and not moved for 30 seconds.",
  "voice_message_to_elder": "क्या आप ठीक हैं? (Are you okay?)",
  "language_code": "hi-IN",
  "family_message": "Kamala may have fallen. Awaiting her response."
}
```

### Schema C: `FamilyAlert` (Core API ➔ Family Dashboard via WebSocket)
```json
{
  "type": "FamilyAlert",
  "alert_id": "uuid",
  "decision_id": "uuid",
  "message": "Kamala may have fallen. Awaiting her response.",
  "severity": "critical",
  "reasoning_trace": "Elder has fallen and not moved for 30 seconds.",
  "timestamp": "ISO8601"
}
```

---

## 1. Teammate 1: Infrastructure & Core API (The Hub)
**User Prompt to AI:** *"I am Teammate 1. Read the God Document and build my entire module from scratch."*

**The Logic Story (How this module works):**
Imagine you are a grand central station dispatcher. Your job is not to think, but to route trains (data) perfectly and keep a log of everything. 
First, you set up the database (PostgreSQL with SQLAlchemy). You create two tables: `events` and `decisions`. 
Suddenly, a `POST /api/events` request arrives from Teammate 5's Simulator containing a `SensorEvent`. You instantly save it to the `events` database. But you don't stop there. You need the AI Brain (Teammate 2) to analyze it. In this MVP, we assume the Agent is polling or we call it directly, but to keep it simple, the Agent will poll `GET /api/events/pending`.
Seconds later, a `POST /api/decisions` arrives from the Agent containing an `AgentDecision`. You save it to the `decisions` database. Now, you must warn the family and the elder. You take this `AgentDecision` and instantly broadcast it through your `WebSocket /ws/alerts` to every connected client (Next.js and Flutter). 

**AI Technical Implementation Checklist:**
*   **Init:** Tell user to run `pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic websockets`. **CRITICAL:** You must configure `CORSMiddleware` allowing `*` origins, otherwise the Next.js frontend will be blocked by CORS errors.
*   **Database:** Create `database.py` with SQLAlchemy models matching Schema A and B. 
*   **API:** Create `main.py` with FastAPI. 
    *   `POST /api/events`: Saves to DB.
    *   `GET /api/events/pending`: Returns a list of `SensorEvent` (Schema A) JSONs that don't have a matching decision yet.
    *   `POST /api/decisions`: Saves to DB. Then, construct a `FamilyAlert` (Schema C) using the `family_message` provided by the Agent. Finally, call the WebSocket manager to broadcast BOTH the `AgentDecision` (for the tablet) and the `FamilyAlert` (for the dashboard) to all connected clients. Clients will use the `type` field to ignore messages not meant for them.
    *   `WebSocket /ws/alerts`: Manages active connections and broadcasts the JSONs.

---

## 2. Teammate 2: Agent Reasoning Engine (The LLM Brain)
**User Prompt to AI:** *"I am Teammate 2. Read the God Document and build my entire module from scratch."*

**The Logic Story (How this module works):**
You are a highly intelligent, *deeply empathetic* elder-care assistant. You run as a continuous background loop script. 
Every 2 seconds, you ask the Hub (Teammate 1): *"Are there any pending events?"* (`GET http://localhost:8000/api/events/pending`). 
Ah! You receive a `SensorEvent`. It might be a physical fall, or it might be an `emotion_detected` event showing the elder is "sad". You immediately construct a prompt for OpenAI's `gpt-4o`. You tell the LLM: *"An elder just triggered an event. Here is their emotional state and voice transcript. Act as a comforting companion. Decide what to do."* 
Because you are an AI, you use Pydantic Structured Outputs to force GPT-4 to reply *exactly* matching the `AgentDecision` JSON. 
The LLM decides this is "medium" severity, the action is "voice_check", and writes an empathetic reasoning trace. You take this perfect JSON and fire it back to the Hub.

**AI Technical Implementation Checklist:**
*   **Init:** Tell user to run `pip install openai pydantic requests`.
*   **Loop:** Write `agent.py` containing a `while True` loop with a `time.sleep(2)`.
*   **LLM Call:** Use the official `openai` Python SDK. Use `response_format` with the Pydantic model for `AgentDecision` (Schema B) to guarantee structured JSON output.
*   **Business Rules (Bake this into the system prompt):**
    *   If `event_type == "fall"`, action MUST be `voice_check` first, severity `high`.
    *   If `event_type == "voice_input"`, analyze the `voice_transcript`. GPT-4 will naturally understand any language (Hindi, Tamil, English). Reply in the SAME language. Set the `language_code` appropriately (e.g., "hi-IN") so the Flutter TTS uses the correct accent.
    *   If `event_type == "manual_panic"`, action is `call_emergency`, severity `critical`.

---

## 3. Teammate 3: Elder App (The Edge Device)
**User Prompt to AI:** *"I am Teammate 3. Read the God Document and build my entire module from scratch."*

**The Logic Story (How this module works):**
You are a tablet sitting on a counter in the elder's home. You are their lifeline. Your UI is extremely simple: massive text, high contrast, black and white. In the center of the screen is a giant red "I NEED HELP" button. 
In the background, you maintain a persistent WebSocket connection to the Hub (`ws://localhost:8000/ws/alerts`). You sit quietly.
Suddenly, a WebSocket payload arrives. It's an `AgentDecision` (Schema B). You parse the JSON. You notice the `voice_message_to_elder` field is NOT null. 
Instantly, your screen flashes yellow to get their attention. You set the device's Text-to-Speech engine (`flutter_tts`) to the `language_code` provided (e.g., "hi-IN"), and you speak the message out loud into the room in their native tongue. 
Then, you turn on the microphone (`speech_to_text`). The elder says "Mujhe madad chahiye" (I need help). You transcribe this speech to text, construct a `SensorEvent` (Schema A) with `event_type: "voice_input"` and `voice_transcript: "Mujhe madad chahiye"`, and `POST` it back to the Hub. The AI Brain will receive this and decide what to do next.

**AI Technical Implementation Checklist:** (Note: If testing on an Android Emulator, `localhost` will point to the phone itself. You MUST use `10.0.2.2` instead of `localhost` to hit the PC's server).
*   **Init:** Tell user to run `flutter create elder_app` and `flutter pub add flutter_tts speech_to_text web_socket_channel http`.
*   **UI:** Build `main.dart`. Use massive fonts. Create a giant SOS button that POSTs a `manual_panic` event. Add a microphone icon that shows when listening.
*   **Logic:** Connect to the WebSocket. When `action == "voice_check"`, set `flutter_tts.setLanguage(language_code)`, trigger `speak()`, and immediately start `speech_to_text.listen()`. When the elder stops speaking, POST the transcript to the API.

---

## 4. Teammate 4: Family Dashboard (The Observer)
**User Prompt to AI:** *"I am Teammate 4. Read the God Document and build my entire module from scratch."*

**The Logic Story (How this module works):**
You are the peace-of-mind dashboard for the elder's daughter, Priya, who is sitting at her office desk. You are a sleek, modern Next.js web app. 
When Priya opens the app, you connect to the Hub's WebSocket (`ws://localhost:8000/ws/alerts`). You show a calming green status: "Kamala is safe."
Suddenly, a WebSocket payload hits. The JSON shows `severity: "critical"`. 
You do not stay calm. You immediately trigger a loud browser chime. A massive red toast notification slides onto the screen. The borders of the dashboard pulse red. 
Priya needs to know *why* this is happening, so you render the `reasoning_trace` from the JSON right in the center of the screen: *"Elder has fallen and not moved for 30 seconds."*
Priya clicks a button that says "Acknowledge - I am calling her." You don't need to do complex backend logic; you just let Priya see the truth in real-time.

**AI Technical Implementation Checklist:**
*   **Init:** Tell user to run `npx create-next-app@latest family-dashboard` (App router, Tailwind). `npm install lucide-react` (Use native browser WebSocket, DO NOT use socket.io as the backend uses raw FastAPI WebSockets).
*   **UI:** Use Tailwind for aggressive styling on critical alerts (e.g., `animate-pulse border-red-500`). 
*   **State:** Use a simple React `useState` array to store incoming alerts. Unshift new alerts to the top of the list. Display the `reasoning_trace` prominently.

---

## 5. Teammate 5: Video Perception Node (The Eyes)
**User Prompt to AI:** *"I am Teammate 5. Read the God Document and build my entire module from scratch."*

**The Logic Story (How this module works):**
You are the eyes of the system. You are going to build a fully functional Computer Vision script that watches a webcam stream. 
You have two jobs: Fall Detection and Emotion Detection.
1. You will use Google's `MediaPipe` to track the elder's skeletal pose. If the spine goes horizontal rapidly, you detect a "Fall". 
2. You will use the `deepface` library to analyze the elder's facial expressions in real-time. If the dominant emotion is "sad" or "fear" for a sustained period, you detect emotional distress.
The absolute moment you detect either of these, you instantly construct a `SensorEvent` JSON payload (Schema A) with the correct `event_type` and `emotion` field, and `POST` it to the Hub at `http://localhost:8000/api/events`. 
Because you use the exact JSON contract, the AI Brain will immediately reach out to comfort them.

**AI Technical Implementation Checklist:**
*   **Init:** Tell user to run `pip install opencv-python mediapipe deepface requests numpy tf-keras`.
*   **Vision Logic:** Write a Python script (`vision.py`) that opens `cv2.VideoCapture(0)`. Use `mediapipe` for poses, and `DeepFace.analyze(frame, actions=['emotion'])` every 30 frames to save CPU.
*   **Fall Math:** If the y-coordinates of the shoulders drop rapidly relative to the hips/ankles, trigger a fall event.
*   **Emotion Logic:** If `deepface` returns "sad" or "fear", trigger an `emotion_detected` event.
*   **Network Logic:** When a fall is detected, use the `requests` library to `POST` the JSON to the API. Add a 10-second cooldown so you don't spam the API with 30 requests per second while they are on the floor.
