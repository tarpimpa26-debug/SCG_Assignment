import { Injectable } from '@nestjs/common';

@Injectable()
export class SummaryAgent {
  run(topic: string) {
    return {
      opportunities: `There may be opportunities in ${topic} through differentiation, niche targeting, and better customer experience.`,
      risks: `Key risks in ${topic} include strong competition, price pressure, and uncertain customer adoption.`,
      recommendation: `A good next step for ${topic} is to validate demand, study competitors more deeply, and test a focused go-to-market strategy.`,
    };
  }
}