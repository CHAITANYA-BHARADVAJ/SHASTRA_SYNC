"""
Shastra Sync - Core API (Teammate 1: The Hub)

The grand central dispatcher. It does not "think" — it routes data perfectly
and keeps a permanent log of everything.

Flow:
  1. Teammate 5 (Simulator/Vision) POSTs a SensorEvent  -> saved to `events`.
  2. Teammate 2 (Agent) polls GET /api/events/pending    -> gets unprocessed events.
  3. Teammate 2 POSTs an AgentDecision                    -> saved to `decisions`,
     event marked processed, and BOTH the AgentDecision and a derived
     FamilyAlert are broadcast over the WebSocket.
  4. Connected clients (Next.js dashboard, Flutter tablet) filter on `type`.

Run locally:
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import DecisionModel, EventModel, get_db, init_db
from schemas import (
    AgentDecision,
    FamilyAlert,
    PendingEventsResponse,
    SensorEvent,
)
from ws_manager import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: make sure the tables exist.
    init_db()
    yield
    # Shutdown: nothing to clean up for the MVP.


app = FastAPI(
    title="Shastra Sync - Core API",
    description="The Hub: routes SensorEvents and AgentDecisions, broadcasts alerts.",
    version="1.0.0",
    lifespan=lifespan,
)

# CRITICAL: allow all origins so the Next.js frontend is not blocked by CORS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------- #
# Health / root
# --------------------------------------------------------------------------- #
@app.get("/")
def root():
    return {
        "service": "Shastra Sync Core API",
        "status": "online",
        "connected_clients": manager.count,
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


# --------------------------------------------------------------------------- #
# POST /api/events  -> save a SensorEvent (Schema A)
# --------------------------------------------------------------------------- #
@app.post("/api/events", response_model=SensorEvent, status_code=201)
def create_event(event: SensorEvent, db: Session = Depends(get_db)):
    """Receive a SensorEvent from the Simulator / Vision / Elder App and log it."""
    existing = db.get(EventModel, event.event_id)
    if existing:
        raise HTTPException(status_code=409, detail="event_id already exists")

    row = EventModel(
        event_id=event.event_id,
        elder_id=event.elder_id,
        event_type=event.event_type,
        confidence=event.confidence,
        voice_transcript=event.voice_transcript,
        emotion=event.emotion,
        timestamp=event.timestamp,
        processed=False,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return event


# --------------------------------------------------------------------------- #
# GET /api/events/pending  -> events with no matching decision yet
# --------------------------------------------------------------------------- #
@app.get("/api/events/pending", response_model=PendingEventsResponse)
def get_pending_events(db: Session = Depends(get_db)):
    """Return SensorEvents that have not been processed by the Agent yet.

    The Agent (Teammate 2) polls this every ~2 seconds.
    """
    rows = (
        db.query(EventModel)
        .filter(EventModel.processed.is_(False))
        .order_by(EventModel.created_at.asc())
        .all()
    )
    events = [
        SensorEvent(
            event_id=r.event_id,
            elder_id=r.elder_id,
            event_type=r.event_type,
            confidence=r.confidence,
            voice_transcript=r.voice_transcript,
            emotion=r.emotion,
            timestamp=r.timestamp,
        )
        for r in rows
    ]
    return PendingEventsResponse(events=events)


# --------------------------------------------------------------------------- #
# POST /api/decisions  -> save AgentDecision, broadcast decision + family alert
# --------------------------------------------------------------------------- #
@app.post("/api/decisions", response_model=AgentDecision, status_code=201)
async def create_decision(decision: AgentDecision, db: Session = Depends(get_db)):
    """Receive an AgentDecision from the Agent, persist it, mark the source
    event as processed, then broadcast BOTH the decision and a derived
    FamilyAlert to every connected WebSocket client."""

    # Save the decision.
    row = DecisionModel(
        decision_id=decision.decision_id,
        event_id=decision.event_id,
        severity=decision.severity,
        action=decision.action,
        reasoning_trace=decision.reasoning_trace,
        voice_message_to_elder=decision.voice_message_to_elder,
        language_code=decision.language_code,
        family_message=decision.family_message,
    )
    db.add(row)

    # Mark the originating event as processed so it stops appearing in /pending.
    event_row = db.get(EventModel, decision.event_id)
    if event_row:
        event_row.processed = True

    db.commit()

    # Build the FamilyAlert (Schema C) from the decision.
    family_alert = FamilyAlert(
        decision_id=decision.decision_id,
        message=decision.family_message or decision.reasoning_trace,
        severity=decision.severity,
        reasoning_trace=decision.reasoning_trace,
    )

    # Broadcast BOTH payloads. Clients filter on the `type` field:
    #   - Flutter tablet  reads AgentDecision (voice_message_to_elder, action)
    #   - Next.js dashboard reads FamilyAlert (message, reasoning_trace)
    await manager.broadcast(decision.model_dump())
    await manager.broadcast(family_alert.model_dump())

    return decision


# --------------------------------------------------------------------------- #
# WebSocket /ws/alerts  -> live channel for tablet + dashboard
# --------------------------------------------------------------------------- #
@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # We don't expect meaningful inbound messages, but we must keep the
        # socket alive by awaiting receives. This also detects disconnects.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)
