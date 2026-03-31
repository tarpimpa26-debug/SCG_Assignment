import { Injectable } from '@nestjs/common';
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

  run(topic: string) {
    return {
      topic,
      agents: {
        research: this.researchAgent.run(topic),
        competitor: this.competitorAgent.run(topic),
        summary: this.summaryAgent.run(topic),
      },
    };
  }
}