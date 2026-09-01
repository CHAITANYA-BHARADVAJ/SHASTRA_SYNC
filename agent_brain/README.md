# Shastra Sync — Teammate 2: The AI Brain 🧠

The empathetic reasoning engine. This is a continuous background loop that:

1. Polls the Hub every ~2s: `GET {API_URL}/api/events/pending`
2. For each new `SensorEvent`, asks an LLM to act as a comforting companion and
   produce a **structured** `AgentDecision` (severity, action, empathetic
   reasoning, a spoken message in the elder's language, and a family message).
3. Sends it back: `POST {API_URL}/api/decisions` — the Hub stores and broadcasts it.

All communication follows the JSON contracts in `AI_DEVELOPMENT_MASTER_FILE.md`.

---

## ⚠️ About the LLM: "make gpt-4o free"

OpenAI's `gpt-4o` is **not free** — it needs a paid OpenAI account with credits.
So this module supports two providers, switchable with one env var:

| `LLM_PROVIDER` | Model | Cost |
|----------------|-------|------|
| `openai`       | `gpt-4o` | Paid (needs OpenAI credits) |
| `openrouter`   | a rotation of `:free` models (default) | **Free** |

[OpenRouter](https://openrouter.ai) exposes many models through an
OpenAI-compatible API, including several with a `:free` suffix that cost $0.
Get a free key at https://openrouter.ai/keys.

**Free models share a rate-limited pool**, so any single one can be busy (HTTP
429) at a given moment. To handle this, `OPENROUTER_MODEL` accepts a
**comma-separated list** of models. The agent tries them in order, retries
briefly on rate limits, and automatically falls back to the next model until
one responds. Free models also come and go — check the current free list at
https://openrouter.ai/models?max_price=0 and update the list if needed.

> Both paths use the exact same `AgentDecision` contract, and the hard business
> rules (fall → high/voice_check, panic → critical/call_emergency) are enforced
> in code regardless of which model you pick.

---

## Setup

```bash
# from the agent_brain/ folder
pip install -r requirements.txt

# create your .env
copy .env.example .env      # Windows (PowerShell/CMD)
# cp .env.example .env      # macOS/Linux
```

Then edit `.env`:
- Keep `LLM_PROVIDER=openrouter` (free) and paste your `OPENROUTER_API_KEY`, **or**
- Set `LLM_PROVIDER=openai` and paste a funded `OPENAI_API_KEY` to use `gpt-4o`.

Make sure the Hub (Teammate 1) is running at `API_URL` (default
`http://localhost:8000`).

## Run

```bash
python agent.py
```

You'll see events come in, decisions get made, and confirmations that they were
posted back to the Hub.

## Verify without a key or a running Hub

```bash
python selftest.py
```

This runs offline checks of the schemas, the business-rule safety net, and the
prompt builder. No network or API key required.

---

## Files

| File | Purpose |
|------|---------|
| `agent.py`      | Main polling loop (entry point) |
| `schemas.py`    | `SensorEvent` / `AgentDecision` Pydantic contracts |
| `llm_client.py` | LLM calls (structured output + JSON fallback) + rule enforcement |
| `prompt.py`     | Empathetic system prompt + per-event user prompt |
| `hub_client.py` | HTTP client for the Hub (`/api/events/pending`, `/api/decisions`) |
| `config.py`     | Loads `.env` configuration |
| `selftest.py`   | Offline verification |
| `Procfile`      | Process definition for Render/Railway (`worker: python agent.py`) |
| `runtime.txt`   | Pins the Python version for the cloud builder |
| `../render.yaml`| Render Blueprint (repo root) — defines the background worker |

---

## Deploying (run it 24/7 in the cloud)

The agent is a **background worker** (it loops forever, no web page), so deploy
it as a *Background Worker*, not a Web Service.

### Render (recommended)
1. Push this repo to GitHub.
2. On https://render.com : **New → Blueprint**, and select your repo. Render
   reads `render.yaml` and creates the `shastra-sync-brain` worker automatically.
   (Or **New → Background Worker** manually with Root Dir `agent_brain`,
   build `pip install -r requirements.txt`, start `python agent.py`.)
3. In the service's **Environment** tab, add the secret:
   `OPENROUTER_API_KEY = <your key>`  (the other vars come from `render.yaml`).
4. Deploy. The worker now polls the live Hub forever.

> The `.env` file is git-ignored and never leaves your machine. In the cloud,
> configuration comes from the dashboard environment variables instead.

### Note on the free LLM tier
Free OpenRouter models are rate-limited and slow. For a smooth always-on
deployment, add a few dollars of OpenRouter credit or switch to a paid OpenAI
key (`LLM_PROVIDER=openai`, `OPENAI_API_KEY=...`). The code supports both with
no changes — just different env vars.
