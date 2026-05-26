# Vera — Exploration Assistant

Vera is a conversational AI agent built for a cosmetic surgeries platform. It guides users from their initial doubt to finding the right treatment and specialist, without replacing the doctor-patient relationship.

## What Vera does

- Builds a user profile progressively through natural conversation
- Surfaces relevant treatments, articles, and real experiences from the platform catalog
- Shows verified clinics filtered by treatment and city
- Collects links shared during the conversation in a side panel
- Supports ES, IT, FR, DE, EN natively

## What Vera never does

- Give medical diagnoses or binding clinical recommendations
- Recommend treatments for post-procedure symptoms
- Suggest clinics outside Spain
- Act as an aggressive sales bot

---

## Project structure

```
vera/
├── backend/
│   ├── main.py                   # FastAPI server + Anthropic tool use
│   ├── rag.py                    # Treatment search (keyword) + clinic search
│   └── requirements.txt
├── data/
│   ├── cards.json                # 114 treatments scraped from the platform
│   ├── embeddings.json           # Pre-computed embeddings (generated locally)
│   └── clinicas_rinoplastia.json # 23 verified clinics with rhinoplasty
├── scripts/
│   ├── generate_embeddings.py    # Run once locally to generate embeddings
│   └── parse_clinics.py          # Filters clinics by treatment from raw JSONs
├── public/
│   └── index.html                # Full-screen mobile-first chat UI
└── docs/
    └── test_cases.md             # Manual QA test suite
```

---

## Local setup

**Requirements:** Python 3.10+

```bash
# Install dependencies
pip install -r requirements.txt

# Generate embeddings (run once after updating cards.json)
python scripts/generate_embeddings.py

# Start the server
cd backend
export ANTHROPIC_API_KEY=sk-ant-...
python -m uvicorn main:app --reload
```

Open `http://localhost:8000` in your browser.

---

## Architecture

```
Browser (index.html)
    ↓ POST /api/chat
FastAPI (backend/main.py)
    ↓ Anthropic API (claude-haiku) + tool use
    ↓ rag.py → keyword search on embeddings.json
    ↓ rag.py → clinic search on clinicas_rinoplastia.json
    ↑ { reply, chips, context (treatments), clinics }
Browser renders response + cards + chips
```

**RAG strategy:** Currently keyword-based for demo simplicity. Switch `USE_SEMANTIC = True` in `rag.py` and uncomment the sentence-transformers code to enable full vector search in production.

---

## Deployment (Railway)

The backend runs on [Railway](https://railway.app) as a Python service.

**Environment variables required:**
```
ANTHROPIC_API_KEY=sk-ant-...
```

**Config file:** `railway.json` at project root handles build and start commands.

Push to `main` branch triggers automatic redeploy.

---

## How the agent works

Vera uses Anthropic's **tool use** feature. Every response is forced through a single tool called `respond` with structured fields:

| Field | Type | Purpose |
|-------|------|---------|
| `reply` | string | Conversational response text |
| `chips` | array | Clickable quick-reply options |
| `search_query` | string | Triggers RAG search when user mentions a specific treatment or zone |
| `show_clinics` | boolean | Triggers clinic search when user is ready to see specialists |
| `ciudad` | string | City passed explicitly by the model for clinic filtering |

This approach eliminates JSON parsing errors and gives the model full control over when to surface content.

---

## Conversation flow

```
Greeting + 5 entry chips
    ↓
Profile building: zone → objective → prior experience
    ↓
Treatment cards (RAG search)
    ↓
Info: recovery, results, pricing, ratings
    ↓
City question → Clinic cards
    ↓
User contacts clinic directly
```

Post-treatment flow is separate — Vera never recommends treatments for physical symptoms after a procedure. It always redirects to the original specialist or an in-person consultation.

---

## Data

| File | Contents | Source |
|------|----------|--------|
| `cards.json` | 114 treatments with name, description, price, rating, URL | Scraped from platform |
| `embeddings.json` | Pre-computed text embeddings for all 114 treatments | Generated locally with `paraphrase-multilingual-MiniLM-L12-v2` |
| `clinicas_rinoplastia.json` | 23 clinics offering rhinoplasty across Spain | Scraped + filtered with `parse_clinics.py` |

> Raw scraped files are excluded from the repo via `.gitignore`.

---

## Roadmap

- [ ] Semantic RAG in production (Vertex AI Embeddings on GCP)
- [ ] Full clinic database (not just rhinoplasty)
- [ ] Before/after photo integration
- [ ] Article and forum content in RAG
- [ ] GCP Cloud Run deployment
- [ ] Analytics dashboard (conversation patterns, drop-off points)
- [ ] Clustering of existing users for personalized agent behavior
