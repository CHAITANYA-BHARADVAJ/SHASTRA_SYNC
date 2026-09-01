"""
config.py - Loads environment configuration for the AI Brain.

Reads from a local .env file (via python-dotenv) plus real environment
variables. Nothing is hardcoded so the agent can be deployed live.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

# Load .env if present. Real environment variables always win.
load_dotenv()


@dataclass(frozen=True)
class Config:
    api_url: str
    provider: str  # "openai" or "openrouter"
    poll_interval: float

    openai_api_key: str
    openai_model: str

    openrouter_api_key: str
    openrouter_model: str

    @staticmethod
    def load() -> "Config":
        provider = os.getenv("LLM_PROVIDER", "openrouter").strip().lower()
        return Config(
            api_url=os.getenv("API_URL", "http://localhost:8000").rstrip("/"),
            provider=provider,
            poll_interval=float(os.getenv("POLL_INTERVAL_SECONDS", "2")),
            openai_api_key=os.getenv("OPENAI_API_KEY", "").strip(),
            openai_model=os.getenv("OPENAI_MODEL", "gpt-4o").strip(),
            openrouter_api_key=os.getenv("OPENROUTER_API_KEY", "").strip(),
            openrouter_model=os.getenv(
                "OPENROUTER_MODEL", DEFAULT_FREE_MODELS
            ).strip(),
        )

    def active_key(self) -> str:
        return (
            self.openai_api_key
            if self.provider == "openai"
            else self.openrouter_api_key
        )

    def active_model(self) -> str:
        """The primary (first) model. Kept for display/back-compat."""
        return self.model_candidates()[0]

    def model_candidates(self) -> list:
        """
        The ordered list of models to try.

        For OpenAI we just use the single configured model. For OpenRouter we
        allow a comma-separated list so the client can fall back to another
        FREE model if the first is rate-limited or unavailable.
        """
        if self.provider == "openai":
            return [self.openai_model]
        return [m.strip() for m in self.openrouter_model.split(",") if m.strip()]


# A rotation of currently-available FREE OpenRouter models. If the first is
# busy (HTTP 429) or retired, the client automatically tries the next.
DEFAULT_FREE_MODELS = (
    "z-ai/glm-5.2:free,"
    "google/gemma-4-31b-it:free,"
    "google/gemma-4-26b-a4b-it:free,"
    "minimax/minimax-m3:free,"
    "nvidia/nemotron-3-super-120b-a12b:free"
)
