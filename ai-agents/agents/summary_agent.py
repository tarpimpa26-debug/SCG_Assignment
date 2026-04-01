from schemas import AnalyzeRequest, CompetitorResult, ResearchResult, SummaryResult
from services.openai_client import call_openai_json, logger


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
                "market positioning, distribution execution, and careful response to competitive pressure in each selected market."
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