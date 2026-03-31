from typing import List, Optional
import os
import json

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from openai import OpenAI

load_dotenv()

app = FastAPI(title="SCG AI Agents Service")

USE_OPENAI = os.getenv("USE_OPENAI", "true").lower() == "true"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.2")

client: Optional[OpenAI] = None
if USE_OPENAI and OPENAI_API_KEY:
    client = OpenAI(api_key=OPENAI_API_KEY)


class AnalyzeRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    region: str = Field(..., min_length=1)
    markets: List[str] = Field(..., min_length=1)


class ResearchResult(BaseModel):
    keyMarkets: List[str]
    marketInsights: List[str]


class CompetitorResult(BaseModel):
    recentDevelopments: List[str]
    externalSignals: List[str]


class SummaryResult(BaseModel):
    overallInsight: str
    opportunities: List[str]
    risks: List[str]


class AnalyzeResponse(BaseModel):
    topic: str
    region: str
    markets: List[str]
    keyMarkets: List[str]
    marketInsights: List[str]
    recentDevelopments: List[str]
    externalSignals: List[str]
    overallInsight: str
    opportunities: List[str]
    risks: List[str]


def call_openai_json(prompt: str, label: str) -> dict:
    if not client:
      raise RuntimeError(f"OpenAI client unavailable for {label}")

    response = client.responses.create(
        model=OPENAI_MODEL,
        input=prompt,
    )

    output_text = (response.output_text or "").strip()
    if not output_text:
        raise RuntimeError(f"OpenAI returned empty output_text for {label}")

    try:
        return json.loads(output_text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Failed to parse JSON for {label}: {output_text}") from exc


def research_agent(input_data: AnalyzeRequest) -> ResearchResult:
    prompt = f"""
You are ResearchAgent.

Role:
Analyze the selected business topic in the selected region and target markets.

Input:
- Topic: {input_data.topic}
- Region: {input_data.region}
- Markets: {", ".join(input_data.markets)}

Rules:
- Treat the selected markets as the primary focus.
- Do not replace the selected markets with unrelated countries.
- You may mention a nearby hub market only as secondary context, not as a replacement.
- Keep the analysis business-oriented and practical.

Return ONLY valid JSON in this exact shape:
{{
  "keyMarkets": ["string", "string", "string"],
  "marketInsights": ["string", "string", "string"]
}}
    """.strip()

    try:
        parsed = call_openai_json(prompt, "research")
        return ResearchResult(**parsed)
    except Exception:
        return ResearchResult(
            keyMarkets=input_data.markets[:3],
            marketInsights=[
                f"{input_data.topic} shows growth potential across {', '.join(input_data.markets)} in {input_data.region}.",
                f"Customers in the selected markets are likely to value quality, pricing, and reliable supply for {input_data.topic}.",
                f"Distribution partnerships and local channel strategy can improve entry success for {input_data.topic}.",
            ],
        )


def competitor_agent(input_data: AnalyzeRequest) -> CompetitorResult:
    prompt = f"""
You are CompetitorAgent.

Role:
Analyze competitive movement, recent developments, and external market signals.

Input:
- Topic: {input_data.topic}
- Region: {input_data.region}
- Markets: {", ".join(input_data.markets)}

Rules:
- Focus on the selected markets first.
- Cover competition, pricing pressure, regulatory movement, supply-demand shifts, and channel dynamics.
- Keep it suitable for a corporate market exploration report.

Return ONLY valid JSON in this exact shape:
{{
  "recentDevelopments": ["string", "string", "string"],
  "externalSignals": ["string", "string", "string"]
}}
    """.strip()

    try:
        parsed = call_openai_json(prompt, "competitor")
        return CompetitorResult(**parsed)
    except Exception:
        return CompetitorResult(
            recentDevelopments=[
                f"Recent cost and supply changes are affecting {input_data.topic} across {', '.join(input_data.markets)}.",
                f"Competitive activity in {input_data.region} is increasing through distribution expansion and pricing pressure.",
                f"Local channel shifts and modern trade growth may reshape how {input_data.topic} products win share.",
            ],
            externalSignals=[
                f"Commodity and FX movement may affect margin stability in the selected markets.",
                f"Consumer demand may vary by market, requiring localized go-to-market execution.",
                f"Regulatory and labeling expectations may influence launch speed and product adaptation.",
            ],
        )


def summary_agent(
    input_data: AnalyzeRequest,
    research: ResearchResult,
    competitor: CompetitorResult,
) -> SummaryResult:
    prompt = f"""
You are SummaryAgent.

Role:
Create the final executive summary by synthesizing the outputs from ResearchAgent and CompetitorAgent.

Original Input:
- Topic: {input_data.topic}
- Region: {input_data.region}
- Markets: {", ".join(input_data.markets)}

ResearchAgent Output:
- Key Markets: {" | ".join(research.keyMarkets)}
- Market Insights: {" | ".join(research.marketInsights)}

CompetitorAgent Output:
- Recent Developments: {" | ".join(competitor.recentDevelopments)}
- External Signals: {" | ".join(competitor.externalSignals)}

Rules:
- Synthesize, do not just copy earlier outputs.
- Keep the selected markets as the main business focus.
- Make it concise, executive-level, and practical.
- Opportunities should be actionable.
- Risks should be realistic.

Return ONLY valid JSON in this exact shape:
{{
  "overallInsight": "string",
  "opportunities": ["string", "string", "string"],
  "risks": ["string", "string", "string"]
}}
    """.strip()

    try:
        parsed = call_openai_json(prompt, "summary")
        return SummaryResult(**parsed)
    except Exception:
        return SummaryResult(
            overallInsight=(
                f"{input_data.topic} appears promising across {', '.join(input_data.markets)} "
                f"within {input_data.region}, especially where the business can combine strong "
                f"market positioning, distribution execution, and careful response to competitive pressure."
            ),
            opportunities=[
                f"Prioritize entry in the selected markets with the strongest channel fit and demand profile.",
                f"Build local partnerships to improve distribution speed and reduce market-entry friction.",
                f"Differentiate through pricing discipline, product positioning, and supply reliability.",
            ],
            risks=[
                f"Competitive intensity may compress margins and slow share gain.",
                f"Cost volatility and regulatory changes may affect launch timing and profitability.",
                f"Demand patterns may differ across markets, requiring localized execution.",
            ],
        )


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "use_openai": USE_OPENAI,
        "model": OPENAI_MODEL,
        "has_api_key": bool(OPENAI_API_KEY),
    }


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_market(payload: AnalyzeRequest):
    if not payload.topic.strip():
        raise HTTPException(status_code=400, detail="Topic is required.")

    if not payload.region.strip():
        raise HTTPException(status_code=400, detail="Region is required.")

    cleaned_markets = [market.strip() for market in payload.markets if market.strip()]
    if not cleaned_markets:
        raise HTTPException(status_code=400, detail="At least one market is required.")

    normalized_payload = AnalyzeRequest(
        topic=payload.topic.strip(),
        region=payload.region.strip(),
        markets=cleaned_markets,
    )

    research = research_agent(normalized_payload)
    competitor = competitor_agent(normalized_payload)
    summary = summary_agent(normalized_payload, research, competitor)

    return AnalyzeResponse(
        topic=normalized_payload.topic,
        region=normalized_payload.region,
        markets=normalized_payload.markets,
        keyMarkets=research.keyMarkets,
        marketInsights=research.marketInsights,
        recentDevelopments=competitor.recentDevelopments,
        externalSignals=competitor.externalSignals,
        overallInsight=summary.overallInsight,
        opportunities=summary.opportunities,
        risks=summary.risks,
    )