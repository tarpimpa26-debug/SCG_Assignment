import { Injectable } from '@nestjs/common';
import { MarketOrchestrator } from './orchestrators/market.orchestrator';

@Injectable()
export class MarketService {
  constructor(private readonly marketOrchestrator: MarketOrchestrator) {}

  exploreMarket(topic: string) {
    return this.marketOrchestrator.run(topic);
  }
}