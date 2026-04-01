from schemas import AnalyzeRequest, QueryAnalysisResult, ResearchResult
from services.openai_client import can_use_openai, generate_json, logger


def research_agent(
    payload: AnalyzeRequest,
    query_analysis: QueryAnalysisResult | None = None,
) -> ResearchResult:
    if can_use_openai():
        try:
            qa = query_analysis.dict() if query_analysis else {}

            result = generate_json(
                system_prompt=(
                    "You are a market research agent. "
                    "Produce structured market insights for a B2B exploration use case. "
                    "Return concise, practical JSON only."
                ),
                user_prompt=(
                    f"Topic: {payload.topic}\n"
                    f"Region: {payload.region}\n"
                    f"Markets: {', '.join(payload.markets)}\n"
                    f"Query analysis: {qa}\n\n"
                    "Return the most relevant target markets and 3 concise market insights."
                ),
                json_schema={
                    "type": "object",
                    "properties": {
                        "keyMarkets": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "marketInsights": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                    },
                    "required": ["keyMarkets", "marketInsights"],
                },
            )
            return ResearchResult(**result)
        except Exception as exc:
            logger.warning("research_agent fallback to local logic: %s", exc)

    keywords = query_analysis.keywords if query_analysis else []
    research_brief = query_analysis.research_brief if query_analysis else ""

    return ResearchResult(
        keyMarkets=payload.markets,
        marketInsights=[
            f"Demand for {payload.topic} is being evaluated across {', '.join(payload.markets)} in the {payload.region} region.",
            f"Priority research keywords: {', '.join(keywords) if keywords else payload.topic}.",
            f"Research brief: {research_brief if research_brief else f'Assess market potential for {payload.topic} in {payload.region}.'}",
        ],
    )