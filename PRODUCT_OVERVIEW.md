# SHASTRA SYNC - Product Overview & Workflow

**Welcome to Shastra Sync.** 
This document is for the entire team to understand exactly *what* we are building. Before you start coding your specific module, read this so you understand how your piece fits into the grand vision.

---

## 1. The Vision
Shastra Sync is not just a fall detector; it is an **Empathetic AI-Driven Elder Care System**. 
Traditional medical alerts require an elder to press a button when they are in distress. Our system uses advanced Computer Vision and Agentic AI to proactively detect falls, recognize emotional distress, and act as a comforting, multi-lingual companion until family can intervene.

## 2. Core Features
1.  **Computer Vision Fall Detection:** Uses a webcam (MediaPipe) to track skeletal posture. If the elder's spine goes horizontal rapidly, a fall is instantly registered.
2.  **Emotion Recognition:** Uses facial analysis (`deepface`) to detect if the elder is feeling "sad" or "fearful", allowing the AI to respond to their emotional state, not just physical emergencies.
3.  **Empathetic AI Reasoning:** Powered by LangGraph and GPT-4o. The AI doesn't just send cold alerts; it acts as a comforting companion.
4.  **Multi-Lingual Voice Interface:** The tablet speaks to the elder in their native language (e.g., Hindi) using Text-to-Speech, and listens to their replies using Speech-to-Text.
5.  **Real-Time Family Dashboard:** A live Next.js web portal where remote family members instantly see alerts, emotional status, and the AI's exact reasoning process.

---

## 3. The End-to-End Workflow (How it works in practice)

Imagine an elder named Kamala is alone in her living room.

1.  **The Trigger (Teammate 5 - The Eyes):** 
    Kamala slips and falls. The laptop camera in the corner (running our Python OpenCV script) tracks her skeletal pose dropping. At the same time, it detects she looks "fearful". It instantly sends a JSON payload to our Core API saying: *"Fall detected, emotion: fear"*.
2.  **The Hub (Teammate 1 - The API):** 
    The Core API receives this event, logs it in the PostgreSQL database securely, and puts it in a queue for the AI to review.
3.  **The Brain (Teammate 2 - The AI):** 
    Our LangGraph AI agent spots the pending event. It analyzes the data: *"A fall occurred and the patient is scared."* It decides this is a high-severity event. It generates a deeply comforting message in Hindi: *"Kamala, I noticed you fell. Help is on the way, please stay calm."* It sends this decision back to the Hub.
4.  **The Broadcast (Teammate 1 - The Hub):** 
    The Hub receives the AI's decision and instantly blasts it out over WebSockets to every connected app in the world.
5.  **The Edge Device (Teammate 3 - The Tablet):** 
    The tablet in Kamala's room receives the WebSocket payload. The screen flashes yellow, and it speaks the Hindi message out loud using Text-to-Speech. The microphone immediately turns on. Kamala says, *"I'm okay, I just dropped my glasses."* The tablet transcribes this and sends it back to the Hub.
6.  **The Observer (Teammate 4 - Family Dashboard):** 
    Simultaneously, Priya (Kamala's daughter) is at work. Her Next.js dashboard flashes red with a massive notification: *"Kamala may have fallen."* Below it, she can read the AI's exact reasoning. Seconds later, the dashboard updates with Kamala's transcribed voice response: *"I'm okay, I just dropped my glasses."* Priya breathes a sigh of relief.

---

## 4. Your Role in the Symphony

To build this in a weekend, we have divided the product into 5 strictly isolated modules. You will build your module using an AI IDE (like Kiro), and it will automatically snap into the rest of the system using our JSON contracts.

*   **Teammate 1 (The Hub):** You build the FastAPI server and Database. You are the router.
*   **Teammate 2 (The Brain):** You build the LLM Agent. You are the empathy and logic.
*   **Teammate 3 (The Edge):** You build the Flutter App. You are the voice and the ears.
*   **Teammate 4 (The Observer):** You build the Next.js Dashboard. You are the peace of mind.
*   **Teammate 5 (The Eyes):** You build the Python OpenCV script. You are the vision.

**Next Steps:** Read the `TEAM_GUIDE.md` for instructions on how to prompt your AI IDE, then open `AI_DEVELOPMENT_MASTER_FILE.md` (The God Document) and begin building your module!
