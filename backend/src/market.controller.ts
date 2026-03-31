import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { MarketService } from './market.service';

@Controller('api/market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('explore')
  explore(@Query('topic') topic: string) {
    if (!topic?.trim()) {
      throw new BadRequestException('Topic is required');
    }

    return this.marketService.exploreMarket(topic);
  }
}