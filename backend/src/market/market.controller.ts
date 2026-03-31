import { Body, Controller, Post } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketResearchDto } from '../dto/market-research.dto';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Post('analyze')
  async analyze(@Body() payload: MarketResearchDto) {
    return this.marketService.analyzeMarket(payload);
  }
}