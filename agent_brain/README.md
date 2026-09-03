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
| `openrouter`   | `meta-llama/llama-3.3-70b-instruct:free` (default) | **Free** |

[OpenRouter](https://openrouter.ai) exposes many models through an
OpenAI-compatible API, including several with a `:free` suffix that cost $0.
Get a free key at https://openrouter.ai/keys. The default is set to a capable
free model so you can run the whole system without paying.

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
| `Procfile`      | Process definition for Railway (`worker: python agent.py`) |
| `railway.json`  | Railway build/deploy config |
| `runtime.txt`   | Pins the Python version for the cloud builder |
| `../render.yaml`| Render Blueprint (repo root) — defines the free web service |

---

## Deploying (run it 24/7 in the cloud)

The agent is a **background worker** (it loops forever, no web page), so deploy
it as a *Background Worker*, not a Web Service.

### Render (recommended)
## Deploying (run it 24/7 in the cloud)

The brain is a forever-polling loop. `agent.py` adapts to the host:
- If a `PORT` env var is set (Render web service), it serves a tiny health
  endpoint on that port and runs the polling loop in a background thread.
- If not (local / Railway worker), it just runs the loop.

The decision logic is identical either way.

### Render (free tier — Web Service)
Render's free plan only offers **Web Services**, so we deploy as one.

1. Push this repo to GitHub.
2. On https://render.com : **New → Blueprint** → select your repo → pick the
   branch `teammate2-agent-brain`. Render reads `render.yaml` and creates the
   `shastra-sync-brain` web service automatically.
   (Or **New → Web Service** manually: Root Dir `agent_brain`, build
   `pip install -r requirements.txt`, start `python agent.py`.)
3. In the service's **Environment** tab, add the secret:
   `GROQ_API_KEY = <your gsk_... key>`  (the rest come from `render.yaml`).
4. Deploy. Visit the service URL — you should see a JSON status like
   `{"service":"shastra-sync-brain","status":"alive",...}`.

> **Keep it awake:** Render free web services sleep after ~15 min with no HTTP
> traffic, which pauses polling. Add a free pinger (e.g. https://uptimerobot.com)
> that GETs your service URL every 5 minutes so the brain keeps running.

### Railway (alternative — true background worker, no sleep)
Railway supports background workers, so no health-server/keep-alive is needed.
Deploy from GitHub, set Root Directory `agent_brain`, and add the env vars
(`API_URL`, `LLM_PROVIDER=groq`, `GROQ_API_KEY`, `GROQ_MODEL`,
`POLL_INTERVAL_SECONDS`). It picks up `railway.json` / `Procfile` automatically.

> The `.env` file is git-ignored and never leaves your machine. In the cloud,
> configuration comes from the dashboard environment variables instead.

### Note on the LLM provider
Default is **Groq** (fast + free tier). The code also supports OpenAI (`gpt-4o`,
paid) and OpenRouter (free models) — just change `LLM_PROVIDER` and the matching
key/model env vars. No code changes needed.