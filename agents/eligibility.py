"""
agents/eligibility.py — Agent 2: Eligibility Checker
Checks if a company profile meets the tender's eligibility criteria.
"""

import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from dotenv import load_dotenv

load_dotenv()

# Default company profile — swap this out with a real one or pass dynamically
DEFAULT_COMPANY_PROFILE = {
    "name": "TechSolutions India Pvt Ltd",
    "annual_turnover_cr": 15,
    "years_in_operation": 8,
    "certifications": ["ISO 9001:2015", "CMMI Level 3"],
    "prior_govt_projects": 3,
    "technical_team_size": 45,
    "domain_expertise": ["software development", "AI/ML", "cloud infrastructure"],
    "registered_as": "Pvt Ltd",
    "msme_registered": True
}

ELIGIBILITY_PROMPT = PromptTemplate(
    input_variables=["tender_requirements", "company_profile"],
    template="""
You are a government procurement compliance expert. Analyze whether the company meets the tender requirements.

TENDER REQUIREMENTS:
{tender_requirements}

COMPANY PROFILE:
{company_profile}

Perform a thorough eligibility check and return a JSON object:
{{
  "overall_eligible": true/false,
  "eligibility_score": 0-100,
  "criteria_analysis": [
    {{
      "criterion": "...",
      "required": "...",
      "company_has": "...",
      "meets_requirement": true/false,
      "gap": "..." 
    }}
  ],
  "strengths": [],
  "disqualifiers": [],
  "conditional_eligibility": [],
  "recommendation": "PROCEED / PROCEED WITH CAUTION / DO NOT BID",
  "reasoning": "..."
}}

Return ONLY valid JSON.
"""
)


def run_eligibility_check(
    extracted_requirements: dict,
    company_profile: dict = None
) -> dict:
    """
    Agent 2: Check eligibility against extracted tender requirements.
    """
    if company_profile is None:
        company_profile = DEFAULT_COMPANY_PROFILE

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.1
    )

    chain = LLMChain(llm=llm, prompt=ELIGIBILITY_PROMPT)
    result = chain.run(
        tender_requirements=json.dumps(extracted_requirements, indent=2),
        company_profile=json.dumps(company_profile, indent=2)
    )

    import re
    json_match = re.search(r'\{.*\}', result, re.DOTALL)
    if json_match:
        return json.loads(json_match.group())

    return {"raw_result": result, "error": "JSON parse failed"}
