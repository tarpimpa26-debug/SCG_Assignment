from schemas import (
    AnalyzeRequest,
    CompetitorResult,
    QueryAnalysisResult,
    ResearchResult,
    SummaryResult,
)
from services.openai_client import can_use_openai, generate_json, logger


def summary_agent(
    payload: AnalyzeRequest,
    research: ResearchResult,
    competitor: CompetitorResult,
    query_analysis: QueryAnalysisResult | None = None,
) -> SummaryResult:
    if can_use_openai():
        try:
            qa = query_analysis.dict() if query_analysis else {}

            result = generate_json(
                system_prompt=(
                    "You are a summary agent for a market exploration system. "
                    "Synthesize the outputs into a concise executive summary. "
                    "Return JSON only."
                ),
                user_prompt=(
                    f"Topic: {payload.topic}\n"
                    f"Region: {payload.region}\n"
                    f"Markets: {', '.join(payload.markets)}\n"
                    f"Query analysis: {qa}\n"
                    f"Research result: {research.dict()}\n"
                    f"Competitor result: {competitor.dict()}\n\n"
                    "Return one overall insight, 3 opportunities, and 3 risks."
                ),
                json_schema={
                    "type": "object",
                    "properties": {
                        "overallInsight": {"type": "string"},
                        "opportunities": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "risks": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                    },
                    "required": ["overallInsight", "opportunities", "risks"],
                },
            )
            return SummaryResult(**result)
        except Exception as exc:
            logger.warning("summary_agent fallback to local logic: %s", exc)

    focus_areas = query_analysis.focus_areas if query_analysis else []
    intent = query_analysis.intent if query_analysis else "market exploration"

    return SummaryResult(
        overallInsight=(
            f"{payload.topic} shows potential across {', '.join(payload.markets)} in {payload.region}. "
            f"This analysis is framed under the intent '{intent}'"
            f"{' with focus on ' + ', '.join(focus_areas) if focus_areas else ''}."
        ),
        opportunities=[
            f"Expand into priority markets: {', '.join(research.keyMarkets)}.",
            f"Use market signals to position {payload.topic} around unmet customer needs.",
            "Differentiate against regional competitors through localized go-to-market strategy.",
        ],
        risks=[
            f"Competitive pressure may increase in {payload.region}.",
            "Market demand may vary by country and segment.",
            "External factors such as regulation, pricing, and supply chain shifts may affect growth.",
        ],
    )