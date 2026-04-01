from agents.competitor_agent import competitor_agent
from agents.research_agent import research_agent
from agents.summary_agent import summary_agent
from schemas import AnalyzeRequest, AnalyzeResponse
from services.openai_client import logger


def run_market_analysis(payload: AnalyzeRequest) -> AnalyzeResponse:
    logger.info(
        "[MarketOrchestrator] start | topic=%s | region=%s | markets=%s",
        payload.topic,
        payload.region,
        ", ".join(payload.markets),
    )

    research = research_agent(payload)
    competitor = competitor_agent(payload)
    summary = summary_agent(payload, research, competitor)

    logger.info("[MarketOrchestrator] assembled final response")

    return AnalyzeResponse(
        topic=payload.topic,
        region=payload.region,
        markets=payload.markets,
        keyMarkets=research.keyMarkets,
        marketInsights=research.marketInsights,
        recentDevelopments=competitor.recentDevelopments,
        externalSignals=competitor.externalSignals,
        overallInsight=summary.overallInsight,
        opportunities=summary.opportunities,
        risks=summary.risks,
    )