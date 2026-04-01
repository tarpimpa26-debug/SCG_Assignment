from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException

from agents.competitor_agent import competitor_agent
from agents.research_agent import research_agent
from agents.summary_agent import summary_agent
from schemas import AnalyzeRequest, AnalyzeResponse
from services.openai_client import (
    OPENAI_MODEL,
    OPENAI_API_KEY,
    USE_OPENAI,
    logger,
)

ROOT_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ROOT_ENV_PATH)

app = FastAPI(title="SCG AI Agents Service")


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