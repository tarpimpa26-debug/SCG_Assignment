import { Injectable } from '@nestjs/common';
import { MarketResearchDto } from '../dto/market-research.dto';
import { MarketOrchestrator } from '../orchestrators/market.orchestrator';

@Injectable()
export class MarketService {
  constructor(private readonly marketOrchestrator: MarketOrchestrator) {}

  async analyzeMarket(input: MarketResearchDto) {
    return this.marketOrchestrator.execute(input);
  }
}