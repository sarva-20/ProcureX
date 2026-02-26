# ⚡ ProcureX — AI-Powered Government Tender Intelligence

> Analyze any Indian government tender in minutes. ProcureX uses a 4-agent AI pipeline to evaluate tenders against your company profile and deliver a complete bid strategy.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-procure--x--v01.vercel.app-6366f1?style=for-the-badge)](https://procure-x-v01.vercel.app)
[![Backend](https://img.shields.io/badge/API-Render-00c792?style=for-the-badge)](https://procurex-api.onrender.com/health)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

---

## 🧠 What is ProcureX?

ProcureX is an agentic AI system that analyzes Indian government tender PDFs (from GeM, CPPP, NIC portals) and produces a comprehensive bid/no-bid recommendation tailored to your company's specific capabilities.

Upload a tender → Fill your company profile → Get a full intelligence report in ~60 seconds.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│              (Vercel · Plus Jakarta Sans UI)             │
└────────────────────────┬────────────────────────────────┘
                         │ FormData (PDF + Company Profile)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  FastAPI Backend                         │
│                   (Render · Python)                      │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ Agent 1  │→ │ Agent 2  │→ │ Agent 3  │→ │Agent 4 │  │
│  │Extractor │  │Eligibility│  │  Market  │  │Strategy│  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│                                                         │
│          AWS Strands · Gemini 2.5 Flash · LiteLLM       │
└─────────────────────────────────────────────────────────┘
```

### Agent Pipeline

| Agent | Role | Output |
|-------|------|--------|
| **Agent 1 — Extractor** | Parses tender PDF, extracts structured requirements | Tender title, authority, value, deadlines, eligibility criteria, scope |
| **Agent 2 — Eligibility Checker** | Evaluates company profile against tender requirements | Eligibility score (0-100), criteria breakdown, disqualifiers |
| **Agent 3 — Market Intelligence** | Analyzes competitive landscape and pricing | Win probability, competitor analysis, recommended bid price, risk assessment |
| **Agent 4 — Strategy Synthesizer** | Produces master bid strategy | BID/NO BID decision, win strategy, action plan, compliance checklist |

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Plain CSS-in-JS |
| **Backend** | FastAPI, Python 3.11, Uvicorn |
| **Agent Orchestration** | AWS Strands Agents v1.27 |
| **LLM** | Google Gemini 2.5 Flash via LiteLLM |
| **PDF Processing** | pypdf |
| **Deployment** | Vercel (frontend) · Render (backend) |
| **Monitoring** | UptimeRobot (5-min health checks) |

---

## 🛡️ Guardrails

ProcureX includes production-grade input validation:

- **Not a tender?** — Sarcastic error if you upload a resume, invoice, research paper, or other non-tender document
- **Image-based PDF?** — Caught and reported if the PDF has no extractable text layer
- **File too large?** — 10MB limit enforced at upload
- **Too many N/A fields?** — Secondary extraction validation catches edge cases

---

## 📁 Project Structure

```
procurex/
├── main.py                  # FastAPI app, endpoints, pipeline orchestration
├── requirements.txt         # Python dependencies
├── agents/
│   ├── extractor.py         # Agent 1: Tender extraction + guardrails
│   ├── eligibility.py       # Agent 2: Eligibility evaluation
│   ├── market.py            # Agent 3: Market intelligence
│   └── strategy.py          # Agent 4: Bid strategy synthesis
├── rag/
│   ├── ingest.py            # PDF text extraction
│   └── retriever.py         # Context retrieval
└── frontend/
    ├── src/
    │   └── App.jsx          # React app (2-step: profile → upload → results)
    └── package.json
```

---

## ⚙️ Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Google API Key (Gemini)

---

## 📦 Changelog

### v1.2.0 — Guardrails Update
- Added not-a-tender detection with sarcastic error messages
- Added image-based PDF detection
- Added 10MB file size limit
- Fixed 400 error handling in frontend

### v1.1.0 — Company Profile Update
- Added 2-step flow: Company Profile → Upload
- All 9 company fields sent to backend
- Analysis now fully personalized per company
- Fixed hardcoded "TechSolutions India Pvt Ltd" bug

### v1.0.0 — Initial Release
- 4-agent Strands pipeline with Gemini 2.5 Flash via LiteLLM
- FastAPI backend deployed on Render
- React frontend deployed on Vercel
- Replaced LangChain agents with AWS Strands
- UptimeRobot monitoring to prevent Render cold starts

---

## 🎯 Use Cases

- **SMEs & Contractors** — Quickly evaluate if a tender is worth pursuing
- **Bid Managers** — Automate initial tender screening
- **Procurement Consultants** — Generate first-draft bid strategies
- **Students / Researchers** — Explore agentic AI on real-world documents

---

## 👨‍💻 Built By

**Sarvatarshan Sankar** — [LinkedIn](https://linkedin.com/in/sarvaponns20) · [GitHub](https://github.com/sarva-20)

Pre - Final Year, B.Tech Computer Science & Business Systems, KPR Institute of Engineering and Technology

---

## 📄 License

MIT License — feel free to fork, adapt, and build on this.
