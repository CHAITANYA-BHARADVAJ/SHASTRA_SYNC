"""
llm_client.py - Talks to the LLM and returns a validated AgentDecision.

Supports two providers via the OpenAI-compatible SDK:
  - "openai"     -> OpenAI's gpt-4o (paid).
  - "openrouter" -> a FREE model via OpenRouter (default), same SDK, different
                    base_url + api_key.

We first try OpenAI's native Structured Outputs (parse) which guarantees the
JSON matches our Pydantic model. Many free models don't support that endpoint,
so we fall back to JSON mode and validate the result ourselves.

Finally, we ALWAYS re-apply the hard business rules in code, so a model can
never violate the safety-critical contract (e.g. a fall must be "high").
"""

from __future__ import annotations

import json
import time

from openai import OpenAI
from openai import APIStatusError, RateLimitError

from config import Config, PROVIDER_BASE_URLS
from prompt import SYSTEM_PROMPT, build_user_prompt
from schemas import AgentDecision, LLMDecision, SensorEvent

# How many times to retry a single model on a transient rate-limit before
# moving on to the next candidate model.
MAX_RETRIES_PER_MODEL = 2
RETRY_BACKOFF_SECONDS = 5


class LLMClient:
    def __init__(self, config: Config):
        self.config = config
        self.models = config.model_candidates()
        self.model = self.models[0]

        api_key = config.active_key()
        if not api_key:
            raise RuntimeError(
                f"No API key configured for provider '{config.provider}'. "
                "Set OPENAI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY in "
                "your .env file."
            )

        base_url = PROVIDER_BASE_URLS.get(config.provider)
        if config.provider == "openrouter":
            self.client = OpenAI(
                api_key=api_key,
                base_url=base_url,
                default_headers={
                    # Optional but recommended attribution headers for OpenRouter.
                    "HTTP-Referer": "https://shastrasync.local",
                    "X-Title": "Shastra Sync - AI Brain",
                },
            )
        elif base_url:  # groq (and any future OpenAI-compatible provider)
            self.client = OpenAI(api_key=api_key, base_url=base_url)
        else:  # openai
            self.client = OpenAI(api_key=api_key)

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #
    def decide(self, event: SensorEvent) -> AgentDecision:
        """Turn a SensorEvent into a fully validated AgentDecision."""
        user_prompt = build_user_prompt(event)

        raw = self._call_llm(user_prompt)
        decision = raw.to_agent_decision(event_id=event.event_id)
        return self._enforce_business_rules(event, decision)

    # ------------------------------------------------------------------ #
    # LLM calls
    # ------------------------------------------------------------------ #
    def _call_llm(self, user_prompt: str) -> LLMDecision:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        # Try each candidate model in order. Free OpenRouter models are on a
        # shared pool and often return 429 (rate limited); if so we retry a
        # couple of times, then fall through to the next model.
        last_error: Exception | None = None
        for model in self.models:
            for attempt in range(1, MAX_RETRIES_PER_MODEL + 1):
                try:
                    result = self._try_model(model, messages)
                    self.model = model  # remember the one that worked
                    return result
                except (RateLimitError, APIStatusError) as exc:
                    status = getattr(exc, "status_code", None)
                    last_error = exc
                    if status == 429 and attempt < MAX_RETRIES_PER_MODEL:
                        print(
                            f"[llm] {model} rate-limited (429), retry "
                            f"{attempt}/{MAX_RETRIES_PER_MODEL} in "
                            f"{RETRY_BACKOFF_SECONDS}s..."
                        )
                        time.sleep(RETRY_BACKOFF_SECONDS)
                        continue
                    # Not retryable (or out of retries): move to next model.
                    print(f"[llm] {model} unavailable ({status or exc}); "
                          f"trying next model.")
                    break
                except Exception as exc:  # noqa: BLE001
                    last_error = exc
                    print(f"[llm] {model} failed ({exc}); trying next model.")
                    break

        raise RuntimeError(
            f"All candidate models failed. Last error: {last_error}"
        )

    def _try_model(self, model: str, messages: list) -> LLMDecision:
        """Attempt one model: native structured output first, then JSON mode."""
        # 1) Native structured outputs (best; OpenAI gpt-4o + some others).
        try:
            completion = self.client.beta.chat.completions.parse(
                model=model,
                messages=messages,
                response_format=LLMDecision,
                temperature=0.4,
            )
            parsed = completion.choices[0].message.parsed
            if parsed is not None:
                return parsed
        except (RateLimitError, APIStatusError):
            # Let the caller handle rate-limit / availability by re-raising.
            raise
        except Exception as exc:  # noqa: BLE001 - structured mode unsupported
            print(f"[llm] {model}: structured parse unavailable ({exc}); "
                  f"using JSON mode.")

        # 2) JSON mode + manual validation (works with most free models).
        return self._call_llm_json_mode(model, messages)

    def _call_llm_json_mode(self, model: str, messages: list) -> LLMDecision:
        # Add an explicit schema hint so JSON-mode models know the exact shape.
        schema_hint = (
            "Respond with ONLY a JSON object with these exact keys: "
            '"severity" (low|medium|high|critical), '
            '"action" (monitor|voice_check|notify_family|call_emergency), '
            '"reasoning_trace" (string), "voice_message_to_elder" (string), '
            '"language_code" (e.g. hi-IN), "family_message" (string).'
        )
        messages = messages + [{"role": "system", "content": schema_hint}]

        try:
            completion = self.client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.4,
            )
        except (RateLimitError, APIStatusError):
            raise
        except Exception:
            # Some models reject response_format entirely; retry plain.
            completion = self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.4,
            )

        content = completion.choices[0].message.content or ""
        data = self._extract_json(content)
        return LLMDecision.model_validate(data)

    @staticmethod
    def _extract_json(content: str) -> dict:
        """Best-effort extraction of a JSON object from a text response."""
        content = content.strip()
        # Strip common markdown code fences.
        if content.startswith("```"):
            content = content.strip("`")
            # remove a leading "json" language tag if present
            if content.lstrip().lower().startswith("json"):
                content = content.lstrip()[4:]
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            start = content.find("{")
            end = content.rfind("}")
            if start != -1 and end != -1 and end > start:
                return json.loads(content[start : end + 1])
            raise

    # ------------------------------------------------------------------ #
    # Safety net: hard business rules always win over the model
    # ------------------------------------------------------------------ #
    @staticmethod
    def _enforce_business_rules(
        event: SensorEvent, decision: AgentDecision
    ) -> AgentDecision:
        et = event.event_type
        if et == "fall":
            decision.action = "voice_check"
            decision.severity = "high"
        elif et == "manual_panic":
            decision.action = "call_emergency"
            decision.severity = "critical"
        elif et == "normal":
            decision.action = "monitor"
            decision.severity = "low"

        # Guarantee we never ship empty required strings.
        if not decision.voice_message_to_elder.strip():
            decision.voice_message_to_elder = "क्या आप ठीक हैं? (Are you okay?)"
            decision.language_code = decision.language_code or "hi-IN"
        if not decision.language_code.strip():
            decision.language_code = "hi-IN"
        if not decision.family_message.strip():
            decision.family_message = "An event was detected. Awaiting response."
        return decision
