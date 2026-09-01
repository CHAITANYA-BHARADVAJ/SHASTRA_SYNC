# Shastra Sync - Core API (Teammate 1: The Hub)

The FastAPI server + database that routes all data between modules and
broadcasts alerts over WebSockets.

## Files
- `schemas.py` — Pydantic models for the Universal JSON Contracts (A, B, C)
- `database.py` — SQLAlchemy engine + `events` and `decisions` tables
- `ws_manager.py` — WebSocket connection manager (broadcast to all clients)
- `main.py` — FastAPI app: endpoints + WebSocket

## Setup

```powershell
# 1. Create and activate a virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Install dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic websockets python-dotenv
# (or: pip install -r requirements.txt)
```

## Database

Uses PostgreSQL by default. Create the database once:

```sql
CREATE DATABASE shastra_sync;
```

Then copy `.env.example` to `.env` and set your `DATABASE_URL`.

**No PostgreSQL handy?** For the hackathon you can run with zero setup using
SQLite by setting `USE_SQLITE=1`:

```powershell
$env:USE_SQLITE = "1"
```

Tables are created automatically on startup.

## Run

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- API base: `http://localhost:8000`
- Interactive docs: `http://localhost:8000/docs`
- WebSocket: `ws://localhost:8000/ws/alerts`

> Note for the Flutter Android emulator (Teammate 3): use `10.0.2.2` instead of
> `localhost` to reach this server.

## Endpoints

| Method | Path                  | Purpose                                                        |
|--------|-----------------------|----------------------------------------------------------------|
| POST   | `/api/events`         | Save a `SensorEvent` (Schema A)                                |
| GET    | `/api/events/pending` | List `SensorEvent`s with no decision yet (Agent polls this)    |
| POST   | `/api/decisions`      | Save an `AgentDecision`; broadcast decision + `FamilyAlert`    |
| WS     | `/ws/alerts`          | Live channel; receives `AgentDecision` and `FamilyAlert` JSON  |

Clients filter incoming WebSocket messages using the `type` field.

## Quick test

```powershell
# Post an event
curl -X POST http://localhost:8000/api/events -H "Content-Type: application/json" -d '{\"elder_id\":\"kamala\",\"event_type\":\"fall\",\"confidence\":0.95}'

# Check pending
curl http://localhost:8000/api/events/pending
```
