from typing import List

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    region: str = Field(..., min_length=1)
    markets: List[str] = Field(..., min_length=1)


class QueryOriginalInput(BaseModel):
    topic: str
    region: str
    markets: List[str]


class QueryNormalizedQuery(BaseModel):
    topic: str
    region: str
    markets: List[str]


class QueryAnalysisResult(BaseModel):
    original_input: QueryOriginalInput
    normalized_query: QueryNormalizedQuery
    intent: str
    focus_areas: List[str]
    keywords: List[str]
    research_brief: str


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
    query_analysis: QueryAnalysisResult
    keyMarkets: List[str]
    marketInsights: List[str]
    recentDevelopments: List[str]
    externalSignals: List[str]
    overallInsight: str
    opportunities: List[str]
    risks: List[str]