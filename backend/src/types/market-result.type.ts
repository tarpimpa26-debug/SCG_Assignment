export type MarketResult = {
  topic: string;
  generatedAt: string;
  agentCount: number;
  source: 'mock-agents';
  agents: {
    research: {
      marketOverview: string;
      targetCustomers: string;
      demandSignals: string;
    };
    competitor: {
      keyPlayers: string;
      strengths: string;
      gaps: string;
    };
    summary: {
      opportunities: string;
      risks: string;
      recommendation: string;
    };
  };
};