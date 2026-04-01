import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketModule } from './market/market.module';
import { AnalysisHistory } from './analysis/analysis-history.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'analysis_history.sqlite',
      entities: [AnalysisHistory],
      synchronize: true,
    }),
    MarketModule,
  ],
})
export class AppModule {}