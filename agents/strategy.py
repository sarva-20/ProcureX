"""
agents/strategy.py — Agent 4: Bid Strategy Synthesizer
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


SYSTEM_PROMPT = """You are a senior bid strategist specializing in Indian government procurement.
Synthesize all available intelligence into a comprehensive bid strategy.
Always respond with valid JSON only."""


def run_strategy(extracted_requirements: dict, eligibility_report: dict, market_intelligence: dict) -> dict:
    """Agent 4: Synthesize master bid strategy from all agent outputs."""

    agent = Agent(
        model=get_model(),
        system_prompt=SYSTEM_PROMPT,
    )

    prompt = f"""Create a comprehensive bid strategy based on all analysis.

TENDER REQUIREMENTS:
{json.dumps(extracted_requirements, indent=2)}

ELIGIBILITY REPORT:
{json.dumps(eligibility_report, indent=2)}

MARKET INTELLIGENCE:
{json.dumps(market_intelligence, indent=2)}

Return a JSON object:
{{
  "bid_decision": "BID" or "NO BID" or "CONDITIONAL BID",
  "overall_score": 0-100,
  "bid_decision_rationale": "Clear explanation",
  "executive_summary": "2-3 sentence summary",
  "win_strategy": {{
    "primary_strategy": "...",
    "key_themes_for_proposal": [],
    "differentiators": []
  }},
  "pricing_recommendation": {{
    "recommended_price_inr": "...",
    "pricing_rationale": "...",
    "negotiation_floor_inr": "..."
  }},
  "compliance_checklist": [
    {{
      "item": "...",
      "status": "READY/MISSING/NEEDS PREP",
      "action_required": "..."
    }}
  ],
  "action_plan": [
    {{
      "action": "...",
      "priority": "HIGH/MEDIUM/LOW",
      "deadline": "...",
      "owner": "..."
    }}
  ],
  "red_flags": [],
  "success_factors": []
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

    return {"bid_decision": "NO BID", "overall_score": 0, "bid_decision_rationale": response_text}
