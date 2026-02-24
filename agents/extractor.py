"""
agents/extractor.py — Agent 1: Tender Requirements Extractor
Passes full PDF text to Gemini for extraction.
"""

import os
import json
import re
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from rag.ingest import load_vectorstore
from dotenv import load_dotenv

load_dotenv()

EXTRACTION_PROMPT = PromptTemplate(
    input_variables=["context"],
    template="""
You are a government tender analysis expert. Based on the following tender document, 
extract ALL key requirements in a structured format.

TENDER DOCUMENT:
{context}

Extract and return a JSON object with these exact keys:
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

Return ONLY valid JSON, no extra text.
"""
)


def run_extractor(collection_name: str = "tender_docs") -> dict:
    """Agent 1: Extract structured requirements from tender text."""
    context = load_vectorstore(collection_name)

    if not context:
        return {"error": "No tender text found"}

    # Truncate to avoid token limits
    context = context[:8000]

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.1
    )

    chain = LLMChain(llm=llm, prompt=EXTRACTION_PROMPT)
    result = chain.run(context=context)

    json_match = re.search(r'\{.*\}', result, re.DOTALL)
    if json_match:
        return json.loads(json_match.group())

    return {"raw_extraction": result, "error": "JSON parse failed"}
