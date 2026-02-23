"""
agents/strategy.py — Agent 4: Bid Strategy Synthesizer
Master agent that synthesizes all previous agents' outputs into an actionable bid strategy.
"""

import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from dotenv import load_dotenv

load_dotenv()

STRATEGY_PROMPT = PromptTemplate(
    input_variables=["tender_requirements", "eligibility_report", "market_intelligence"],
    template="""
You are a senior bid strategy consultant specializing in Indian government tenders.
Synthesize all analysis into a comprehensive, actionable bid strategy.

TENDER REQUIREMENTS:
{tender_requirements}

ELIGIBILITY ASSESSMENT:
{eligibility_report}

MARKET INTELLIGENCE:
{market_intelligence}

Create the master bid strategy report as JSON:
{{
  "executive_summary": "...",
  "bid_decision": "BID / NO BID / CONDITIONAL BID",
  "bid_decision_rationale": "...",
  "win_strategy": {{
    "primary_strategy": "...",
    "value_proposition": "...",
    "key_themes_for_proposal": [],
    "differentiators": []
  }},
  "proposal_structure": [
    {{
      "section": "...",
      "key_points": [],
      "tips": "..."
    }}
  ],
  "pricing_recommendation": {{
    "bid_amount_inr": "...",
    "justification": "...",
    "discount_strategy": "..."
  }},
  "compliance_checklist": [
    {{
      "item": "...",
      "status": "READY / NEEDS PREP / MISSING",
      "action_required": "..."
    }}
  ],
  "action_plan": [
    {{
      "priority": "HIGH/MEDIUM/LOW",
      "action": "...",
      "deadline": "...",
      "owner": "..."
    }}
  ],
  "red_flags": [],
  "success_factors": [],
  "overall_score": 0-100
}}

Return ONLY valid JSON.
"""
)


def run_strategy(
    extracted_requirements: dict,
    eligibility_report: dict,
    market_intelligence: dict
) -> dict:
    """
    Agent 4: Master bid strategy synthesis.
    """
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.4
    )

    chain = LLMChain(llm=llm, prompt=STRATEGY_PROMPT)
    result = chain.run(
        tender_requirements=json.dumps(extracted_requirements, indent=2),
        eligibility_report=json.dumps(eligibility_report, indent=2),
        market_intelligence=json.dumps(market_intelligence, indent=2)
    )

    import re
    json_match = re.search(r'\{.*\}', result, re.DOTALL)
    if json_match:
        return json.loads(json_match.group())

    return {"raw_result": result, "error": "JSON parse failed"}
