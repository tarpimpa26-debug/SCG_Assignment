from typing import List

from schemas import (
    QueryAnalysisResult,
    QueryNormalizedQuery,
    QueryOriginalInput,
)
from services.openai_client import can_use_openai, generate_json, logger


class QueryUnderstandingAgent:
    def analyze(self, topic: str, region: str, markets: List[str]) -> QueryAnalysisResult:
        clean_topic = (topic or "").strip()
        clean_region = (region or "").strip()
        clean_markets = [m.strip() for m in (markets or []) if str(m).strip()]

        if can_use_openai():
            try:
                result = generate_json(
                    system_prompt=(
                        "You are a market research query-understanding agent. "
                        "Analyze the user's market exploration request and return structured JSON only."
                    ),
                    user_prompt=(
                        f"Topic: {clean_topic}\n"
                        f"Region: {clean_region}\n"
                        f"Markets: {', '.join(clean_markets)}\n\n"
                        "Infer the likely intent, useful focus areas, normalized values, "
                        "keywords, and a concise research brief for downstream agents."
                    ),
                    json_schema={
                        "type": "object",
                        "properties": {
                            "original_input": {
                                "type": "object",
                                "properties": {
                                    "topic": {"type": "string"},
                                    "region": {"type": "string"},
                                    "markets": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                    },
                                },
                                "required": ["topic", "region", "markets"],
                            },
                            "normalized_query": {
                                "type": "object",
                                "properties": {
                                    "topic": {"type": "string"},
                                    "region": {"type": "string"},
                                    "markets": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                    },
                                },
                                "required": ["topic", "region", "markets"],
                            },
                            "intent": {"type": "string"},
                            "focus_areas": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                            "keywords": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                            "research_brief": {"type": "string"},
                        },
                        "required": [
                            "original_input",
                            "normalized_query",
                            "intent",
                            "focus_areas",
                            "keywords",
                            "research_brief",
                        ],
                    },
                )
                return QueryAnalysisResult(**result)
            except Exception as exc:
                logger.warning("QueryUnderstandingAgent fallback to local logic: %s", exc)

        keywords = self._extract_keywords(clean_topic)

        return QueryAnalysisResult(
            original_input=QueryOriginalInput(
                topic=clean_topic,
                region=clean_region,
                markets=clean_markets,
            ),
            normalized_query=QueryNormalizedQuery(
                topic=clean_topic.lower(),
                region=clean_region.lower(),
                markets=[m.lower() for m in clean_markets],
            ),
            intent="market_exploration",
            focus_areas=[
                "market overview",
                "customer needs",
                "competitor landscape",
                "opportunities",
                "risks",
                "go-to-market considerations",
            ],
            keywords=keywords,
            research_brief=self._build_research_brief(
                clean_topic,
                clean_region,
                clean_markets,
            ),
        )

    def _extract_keywords(self, topic: str) -> List[str]:
        if not topic:
            return []

        raw_parts = topic.replace("/", " ").replace("-", " ").split()
        keywords: List[str] = []

        for part in raw_parts:
            word = part.strip().lower()
            if word and word not in keywords:
                keywords.append(word)

        return keywords[:10]

    def _build_research_brief(
        self,
        topic: str,
        region: str,
        markets: List[str],
    ) -> str:
        markets_text = ", ".join(markets) if markets else "not specified"

        return (
            f"Analyze the market potential for '{topic}' "
            f"in the region '{region}' "
            f"with focus on these target markets: {markets_text}. "
            f"Cover market size or demand signals, customer pain points, "
            f"competitors, risks, and business opportunities."
        )