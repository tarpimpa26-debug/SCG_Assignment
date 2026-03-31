import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarketModule } from './market/market.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MarketModule,
  ],
})
export class AppModule {}