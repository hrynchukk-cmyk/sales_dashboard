# Validation Council

Multiple LLMs validate your business idea — anonymously, anti-sycophantically.

> **Disclaimer:** Real validation = people paying or refusing. The council helps you decide *what to test first*, not whether the idea is proven.

## Quick start

```bash
cd council
pip install -r requirements.txt
cp .env.example .env
# Edit .env: add OPENROUTER_API_KEY and verify model IDs at https://openrouter.ai/models
uvicorn app:app --reload
# Open http://localhost:8000
```

## How it works

**Stage 1 — Independent analysis**
Each council model receives the idea and analyzes it in parallel against a fixed rubric (Problem / Willingness to pay / Riskiest assumption / Market / Unit economics / Cheapest test / Kill criteria). Default assumption: the idea fails.

**Stage 2 — Anonymous peer review**
Analyses are stripped of model identities and labeled A/B/C…. Each council member critiques and ranks the others' reasoning. This surfaces blind spots without social pressure.

**Stage 3 — Chairman verdict**
A senior model weighs the strongest arguments (trusting higher-ranked analyses more), surfaces disagreements, and delivers one decisive verdict: GO / CONDITIONAL GO / PIVOT / KILL.

## Configuration

All config lives in `.env` — no code changes needed to swap models:

| Variable | Default | Notes |
|---|---|---|
| `OPENROUTER_API_KEY` | — | Required. Get at openrouter.ai/keys |
| `COUNCIL_MODELS` | 4 models (see .env.example) | Comma-separated. **Check IDs at openrouter.ai/models** — they go stale. |
| `CHAIRMAN_MODEL` | claude-opus-4-5 | Final verdict model |
| `REQUEST_TIMEOUT` | 90 | Seconds per model call |

## Running tests (no API key needed)

```bash
cd council
pip install pytest pytest-asyncio
pytest tests/ -v
```

## Tuning prompts

All prompts are in `prompts.py`. Edit `STAGE1_SYSTEM` to tune for your market (e.g. add UA B2B SaaS context, COD e-commerce specifics, etc.).
