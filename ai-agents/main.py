from typing import List, Optional
import os
import json
import logging
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from openai import OpenAI

ROOT_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ROOT_ENV_PATH)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("scg-ai-agents")

app = FastAPI(title="SCG AI Agents Service")

USE_OPENAI = os.getenv("USE_OPENAI", "true").lower() == "true"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.2")

client: Optional[OpenAI] = None
if USE_OPENAI and OPENAI_API_KEY:
    client = OpenAI(api_key=OPENAI_API_KEY)
    logger.info(
        "[Startup] OpenAI client initialized | model=%s | has_api_key=%s",
        OPENAI_MODEL,
        bool(OPENAI_API_KEY),
    )
else:
    logger.warning(
        "[Startup] Running without active OpenAI client | use_openai=%s | has_api_key=%s",
        USE_OPENAI,
        bool(OPENAI_API_KEY),
    )


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

    logger.info("[%s] calling OpenAI | model=%s", label, OPENAI_MODEL)

    response = client.responses.create(
        model=OPENAI_MODEL,
        input=prompt,
    )

    output_text = (response.output_text or "").strip()

    logger.info("[%s] OpenAI responded | output_length=%s", label, len(output_text))

    if not output_text:
        raise RuntimeError(f"OpenAI returned empty output_text for {label}")

    try:
        parsed = json.loads(output_text)
        logger.info("[%s] JSON parse success", label)
        return parsed
    except json.JSONDecodeError as exc:
        logger.error("[%s] JSON parse failed | raw=%s", label, output_text)
        raise RuntimeError(f"Failed to parse JSON for {label}: {output_text}") from exc


def research_agent(input_data: AnalyzeRequest) -> ResearchResult:
    logger.info(
        "[ResearchAgent] start | topic=%s | region=%s | markets=%s",
        input_data.topic,
        input_data.region,
        ", ".join(input_data.markets),
    )

    prompt = f"""
You are ResearchAgent.

Role:
Analyze the selected business topic in the selected region and target markets.

Input:
- Topic: {input_data.topic}
- Region: {input_data.region}
- Markets: {", ".join(input_data.markets)}

Rules:
- Treat ALL selected markets as the primary focus.
- Do not replace the selected markets with unrelated countries.
- You may mention a nearby hub market only as secondary context, not as a replacement.
- The keyMarkets field must include all selected markets from the input.
- Keep the analysis business-oriented and practical.
- marketInsights should contain concise executive insights covering the selected markets.

Return ONLY valid JSON in this exact shape:
{{
  "keyMarkets": ["selected market 1", "selected market 2", "selected market 3"],
  "marketInsights": ["string", "string", "string"]
}}
    """.strip()

    try:
        parsed = call_openai_json(prompt, "ResearchAgent")
        result = ResearchResult(**parsed)

        normalized_key_markets = [market.strip() for market in result.keyMarkets if market.strip()]
        if set(normalized_key_markets) != set(input_data.markets):
            logger.warning(
                "[ResearchAgent] keyMarkets mismatch with input | returned=%s | expected=%s",
                ", ".join(normalized_key_markets),
                ", ".join(input_data.markets),
            )
            result = ResearchResult(
                keyMarkets=input_data.markets,
                marketInsights=result.marketInsights,
            )

        logger.info(
            "[ResearchAgent] success | key_markets=%s",
            ", ".join(result.keyMarkets),
        )
        return result
    except Exception as exc:
        logger.warning("[ResearchAgent] fallback to mock | error=%s", exc)
        return ResearchResult(
            keyMarkets=input_data.markets,
            marketInsights=[
                f"{input_data.topic} shows growth potential across {', '.join(input_data.markets)} in {input_data.region}.",
                f"Customer needs, pricing sensitivity, and channel structure differ across {', '.join(input_data.markets)}, so localization matters.",
                f"Distribution partnerships and local go-to-market execution can improve success across the selected markets.",
            ],
        )


