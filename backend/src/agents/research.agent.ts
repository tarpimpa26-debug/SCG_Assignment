import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { MarketResearchDto } from '../dto/market-research.dto';

@Injectable()
export class ResearchAgent {
  constructor(private readonly aiService: AiService) {}

  async analyze(input: MarketResearchDto) {
    return this.aiService.generateResearch(input);
  }
}