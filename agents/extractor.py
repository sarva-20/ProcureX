"""
agents/extractor.py — Agent 1: Tender Requirements Extractor
Uses RAG to pull structured requirements from the uploaded tender PDF.
"""

import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from rag.retriever import query_vectorstore
from dotenv import load_dotenv

load_dotenv()

EXTRACTION_PROMPT = PromptTemplate(
    input_variables=["context"],
    template="""
You are a government tender analysis expert. Based on the following tender document excerpts, 
extract ALL key requirements in a structured format.

TENDER DOCUMENT EXCERPTS:
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
    """
    Agent 1: Extract structured requirements from ingested tender PDF.
    """
    # RAG: retrieve relevant chunks
    queries = [
        "eligibility criteria turnover experience qualifications",
        "scope of work deliverables technical requirements",
        "submission deadline evaluation criteria tender value",
        "certifications financial bid technical bid"
    ]
    
    context_parts = []
    for q in queries:
        chunk = query_vectorstore(q, collection_name=collection_name, k=3)
        context_parts.append(chunk)
    
    combined_context = "\n\n===\n\n".join(context_parts)

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.1
    )

    chain = LLMChain(llm=llm, prompt=EXTRACTION_PROMPT)
    result = chain.run(context=combined_context)

    # Parse JSON safely
    import json, re
    json_match = re.search(r'\{.*\}', result, re.DOTALL)
    if json_match:
        return json.loads(json_match.group())
    
    return {"raw_extraction": result, "error": "JSON parse failed"}
