import { Injectable } from '@nestjs/common';
import { MarketResearchDto } from '../dto/market-research.dto';

@Injectable()
export class AiService {
  async generateResearch(input: MarketResearchDto) {
    const { topic, region, audience } = input;

    return {
      marketOverview: `${topic} in ${region} is a growing market with increasing consumer interest and room for digital innovation.`,
      targetCustomers: `Primary customers for ${topic} in ${region} include ${audience}, urban consumers, and digitally engaged buyers.`,
      demandSignals: `Search trends, online conversations, and category expansion in ${region} suggest rising demand for ${topic}, especially among ${audience}.`,
    };
  }

  async generateCompetitor(input: MarketResearchDto) {
    const { topic, region, audience } = input;

    return {
      keyPlayers: `Key players in ${topic} within ${region} include established brands, niche startups, and fast-moving online sellers targeting ${audience}.`,
      strengths: `Competitors in ${topic} often compete on brand trust, pricing, and distribution reach across the ${region} market.`,
      gaps: `Common gaps in ${topic} for ${audience} in ${region} include weak personalization, limited differentiation, and poor customer retention.`,
    };
  }

  async generateSummary(input: MarketResearchDto) {
    const { topic, region, audience } = input;

    return {
      opportunities: [
        `${topic} for ${audience} in ${region}`,
        `${topic} for premium segment expansion in ${region}`,
        `${topic} in emerging digital channels for ${audience}`,
      ],
      risks: [
        `High competition in ${region}`,
        `Unclear willingness to pay from ${audience}`,
        `Need more validation from real users in ${region}`,
      ],
      recommendation: `Start with a narrow ${audience} segment in ${region} for ${topic}, validate demand quickly, and differentiate with a clear value proposition.`,
    };
  }
}