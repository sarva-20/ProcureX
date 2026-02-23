"""
agents/market.py — Agent 3: Market Intelligence & Competitive Analysis
Generates competitive landscape, pricing benchmarks, and risk scoring.
"""

import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from dotenv import load_dotenv

load_dotenv()

MARKET_PROMPT = PromptTemplate(
    input_variables=["tender_requirements", "eligibility_report"],
    template="""
You are a government procurement market intelligence analyst specializing in Indian government tenders (GeM, CPPP, NIC portals).

TENDER REQUIREMENTS:
{tender_requirements}

ELIGIBILITY ASSESSMENT:
{eligibility_report}

Analyze the competitive landscape and return a JSON object:
{{
  "market_analysis": {{
    "typical_competitors": [],
    "competitive_intensity": "LOW/MEDIUM/HIGH",
    "market_size_estimate": "...",
    "our_competitive_position": "..."
  }},
  "pricing_intelligence": {{
    "estimated_budget_range_inr": "...",
    "recommended_bid_price_inr": "...",
    "pricing_strategy": "...",
    "l1_strategy_notes": "..."
  }},
  "risk_assessment": {{
    "overall_risk_score": 0-100,
    "risks": [
      {{
        "risk_type": "...",
        "description": "...",
        "severity": "LOW/MEDIUM/HIGH",
        "mitigation": "..."
      }}
    ]
  }},
  "win_probability": 0-100,
  "key_differentiators_to_highlight": [],
  "market_trends": []
}}

Base your analysis on knowledge of Indian government procurement patterns.
Return ONLY valid JSON.
"""
)


def run_market_intelligence(
    extracted_requirements: dict,
    eligibility_report: dict
) -> dict:
    """
    Agent 3: Market intelligence, pricing, and risk scoring.
    """
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.3
    )

    chain = LLMChain(llm=llm, prompt=MARKET_PROMPT)
    result = chain.run(
        tender_requirements=json.dumps(extracted_requirements, indent=2),
        eligibility_report=json.dumps(eligibility_report, indent=2)
    )

    import re
    json_match = re.search(r'\{.*\}', result, re.DOTALL)
    if json_match:
        return json.loads(json_match.group())

    return {"raw_result": result, "error": "JSON parse failed"}
