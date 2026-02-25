"""
agents/extractor.py — Agent 1: Tender Requirements Extractor
Uses Strands Agent with Gemini for extraction.
"""

import os
import json
import re
from strands import Agent
from strands.models.litellm import LiteLLMModel
from rag.ingest import load_vectorstore
from dotenv import load_dotenv

load_dotenv()


def get_model():
    return LiteLLMModel(
        model_id="gemini/gemini-2.5-flash",
        params={
            "api_key": os.getenv("GOOGLE_API_KEY"),
            "temperature": 0.1,
        }
    )


SYSTEM_PROMPT = """You are a government tender analysis expert specializing in Indian procurement.
Your job is to extract structured information from tender documents accurately.
Always respond with valid JSON only, no markdown, no extra text."""


def run_extractor(collection_name: str = "tender_docs") -> dict:
    """Agent 1: Extract structured requirements from tender text."""
    context = load_vectorstore(collection_name)
    if not context:
        return {"error": "No tender text found"}

    context = context[:8000]

    agent = Agent(
        model=get_model(),
        system_prompt=SYSTEM_PROMPT,
    )

    prompt = f"""Extract all key requirements from this tender document and return as JSON.

TENDER DOCUMENT:
{context}

Return a JSON object with these exact keys:
{{
  "tender_title": "...",
  "issuing_authority": "...",
  "tender_number": "...",
  "submission_deadline": "...",
  "estimated_value_inr": "...",
  "eligibility_criteria": {{
    "min_turnover": "...",
    "years_of_experience": "...",
    "technical_qualifications": [],
    "certifications_required": [],
    "prior_experience": "..."
  }},
  "scope_of_work": [],
  "technical_requirements": [],
  "financial_requirements": [],
  "evaluation_criteria": [],
  "key_dates": {{}},
  "special_conditions": []
}}

Return ONLY valid JSON, no extra text."""

    result = agent(prompt)
    response_text = str(result)

    json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    return {"raw_extraction": response_text, "tender_title": "Extracted", "error": "JSON parse failed"}
