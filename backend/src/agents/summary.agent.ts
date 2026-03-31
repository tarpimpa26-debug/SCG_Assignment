import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { MarketResearchDto } from '../dto/market-research.dto';

type ResearchResult = {
  keyMarkets: string[];
  marketInsights: string[];
};

type CompetitorResult = {
  recentDevelopments: string[];
  externalSignals: string[];
};

type SummaryInput = {
  input: MarketResearchDto;
  research: ResearchResult;
  signals: CompetitorResult;
};

@Injectable()
export class SummaryAgent {
  constructor(private readonly aiService: AiService) {}

  async summarize({ input, research, signals }: SummaryInput) {
    return this.aiService.generateSummaryFromAgentOutputs({
      input,
      research,
      signals,
    });
  }
}