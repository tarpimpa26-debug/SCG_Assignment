from schemas import AnalyzeRequest, CompetitorResult
from services.openai_client import call_openai_json, logger


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
                "Consumer demand may vary by market, requiring localized go-to-market execution across the selected countries.",
                "Regulatory and labeling expectations may influence launch speed and product adaptation in each market.",
            ],
        )