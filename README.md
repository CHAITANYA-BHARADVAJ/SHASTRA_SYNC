# SHASTRA SYNC — Elder App (React PWA)

**Teammate 3 Module** — The tablet interface that sits in an elderly person's home.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in **Google Chrome** or **Microsoft Edge**.

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Hub API base URL | `https://3.110.50.100.nip.io` |
| `VITE_WS_URL` | Hub WebSocket URL | `wss://3.110.50.100.nip.io/ws/alerts` |
| `VITE_ELDER_ID` | Elder identifier | `elder_kamala_001` |

**Never hardcode URLs in source code.** All network calls read from these env vars via `import.meta.env`.

## HTTPS Requirement for Microphone Access

> **Critical for Production Deployment**

The Web Speech API (`SpeechRecognition`) and microphone access (`navigator.mediaDevices.getUserMedia`) require a **secure context** to function:

- **`localhost`** — automatically treated as secure in all browsers. Works in development.
- **`https://`** — required for any deployed/production URL. Render, Vercel, Netlify, etc. provide HTTPS by default.
- **`http://` on a non-localhost domain** — **microphone will not work**. The browser will silently deny access or the Speech API will throw a `not-allowed` error.

If microphone access fails, the app displays a clear on-screen message explaining the issue rather than silently breaking.

## Browser Compatibility

| Browser | STT (Speech-to-Text) | TTS (Text-to-Speech) | Notes |
|---------|----------------------|----------------------|-------|
| **Chrome** | ✅ | ✅ | Fully supported. Recommended. |
| **Edge** | ✅ | ✅ | Fully supported. |
| **Brave** | ❌ | ✅ | Blocks Google Speech Recognition server by default. |
| **Firefox** | ❌ | ✅ | No `SpeechRecognition` API support. |
| **Safari** | ⚠️ | ✅ | Partial support. May not work reliably. |

If the browser doesn't support `SpeechRecognition`, the app shows a visible message directing the user to Chrome/Edge. Quick-phrase buttons remain functional as a fallback.

## Architecture

```
src/
├── api/api.js                  # POST helper for SensorEvent (Schema A)
├── hooks/
│   ├── useWebSocket.js         # Persistent WS with auto-reconnect
│   └── useVoiceHandler.js      # Native browser STT/TTS (no libraries)
├── components/
│   ├── ElderScreen.jsx         # Main UI — 4 states + SOS
│   ├── ElderScreen.css         # Accessible elderly-first CSS
│   ├── ConnectionBanner.jsx    # WS status indicator
│   └── ConnectionBanner.css
├── App.jsx                     # App shell
├── index.css                   # Design system tokens
└── main.jsx                    # React entry point
```

## JSON Contracts

This app sends **SensorEvent** (Schema A) and receives **AgentDecision** (Schema B) as defined in `AI_DEVELOPMENT_MASTER_FILE.md`. No modifications to the contract schemas.

## Zero Third-Party Speech Libraries

All voice functionality uses **native browser APIs only**:
- `window.SpeechRecognition || window.webkitSpeechRecognition` for speech-to-text
- `window.speechSynthesis` + `SpeechSynthesisUtterance` for text-to-speech

No API keys, no npm speech packages, no abstraction layers that could hide bugs.