def competitor_agent(input_data: AnalyzeRequest) -> CompetitorResult:
    logger.info(
        "[CompetitorAgent] start | topic=%s | region=%s | markets=%s",
        input_data.topic,
        input_data.region,
        ", ".join(input_data.markets),
    )

    prompt = f"""
You are CompetitorAgent.

Role:
Analyze competitive movement, recent developments, and external market signals.

Input:
- Topic: {input_data.topic}
- Region: {input_data.region}
- Markets: {", ".join(input_data.markets)}

Rules:
- Focus on ALL selected markets first.
- Cover competition, pricing pressure, regulatory movement, supply-demand shifts, and channel dynamics.
- Keep it suitable for a corporate market exploration report.
- recentDevelopments and externalSignals may contain as many items as needed, but keep them concise and useful.

Return ONLY valid JSON in this exact shape:
{{
  "recentDevelopments": ["string", "string", "string"],
  "externalSignals": ["string", "string", "string"]
}}
    """.strip()

    try:
        parsed = call_openai_json(prompt, "CompetitorAgent")
        result = CompetitorResult(**parsed)
        logger.info(
            "[CompetitorAgent] success | developments=%s | signals=%s",
            len(result.recentDevelopments),
            len(result.externalSignals),
        )
        return result
    except Exception as exc:
        logger.warning("[CompetitorAgent] fallback to mock | error=%s", exc)
        return CompetitorResult(
            recentDevelopments=[
                f"Recent cost and supply changes are affecting {input_data.topic} across {', '.join(input_data.markets)}.",
                f"Competitive activity in {input_data.region} is increasing through distribution expansion and pricing pressure across the selected markets.",
                f"Local channel shifts and modern trade growth may reshape how {input_data.topic} products win share in the selected countries.",
            ],
            externalSignals=[
                f"Commodity and FX movement may affect margin stability in {', '.join(input_data.markets)}.",
                f"Consumer demand may vary by market, requiring localized go-to-market execution across the selected countries.",
                f"Regulatory and labeling expectations may influence launch speed and product adaptation in each market.",
            ],
        )


def summary_agent(
    input_data: AnalyzeRequest,
    research: ResearchResult,
    competitor: CompetitorResult,
) -> SummaryResult:
    logger.info(
        "[SummaryAgent] start | topic=%s | region=%s | markets=%s",
        input_data.topic,
        input_data.region,
        ", ".join(input_data.markets),
    )

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
- Keep ALL selected markets as the main business focus.
- Make it concise, executive-level, and practical.
- Opportunities should be actionable.
- Risks should be realistic.
- opportunities and risks may contain as many items as needed, but keep them concise and useful.

Return ONLY valid JSON in this exact shape:
{{
  "overallInsight": "string",
  "opportunities": ["string", "string", "string"],
  "risks": ["string", "string", "string"]
}}
    """.strip()

    try:
        parsed = call_openai_json(prompt, "SummaryAgent")
        result = SummaryResult(**parsed)
        logger.info(
            "[SummaryAgent] success | opportunities=%s | risks=%s",
            len(result.opportunities),
            len(result.risks),
        )
        return result
    except Exception as exc:
        logger.warning("[SummaryAgent] fallback to mock | error=%s", exc)
        return SummaryResult(
            overallInsight=(
                f"{input_data.topic} appears promising across {', '.join(input_data.markets)} "
                f"within {input_data.region}, especially where the business can combine strong "
                f"market positioning, distribution execution, and careful response to competitive pressure in each selected market."
            ),
            opportunities=[
                "Prioritize entry sequencing based on demand, channel fit, and competitive intensity in each selected market.",
                "Build local partnerships to improve distribution speed and reduce market-entry friction across the region.",
                "Differentiate through pricing discipline, product positioning, and supply reliability tailored to each country.",
            ],
            risks=[
                "Competitive intensity may compress margins and slow share gain in some selected markets.",
                "Cost volatility and regulatory changes may affect launch timing and profitability across countries.",
                "Demand patterns may differ across markets, requiring localized execution rather than a single regional approach.",
            ],
        )


@app.get("/health")
def health_check():
    logger.info("[Health] check")
    return {
        "status": "ok",
        "use_openai": USE_OPENAI,
        "model": OPENAI_MODEL,
        "has_api_key": bool(OPENAI_API_KEY),
    }


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_market(payload: AnalyzeRequest):
    logger.info(
        "[/analyze] request received | topic=%s | region=%s | markets=%s",
        payload.topic,
        payload.region,
        ", ".join(payload.markets),
    )

    if not payload.topic.strip():
        logger.warning("[/analyze] validation failed | topic missing")
        raise HTTPException(status_code=400, detail="Topic is required.")

    if not payload.region.strip():
        logger.warning("[/analyze] validation failed | region missing")
        raise HTTPException(status_code=400, detail="Region is required.")

    cleaned_markets = [market.strip() for market in payload.markets if market.strip()]
    if not cleaned_markets:
        logger.warning("[/analyze] validation failed | markets missing")
        raise HTTPException(status_code=400, detail="At least one market is required.")

    normalized_payload = AnalyzeRequest(
        topic=payload.topic.strip(),
        region=payload.region.strip(),
        markets=cleaned_markets,
    )

    logger.info(
        "[/analyze] normalized payload | topic=%s | region=%s | markets=%s",
        normalized_payload.topic,
        normalized_payload.region,
        ", ".join(normalized_payload.markets),
    )

    research = research_agent(normalized_payload)
    competitor = competitor_agent(normalized_payload)
    summary = summary_agent(normalized_payload, research, competitor)

    logger.info("[/analyze] completed successfully")

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