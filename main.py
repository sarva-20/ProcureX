"""
main.py — ProcureX FastAPI Application
Multi-agent government tender analysis pipeline.
"""

import os
import shutil
import uuid
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

from rag.ingest import ingest_pdf
from agents.extractor import run_extractor
from agents.eligibility import run_eligibility_check
from agents.market import run_market_intelligence
from agents.strategy import run_strategy

app = FastAPI(
    title="ProcureX — Government Tender Analyzer",
    description="Multi-agent AI system for analyzing government tenders using LangChain + Gemini",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

jobs: dict = {}


class CompanyProfile(BaseModel):
    name: str = "TechSolutions India Pvt Ltd"
    annual_turnover_cr: float = 15
    years_in_operation: int = 8
    certifications: list = ["ISO 9001:2015", "CMMI Level 3"]
    prior_govt_projects: int = 3
    technical_team_size: int = 45
    domain_expertise: list = ["software development", "AI/ML", "cloud infrastructure"]
    registered_as: str = "Pvt Ltd"
    msme_registered: bool = True


@app.get("/")
def root():
    return {
        "service": "ProcureX",
        "status": "running",
        "endpoints": ["/analyze", "/status/{job_id}", "/health"]
    }


@app.get("/health")
def health():
    return {"status": "ok", "google_api_key_set": bool(os.getenv("GOOGLE_API_KEY"))}


def run_pipeline(job_id: str, pdf_path: str, company_profile: dict):
    try:
        jobs[job_id]["status"] = "ingesting"
        collection_name = f"tender_{job_id}"
        ingest_pdf(pdf_path, collection_name=collection_name)

        jobs[job_id]["status"] = "extracting"
        extracted = run_extractor(collection_name=collection_name)
        jobs[job_id]["extraction"] = extracted

        jobs[job_id]["status"] = "eligibility_check"
        eligibility = run_eligibility_check(extracted, company_profile)
        jobs[job_id]["eligibility"] = eligibility

        jobs[job_id]["status"] = "market_intelligence"
        market = run_market_intelligence(extracted, eligibility)
        jobs[job_id]["market"] = market

        jobs[job_id]["status"] = "strategy_synthesis"
        strategy = run_strategy(extracted, eligibility, market)
        jobs[job_id]["strategy"] = strategy

        jobs[job_id]["status"] = "complete"
        jobs[job_id]["result"] = {
            "job_id": job_id,
            "tender_extraction": extracted,
            "eligibility_report": eligibility,
            "market_intelligence": market,
            "bid_strategy": strategy
        }

    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)
    finally:
        try:
            os.remove(pdf_path)
        except Exception:
            pass


@app.post("/analyze")
async def analyze_tender(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    company_name: str = "TechSolutions India Pvt Ltd",
    annual_turnover_cr: float = 15,
    years_in_operation: int = 8,
    msme_registered: bool = True
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    job_id = str(uuid.uuid4())[:8]
    pdf_path = str(UPLOAD_DIR / f"{job_id}_{file.filename}")

    with open(pdf_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    company_profile = {
        "name": company_name,
        "annual_turnover_cr": annual_turnover_cr,
        "years_in_operation": years_in_operation,
        "certifications": ["ISO 9001:2015"],
        "prior_govt_projects": 2,
        "technical_team_size": 30,
        "domain_expertise": ["software development", "AI/ML"],
        "registered_as": "Pvt Ltd",
        "msme_registered": msme_registered
    }

    jobs[job_id] = {"status": "queued", "filename": file.filename}
    background_tasks.add_task(run_pipeline, job_id, pdf_path, company_profile)

    return {
        "job_id": job_id,
        "message": "Analysis started. Poll /status/{job_id} for results.",
        "poll_url": f"/status/{job_id}"
    }


@app.post("/webhook")
async def n8n_webhook(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    return await analyze_tender(background_tasks, file)


@app.get("/status/{job_id}")
def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]

    if job["status"] == "complete":
        return JSONResponse(content=job["result"])
    elif job["status"] == "failed":
        return JSONResponse(
            status_code=500,
            content={"job_id": job_id, "status": "failed", "error": job.get("error")}
        )
    else:
        return {
            "job_id": job_id,
            "status": job["status"],
            "message": f"Pipeline running... current stage: {job['status']}"
        }