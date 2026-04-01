import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { AnalysisHistory } from '../analysis/analysis-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AnalysisHistory])],
  controllers: [MarketController],
  providers: [MarketService],
})
export class MarketModule {}