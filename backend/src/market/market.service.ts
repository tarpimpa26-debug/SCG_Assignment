import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketResearchDto } from '../dto/market-research.dto';
import { AnalysisHistory } from '../analysis/analysis-history.entity';

type AnalyzeResult = {
  topic: string;
  region: string;
  markets: string[];
  keyMarkets: string[];
  marketInsights: string[];
  recentDevelopments: string[];
  externalSignals: string[];
  overallInsight: string;
  opportunities: string[];
  risks: string[];
};

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(
    @InjectRepository(AnalysisHistory)
    private readonly analysisHistoryRepository: Repository<AnalysisHistory>,
  ) {}

  async analyzeMarket(input: MarketResearchDto) {
    const pythonAiUrl = process.env.PYTHON_AI_URL || 'http://ai-agents:8000';

    this.logger.log(
      `[analyzeMarket] start | topic=${input.topic} | region=${input.region} | markets=${input.markets.join(', ')}`,
    );

    try {
      this.logger.log(
        `[analyzeMarket] calling Python AI service -> ${pythonAiUrl}/analyze`,
      );

      const response = await fetch(`${pythonAiUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: input.topic,
          region: input.region,
          markets: input.markets,
        }),
      });

      this.logger.log(
        `[analyzeMarket] Python AI responded | status=${response.status}`,
      );

      if (!response.ok) {
        const errorText = await response.text();

        this.logger.error(
          `[analyzeMarket] Python AI service error | status=${response.status} | body=${errorText}`,
        );

        throw new BadGatewayException(
          `Python AI service error: ${response.status} ${errorText}`,
        );
      }

      const data = (await response.json()) as AnalyzeResult;

      await this.analysisHistoryRepository.save({
        topic: data.topic,
        region: data.region,
        markets: data.markets,
        keyMarkets: data.keyMarkets,
        marketInsights: data.marketInsights,
        recentDevelopments: data.recentDevelopments,
        externalSignals: data.externalSignals,
        overallInsight: data.overallInsight,
        opportunities: data.opportunities,
        risks: data.risks,
      });

      this.logger.log(
        `[analyzeMarket] success and saved to DB | topic=${data.topic} | region=${data.region} | markets=${Array.isArray(data.markets) ? data.markets.join(', ') : ''}`,
      );

      return data;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `[analyzeMarket] failed | url=${pythonAiUrl} | error=${message}`,
      );

      throw new InternalServerErrorException(
        `Failed to analyze market or save result to database`,
      );
    }
  }
}