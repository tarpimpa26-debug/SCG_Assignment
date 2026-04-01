from typing import List

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    region: str = Field(..., min_length=1)
    markets: List[str] = Field(..., min_length=1)


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
    keyMarkets: List[str]
    marketInsights: List[str]
    recentDevelopments: List[str]
    externalSignals: List[str]
    overallInsight: str
    opportunities: List[str]
    risks: List[str]