# Video Perception Node (Teammate 5) - "The Eyes"

Part of the **SHASTRA SYNC** elder-care system. Watches a webcam, detects
**falls** (MediaPipe pose) and **emotional distress** (DeepFace), and POSTs a
`SensorEvent` (Schema A) to the Core API Hub.

**Status: built, tested, and integrated with the live hosted Hub.**

## Where this sits in the system

```
[Webcam] -> this node --SensorEvent--> [Hub: T1] -> [Agent: T2]
                                                        |
                                        [Elder Tablet: T3]  [Family Dash: T4]
```

This node is a pure producer. It only ever POSTs to `/api/events`. It never
reads from other modules and never touches the WebSocket or decisions API.

## Three ways to run it

### 1. Demo web app (recommended for presenting)

```powershell
.\run.ps1
```

Opens a browser dashboard at `http://127.0.0.1:5000` with the live camera and
skeleton overlay, real-time readouts, manual trigger buttons, threshold
sliders, and the raw JSON being sent to the Hub.

### 2. Packaged desktop app

A standalone build exists at:

```
C:\ShastraBuild\dist\ShastraVision\ShastraVision.exe
```

Double-click it. No Python needed. Startup takes 30-60s while the models
load, then the browser opens automatically. Copy the whole `ShastraVision`
folder if moving it, not just the .exe.

Rebuild with:

```powershell
.venv\Scripts\python.exe -m PyInstaller ShastraVision.spec --noconfirm `
    --distpath C:\ShastraBuild\dist --workpath C:\ShastraBuild\build
```

> Build outside OneDrive. Sync locks on the output folder break the build.

### 3. Plain OpenCV window (the God Document baseline)

```powershell
.\run.ps1 vision            # press q to quit
```

Also supports `--headless` and `--duration N` for unattended runs.

## Configuration

All settings live in `.env` (see `.env.example`). Real environment variables
override it. Nothing is hardcoded.

```
API_URL=https://shastra-sync.onrender.com   # Teammate 1s Hub
ELDER_ID=elder_001
CAMERA_INDEX=0
```

For the packaged app, edit `_internal\.env` inside the bundle - no rebuild
needed.

## Detection logic

**Fall** fires only when *both* hold, so lying down in bed is not an alarm:

- torso angle from vertical >= `FALL_TORSO_ANGLE_DEG` (default 55 deg)
- shoulders dropped faster than `FALL_DROP_VELOCITY` (default 0.35/sec)

**Emotion** runs DeepFace every `EMOTION_ANALYZE_EVERY_N_FRAMES` frames
(default 30) to save CPU. Fires only if `sad`/`fear` persists for
`EMOTION_SUSTAINED_SECONDS` (default 4s), so one unlucky frame is ignored.

**Cooldown** suppresses repeat events of the same type for
`EVENT_COOLDOWN_SECONDS` (default 10s) so the Hub is never spammed ~30x/sec.
Each type has an independent cooldown. On delivery failure the cooldown is
rolled back so a genuine emergency is retried, not silently dropped.

**Delivery** happens on a background thread with retry and exponential
backoff. A cold-starting host (50s+) will not stall the camera loop or lose
the event.

## Tests

```powershell
.\run.ps1 verify     # dependencies + webcam check
.\run.ps1 test       # 41 unit tests, no camera or Hub needed
.\run.ps1 live       # integration test against the real Hub
.\run.ps1 events     # list what is currently in the Hub
```

## Files

| File | Purpose |
|------|---------|
| `vision.py` | Plain OpenCV entry point (God Document baseline) |
| `app.py` | Flask demo web app |
| `camera_worker.py` | Background capture + detection thread |
| `templates/index.html` | Demo dashboard UI |
| `ShastraVision.py` | Desktop launcher / PyInstaller entry point |
| `fall_detector.py` | MediaPipe pose fall detection |
| `emotion_detector.py` | DeepFace emotion / distress detection |
| `hub_client.py` | Event delivery: cooldown, retry, non-blocking |
| `schema.py` | Schema A `SensorEvent` builder (the contract) |
| `config.py` | Env/.env driven configuration |
| `console.py` | Windows UTF-8 console fix (DeepFace logs emoji) |
| `verify_install.py` | Dependency + webcam verification |
| `test_logic.py` | Unit tests: schema, fall math, timers, cooldown, retry |
| `test_live_hub.py` | Live integration test against the real Hub |
| `show_events.py` | Inspect events sitting in the Hub |
| `mock_hub.py` | Local stand-in Hub for offline demos |

## Environment gotchas

- **Python 3.10-3.12 required** (verified on 3.12.10). mediapipe and
  tensorflow publish no wheels for 3.13/3.14.
- **mediapipe >= 0.10.30 removed the legacy `mp.solutions` API.** Pinned to
  `0.10.21`.
- **protobuf conflict:** mediapipe 0.10.21 needs <5, TensorFlow >=2.19 needs
  >=6. Pinned to TensorFlow 2.18 + protobuf 4.25.9 to satisfy both.
- **keras** >3.6 needs a newer `ml_dtypes` than TF 2.18 pins, so held at 3.6.0.
- **matplotlib cannot be excluded** from the PyInstaller build: mediapipe
  imports pyplot. The launcher forces `MPLBACKEND=Agg` instead.
- **DeepFace weights** (~6 MB) download to `~\.deepface\weights` on first use.
