"""
Database layer for the Hub (Teammate 1).

Uses SQLAlchemy with PostgreSQL. The connection string is read from the
`DATABASE_URL` environment variable so the app can be deployed live.

Two tables:
  - events     -> mirrors Schema A (SensorEvent)
  - decisions  -> mirrors Schema B (AgentDecision)
"""
from __future__ import annotations

import os
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import declarative_base, sessionmaker

# --------------------------------------------------------------------------- #
# Engine / Session configuration
# --------------------------------------------------------------------------- #
# Default to a local PostgreSQL instance. Override with DATABASE_URL in prod.
# Example: postgresql+psycopg2://user:password@localhost:5432/shastra
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/shastra_sync",
)

# For local hackathon fallback, allow SQLite if the user has no PostgreSQL.
# Set USE_SQLITE=1 to use a local file DB instead (no extra services needed).
if os.getenv("USE_SQLITE") == "1":
    DATABASE_URL = "sqlite:///./shastra_sync.db"

# SQLite needs a special connect arg for multi-threaded FastAPI access.
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# --------------------------------------------------------------------------- #
# Models
# --------------------------------------------------------------------------- #
class EventModel(Base):
    """Persisted SensorEvent (Schema A)."""

    __tablename__ = "events"

    event_id = Column(String, primary_key=True, index=True)
    elder_id = Column(String, index=True, nullable=False)
    event_type = Column(String, nullable=False)
    confidence = Column(Float, default=1.0)
    voice_transcript = Column(Text, nullable=True)
    emotion = Column(String, nullable=True)
    timestamp = Column(String, nullable=False)

    # Bookkeeping: set True once a decision has been made for this event.
    # Used by GET /api/events/pending.
    processed = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=_utcnow)


class DecisionModel(Base):
    """Persisted AgentDecision (Schema B)."""

    __tablename__ = "decisions"

    decision_id = Column(String, primary_key=True, index=True)
    event_id = Column(String, index=True, nullable=False)
    severity = Column(String, nullable=False)
    action = Column(String, nullable=False)
    reasoning_trace = Column(Text, nullable=False)
    voice_message_to_elder = Column(Text, nullable=True)
    language_code = Column(String, nullable=True)
    family_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_utcnow)


# --------------------------------------------------------------------------- #
# Utilities
# --------------------------------------------------------------------------- #
def init_db() -> None:
    """Create all tables if they don't exist. Called on app startup."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
