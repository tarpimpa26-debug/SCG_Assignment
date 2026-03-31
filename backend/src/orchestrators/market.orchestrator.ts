import { Injectable } from '@nestjs/common';
import { MarketResearchDto } from '../dto/market-research.dto';
import { ResearchAgent } from '../agents/research.agent';
import { CompetitorAgent } from '../agents/competitor.agent';
import { SummaryAgent } from '../agents/summary.agent';

@Injectable()
export class MarketOrchestrator {
  constructor(
    private readonly researchAgent: ResearchAgent,
    private readonly competitorAgent: CompetitorAgent,
    private readonly summaryAgent: SummaryAgent,
  ) {}

  async execute(input: MarketResearchDto) {
    const research = await this.researchAgent.analyze(input);
    const competitor = await this.competitorAgent.analyze(input);
    const summary = await this.summaryAgent.analyze(input);

    return {
      research,
      competitor,
      summary,
    };
  }
}