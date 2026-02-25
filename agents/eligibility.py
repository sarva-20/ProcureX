"""
agents/eligibility.py — Agent 2: Eligibility Checker
Uses Strands Agent with Gemini.
"""

import os
import json
import re
from strands import Agent
from strands.models.litellm import LiteLLMModel
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


SYSTEM_PROMPT = """You are a procurement eligibility expert for Indian government tenders.
Evaluate company eligibility against tender requirements precisely and objectively.
Always respond with valid JSON only."""


def run_eligibility_check(extracted_requirements: dict, company_profile: dict) -> dict:
    """Agent 2: Check company eligibility against tender requirements."""

    agent = Agent(
        model=get_model(),
        system_prompt=SYSTEM_PROMPT,
    )

    prompt = f"""Evaluate if this company is eligible for this tender.

TENDER REQUIREMENTS:
{json.dumps(extracted_requirements, indent=2)}

COMPANY PROFILE:
{json.dumps(company_profile, indent=2)}

Return a JSON object:
{{
  "overall_eligible": true/false,
  "eligibility_score": 0-100,
  "recommendation": "PROCEED" or "DO NOT BID",
  "reasoning": "Clear explanation",
  "criteria_analysis": [
    {{
      "criterion": "criterion name",
      "required": "what is required",
      "company_capability": "what company has",
      "meets_requirement": true/false/null,
      "gap": "gap description if any"
    }}
  ],
  "strengths": [],
  "disqualifiers": [],
  "conditions": []
}}

Return ONLY valid JSON."""

    result = agent(prompt)
    response_text = str(result)

    json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    return {"overall_eligible": False, "eligibility_score": 0, "recommendation": "DO NOT BID", "reasoning": response_text}
