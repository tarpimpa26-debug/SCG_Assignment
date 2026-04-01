import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { MarketResearchDto } from '../dto/market-research.dto';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

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

      const data = await response.json();

      this.logger.log(
        `[analyzeMarket] success | topic=${data.topic} | region=${data.region} | markets=${Array.isArray(data.markets) ? data.markets.join(', ') : ''}`,
      );

      return data;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `[analyzeMarket] failed to connect to Python AI service | url=${pythonAiUrl} | error=${message}`,
      );

      throw new InternalServerErrorException(
        `Failed to connect to Python AI service at ${pythonAiUrl}`,
      );
    }
  }
}