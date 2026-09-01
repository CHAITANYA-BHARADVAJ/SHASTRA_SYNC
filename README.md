# Shastra Sync

**Empathetic AI-Driven Elder Care System**

Shastra Sync is a proactive, privacy-first elder care system. Unlike traditional medical alerts that require a button press, Shastra Sync uses advanced Computer Vision to proactively detect falls and emotional distress, and Agentic AI to act as a comforting, multi-lingual companion while instantly notifying family members.

## 🌟 The Vision

Traditional medical alerts are reactive. Shastra Sync is proactive and empathetic. 
By combining real-time skeletal tracking, facial emotion recognition, and Large Language Models, the system can:
1. **Detect** falls and distress instantly without manual intervention.
2. **Respond** empathetically in the user's native language.
3. **Notify** family members with actionable insights and the AI's exact reasoning process.

## 🏗️ Architecture & Modules

The system is built as a microservices architecture, divided into 5 strictly isolated modules that communicate via standardized JSON contracts.

### 1. The Hub (Core API & Infrastructure)
- **Role:** The central router and database.
- **Tech Stack:** FastAPI, PostgreSQL, Redis, WebSockets.
- **Function:** Receives sensor events, stores data, and broadcasts AI decisions to all connected edge devices and dashboards in real-time.

### 2. The Brain (Agent Reasoning Engine)
- **Role:** The empathy and logic center.
- **Tech Stack:** Python, LangGraph, Groq-API.
- **Function:** Analyzes sensor events (e.g., fall + fear), decides the severity and action plan, and generates deeply comforting messages in the elder's native language.

### 3. The Edge (Elder App)
- **Role:** The voice and ears in the elder's room.
- **Tech Stack:** PWA, TTS (Text-to-Speech), STT (Speech-to-Text).
- **Function:** A simple, high-contrast tablet interface. Speaks AI-generated comfort messages aloud and transcribes the elder's spoken responses back to the Hub.

### 4. The Observer (Family Dashboard)
- **Role:** Peace of mind for remote family members.
- **Tech Stack:** Next.js, Tailwind CSS, React, WebSockets.
- **Function:** A real-time web portal that flashes alerts, displays the AI's reasoning, and shows the elder's live transcribed responses.

### 5. The Eyes (Video Perception Node)
- **Role:** The vision system.
- **Tech Stack:** Python, OpenCV, MediaPipe, DeepFace.
- **Function:** Runs locally on a device (e.g., laptop camera) to track skeletal posture for fall detection and facial expressions for emotion recognition.
