# ProcureX — Government Tender Analyzer
## Multi-Agent AI System | LangChain + Gemini 1.5 Flash + ChromaDB + FastAPI + n8n

---

## Quick Start (MacBook M4)

### 1. Setup Python env
```bash
cd ~/projects/procurex
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure API key
```bash
cp .env.example .env
# Edit .env and paste your GOOGLE_API_KEY
```

### 3. Start FastAPI
```bash
uvicorn main:app --reload --port 8000
```
Visit: http://localhost:8000/docs (Swagger UI)

### 4. Start n8n (Docker)
```bash
docker-compose up -d
```
Visit: http://localhost:5678
- Go to Workflows → Import from File → select `n8n_workflow.json`

---

## Test It

### Via Swagger UI (easiest)
1. Go to http://localhost:8000/docs
2. POST `/analyze` — upload any government tender PDF
3. Copy the `job_id` from response
4. GET `/status/{job_id}` — poll until status = "complete"

### Via curl
```bash
curl -X POST http://localhost:8000/analyze \
  -F "file=@/path/to/tender.pdf"
```

### Get a real tender PDF
- https://gem.gov.in → search for any tender, download PDF
- https://eprocure.gov.in/cppp → Central Public Procurement Portal

---

## Architecture

```
User (PDF) → n8n Webhook → FastAPI /analyze
                              ↓
                    [Agent 1] RAG Extractor
                    (ChromaDB + Gemini)
                              ↓
                    [Agent 2] Eligibility Checker
                              ↓
                    [Agent 3] Market Intelligence
                              ↓
                    [Agent 4] Strategy Synthesizer
                              ↓
                    Structured JSON Report
```

## File Structure
```
procurex/
├── main.py                  # FastAPI app (4-agent pipeline)
├── agents/
│   ├── extractor.py         # Agent 1: RAG-based requirements extraction
│   ├── eligibility.py       # Agent 2: Eligibility check against company profile
│   ├── market.py            # Agent 3: Competitive analysis + risk scoring
│   └── strategy.py          # Agent 4: Master bid strategy synthesis
├── rag/
│   ├── ingest.py            # PDF → ChromaDB
│   └── retriever.py         # RAG queries
├── docker-compose.yml       # n8n
├── n8n_workflow.json        # Import into n8n
├── requirements.txt
└── .env.example
```

## Customizing Company Profile
Edit `agents/eligibility.py` → `DEFAULT_COMPANY_PROFILE` dict,
or pass it dynamically via the `/analyze` endpoint query params.
