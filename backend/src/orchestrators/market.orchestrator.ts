import { Injectable } from '@nestjs/common';
import { ResearchAgent } from '../agents/research.agent';
import { CompetitorAgent } from '../agents/competitor.agent';
import { SummaryAgent } from '../agents/summary.agent';
import { MarketResearchDto } from '../dto/market-research.dto';

@Injectable()
export class MarketOrchestrator {
  constructor(
    private readonly researchAgent: ResearchAgent,
    private readonly competitorAgent: CompetitorAgent,
    private readonly summaryAgent: SummaryAgent,
  ) {}

  async execute(input: MarketResearchDto) {
    const research = await this.researchAgent.analyze(input);
    const signals = await this.competitorAgent.analyze(input);
    const summary = await this.summaryAgent.summarize({
      input,
      research,
      signals,
    });

    return {
      topic: input.topic,
      region: input.region,
      markets: input.markets,
      keyMarkets: research.keyMarkets,
      marketInsights: research.marketInsights,
      recentDevelopments: signals.recentDevelopments,
      externalSignals: signals.externalSignals,
      overallInsight: summary.overallInsight,
      opportunities: summary.opportunities,
      risks: summary.risks,
    };
  }
}