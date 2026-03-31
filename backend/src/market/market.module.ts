import { Module } from '@nestjs/common';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { ResearchAgent } from '../agents/research.agent';
import { CompetitorAgent } from '../agents/competitor.agent';
import { SummaryAgent } from '../agents/summary.agent';
import { MarketOrchestrator } from '../orchestrators/market.orchestrator';
import { AiService } from '../ai/ai.service';

@Module({
  controllers: [MarketController],
  providers: [
    MarketService,
    MarketOrchestrator,
    ResearchAgent,
    CompetitorAgent,
    SummaryAgent,
    AiService,
  ],
})
export class MarketModule {}