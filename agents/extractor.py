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

VALIDATION_PROMPT = """Look at this document and answer ONE question: Is this a government tender document?

A tender document typically contains: tender number, issuing authority, scope of work, bid submission dates, estimated value, eligibility criteria.

Document text:
{context}

Reply with ONLY one word: YES or NO"""


class NotATenderError(Exception):
    """Raised when the uploaded document is not a tender."""
    pass


SARCASTIC_MESSAGES = [
    "Bro. That's not a tender. That's a {doc_type}. Did you accidentally upload the wrong file? We analyze government tenders here, not life stories.",
    "Nice try. This looks like a {doc_type}, not a government tender. Try uploading something from GeM, CPPP, or NIC portals.",
    "Our agents just collectively sighed. This is a {doc_type}. We need a tender PDF — the kind with bid dates, tender numbers, and scope of work.",
    "Error 404: Tender not found. What we found instead: a {doc_type}. Please upload an actual government tender document.",
    "The agents are confused. They were expecting a government tender but got a {doc_type}. Close, but not quite what we need.",
]

DOC_TYPE_HINTS = {
    "resume": ["experience", "education", "skills", "cgpa", "intern", "bachelor", "engineer", "summary", "volunteer", "achievement"],
    "invoice": ["invoice", "gst", "total amount", "payment due", "bill to", "tax invoice"],
    "research paper": ["abstract", "introduction", "methodology", "conclusion", "references", "journal", "doi"],
    "news article": ["published", "reporter", "journalist", "editor", "breaking news"],
    "legal document": ["whereas", "hereinafter", "jurisdiction", "plaintiff", "defendant", "court"],
    "financial report": ["balance sheet", "profit and loss", "quarterly", "revenue", "ebitda", "shareholders"],
}


def detect_doc_type(text: str) -> str:
    text_lower = text.lower()
    for doc_type, keywords in DOC_TYPE_HINTS.items():
        matches = sum(1 for kw in keywords if kw in text_lower)
        if matches >= 2:
            return doc_type
    return "non-tender document"


def run_extractor(collection_name: str = "tender_docs") -> dict:
    """Agent 1: Extract structured requirements from tender text."""
    context = load_vectorstore(collection_name)

    if not context:
        return {"error": "No tender text found. Please upload a valid PDF."}

    context_truncated = context[:8000]

    # --- GUARDRAIL: Validate this is actually a tender ---
    try:
        validator = Agent(
            model=get_model(),
            system_prompt="You are a document classifier. Reply with only YES or NO.",
        )
        validation_result = str(validator(VALIDATION_PROMPT.format(context=context_truncated[:3000]))).strip().upper()

        if "NO" in validation_result and "YES" not in validation_result:
            doc_type = detect_doc_type(context)
            import random
            message = random.choice(SARCASTIC_MESSAGES).format(doc_type=doc_type)
            raise NotATenderError(message)
    except NotATenderError:
        raise
    except Exception as e:
        if "NotATenderError" in str(type(e)):
            raise
        # If validation itself fails, proceed anyway
        pass

    # --- MAIN EXTRACTION ---
    agent = Agent(
        model=get_model(),
        system_prompt=SYSTEM_PROMPT,
    )

    prompt = f"""Extract all key requirements from this tender document and return as JSON.

TENDER DOCUMENT:
{context_truncated}

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
            extracted = json.loads(json_match.group())

            # Secondary guardrail: check if extracted data looks like a real tender
            na_count = sum(1 for v in [
                extracted.get("tender_number"),
                extracted.get("estimated_value_inr"),
                extracted.get("submission_deadline"),
                extracted.get("issuing_authority")
            ] if not v or v.strip().upper() in ["N/A", "NA", "NONE", "NOT FOUND", "NOT SPECIFIED", "NULL", ""])

            if na_count >= 3:
                doc_type = detect_doc_type(context)
                import random
                message = random.choice(SARCASTIC_MESSAGES).format(doc_type=doc_type)
                raise NotATenderError(message)

            return extracted
        except json.JSONDecodeError:
            pass
        except NotATenderError:
            raise

    return {"raw_extraction": response_text, "tender_title": "Extracted", "error": "JSON parse failed"}
