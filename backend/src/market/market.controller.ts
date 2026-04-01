import { Body, Controller, Get, Post } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketResearchDto } from '../dto/market-research.dto';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Post('analyze')
  async analyze(@Body() input: MarketResearchDto) {
    return this.marketService.analyzeMarket(input);
  }

  @Get('history')
  async getHistory() {
    return this.marketService.getHistory();
  }
}