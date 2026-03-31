import { Injectable } from '@nestjs/common';
import { MarketResearchDto } from '../dto/market-research.dto';
import { MarketOrchestrator } from '../orchestrators/market.orchestrator';

@Injectable()
export class MarketService {
  constructor(private readonly marketOrchestrator: MarketOrchestrator) {}

  async analyzeMarket(payload: MarketResearchDto) {
    const input: MarketResearchDto = {
      topic: payload.topic,
      region: payload.region || 'Thailand',
      audience: payload.audience || 'General',
    };

    const agents = await this.marketOrchestrator.execute(input);

    return {
      success: true,
      input,
      agents,
    };
  }
}