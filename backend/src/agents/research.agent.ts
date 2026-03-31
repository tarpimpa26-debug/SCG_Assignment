import { Injectable } from '@nestjs/common';

@Injectable()
export class ResearchAgent {
  run(topic: string) {
    return {
      marketOverview: `${topic} is a growing market with customer demand and multiple entry opportunities.`,
      targetCustomers: `Potential customers for ${topic} include mass market, niche buyers, and digital-first consumers.`,
      demandSignals: `Demand for ${topic} may be influenced by trends, convenience, pricing, and brand perception.`,
    };
  }
}