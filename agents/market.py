"""
agents/market.py — Agent 3: Market Intelligence
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
            "temperature": 0.2,
        }
    )


SYSTEM_PROMPT = """You are a market intelligence expert for Indian government procurement.
Analyze competitive landscape, pricing, and risks for government tenders.
Always respond with valid JSON only."""


def run_market_intelligence(extracted_requirements: dict, eligibility_report: dict) -> dict:
    """Agent 3: Market intelligence and risk analysis."""

    agent = Agent(
        model=get_model(),
        system_prompt=SYSTEM_PROMPT,
    )

    prompt = f"""Analyze market intelligence for this government tender.

TENDER DETAILS:
{json.dumps(extracted_requirements, indent=2)}

ELIGIBILITY STATUS:
{json.dumps(eligibility_report, indent=2)}

Return a JSON object:
{{
  "market_analysis": {{
    "competitive_intensity": "LOW/MEDIUM/HIGH",
    "typical_competitors": [],
    "market_size_estimate": "...",
    "historical_bid_patterns": "..."
  }},
  "pricing_intelligence": {{
    "estimated_market_rate_inr": "...",
    "recommended_bid_price_inr": "...",
    "pricing_strategy": "...",
    "margin_estimate_percent": 0
  }},
  "win_probability": 0-100,
  "risk_assessment": {{
    "overall_risk_score": 0-100,
    "risks": [
      {{
        "risk_type": "...",
        "severity": "LOW/MEDIUM/HIGH",
        "description": "...",
        "mitigation": "..."
      }}
    ]
  }},
  "opportunity_score": 0-100,
  "key_insights": []
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

    return {"win_probability": 0, "risk_assessment": {"overall_risk_score": 100, "risks": []}, "market_analysis": {"competitive_intensity": "UNKNOWN"}}
