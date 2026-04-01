from schemas import AnalyzeRequest, CompetitorResult, QueryAnalysisResult
from services.openai_client import can_use_openai, generate_json, logger


def competitor_agent(
    payload: AnalyzeRequest,
    query_analysis: QueryAnalysisResult | None = None,
) -> CompetitorResult:
    if can_use_openai():
        try:
            qa = query_analysis.dict() if query_analysis else {}

            result = generate_json(
                system_prompt=(
                    "You are a competitor intelligence agent. "
                    "Return concise structured competitor observations and external signals in JSON only."
                ),
                user_prompt=(
                    f"Topic: {payload.topic}\n"
                    f"Region: {payload.region}\n"
                    f"Markets: {', '.join(payload.markets)}\n"
                    f"Query analysis: {qa}\n\n"
                    "Return 3 recent developments and 3 external signals relevant to competitor tracking."
                ),
                json_schema={
                    "type": "object",
                    "properties": {
                        "recentDevelopments": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "externalSignals": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                    },
                    "required": ["recentDevelopments", "externalSignals"],
                },
            )
            return CompetitorResult(**result)
        except Exception as exc:
            logger.warning("competitor_agent fallback to local logic: %s", exc)

    keywords = query_analysis.keywords if query_analysis else []
    normalized_markets = query_analysis.normalized_query.markets if query_analysis else []

    return CompetitorResult(
        recentDevelopments=[
            f"Competitor activity around {payload.topic} should be monitored in {', '.join(payload.markets)}.",
            f"Regional players in {payload.region} may already be expanding related offerings.",
            f"Normalized market focus for tracking: {', '.join(normalized_markets) if normalized_markets else ', '.join(payload.markets)}.",
        ],
        externalSignals=[
            f"Track investment, partnerships, and product launches related to {payload.topic}.",
            f"Watch keywords such as: {', '.join(keywords) if keywords else payload.topic}.",
            f"Monitor policy, construction, infrastructure, and sustainability signals across {payload.region}.",
        ],
    )