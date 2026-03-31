import { Injectable } from '@nestjs/common';

@Injectable()
export class CompetitorAgent {
  run(topic: string) {
    return {
      keyPlayers: `Main competitors in ${topic} may include established brands, local players, and new entrants.`,
      strengths: `Competitors may compete on pricing, distribution, product quality, and brand recognition.`,
      gaps: `Possible market gaps in ${topic} include underserved niches, better digital experience, or clearer positioning.`,
    };
  }
}