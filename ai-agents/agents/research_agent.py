from schemas import AnalyzeRequest, ResearchResult
from services.openai_client import call_openai_json, logger


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

        normalized_key_markets = [
            market.strip() for market in result.keyMarkets if market.strip()
        ]
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
                "Distribution partnerships and local go-to-market execution can improve success across the selected markets.",
            ],
        )