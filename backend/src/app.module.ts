import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { ResearchAgent } from './agents/research.agent';
import { CompetitorAgent } from './agents/competitor.agent';
import { SummaryAgent } from './agents/summary.agent';
import { MarketOrchestrator } from './orchestrators/market.orchestrator';

@Module({
  imports: [],
  controllers: [AppController, MarketController],
  providers: [
    AppService,
    MarketService,
    ResearchAgent,
    CompetitorAgent,
    SummaryAgent,
    MarketOrchestrator
  ],
})
export class AppModule {}