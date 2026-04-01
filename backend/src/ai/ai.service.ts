import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { MarketResearchDto } from '../dto/market-research.dto';

type ResearchResult = {
  keyMarkets: string[];
  marketInsights: string[];
};

type CompetitorResult = {
  recentDevelopments: string[];
  externalSignals: string[];
};

type SummaryResult = {
  overallInsight: string;
  opportunities: string[];
  risks: string[];
};

type SummaryAgentInput = {
  input: MarketResearchDto;
  research: ResearchResult;
  signals: CompetitorResult;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI | null;
  private readonly model = process.env.OPENAI_MODEL || 'gpt-5.2';
  private readonly useOpenAI =
    (process.env.USE_OPENAI || 'true').toLowerCase() === 'true';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!this.useOpenAI) {
      this.logger.warn('USE_OPENAI=false, running in mock mode');
      this.client = null;
      return;
    }

    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY is missing, running in mock mode');
      this.client = null;
      return;
    }

    this.client = new OpenAI({
      apiKey,
      timeout: 30_000,
      maxRetries: 1,
      logLevel: 'info',
    });

    this.logger.log(
      `OpenAI client initialized | model=${this.model} | keyPrefix=${apiKey.slice(0, 12)} | keySuffix=${apiKey.slice(-6)}`,
    );
  }

  async generateResearch(input: MarketResearchDto): Promise<ResearchResult> {
    const prompt = `
You are a market research agent.

Task:
Analyze the business topic, region, and target markets below.

Input:
- Topic: ${input.topic}
- Region: ${input.region}
- Markets: ${input.markets.join(', ')}

Instructions:
- Use the provided markets as the main target countries/markets for analysis.
- Region is the broader business area.
- Do not replace the given markets with unrelated countries.
- Focus on demand potential, customer relevance, and market attractiveness.
- Keep the output practical for a corporate market exploration report.

Return ONLY valid JSON with exactly this shape:
{
  "keyMarkets": ["string", "string", "string"],
  "marketInsights": ["string", "string", "string"]
}
    `.trim();

    this.logger.log(
      `[Research] start | topic=${input.topic} | region=${input.region} | markets=${input.markets.join(', ')}`,
    );

    try {
      const text = await this.generateText(prompt, 'research');
      const parsed = this.parseJson<ResearchResult>(text, 'research');
      this.logger.log('[Research] OpenAI success');
      return parsed;
    } catch (error: any) {
      this.logger.error(
        `[Research] OpenAI failed, fallback to mock | ${error?.message || error}`,
      );
      return this.mockResearch(input);
    }
  }
  
  async generateCompetitor(
    input: MarketResearchDto,
  ): Promise<CompetitorResult> {
    const prompt = `
You are an external signals and competitor analysis agent.

Task:
Identify recent developments, competitor dynamics, signals, or notable events related to the business topic, region, and target markets below.

Input:
- Topic: ${input.topic}
- Region: ${input.region}
- Markets: ${input.markets.join(', ')}

Instructions:
- Focus primarily on the provided markets.
- Region is the broader geographic context.
- Keep findings relevant to competition, pricing pressure, market movement, regulation, and demand shifts.
- Make the result suitable for business expansion planning.

Return ONLY valid JSON with exactly this shape:
{
  "recentDevelopments": ["string", "string", "string"],
  "externalSignals": ["string", "string", "string"]
}
    `.trim();

    this.logger.log(
      `[Signals] start | topic=${input.topic} | region=${input.region} | markets=${input.markets.join(', ')}`,
    );

    try {
      const text = await this.generateText(prompt, 'signals');
      const parsed = this.parseJson<CompetitorResult>(text, 'signals');
      this.logger.log('[Signals] OpenAI success');
      return parsed;
    } catch (error: any) {
      this.logger.error(
        `[Signals] OpenAI failed, fallback to mock | ${error?.message || error}`,
      );
      return this.mockCompetitor(input);
    }
  }

  async generateSummaryFromAgentOutputs({
    input,
    research,
    signals,
  }: SummaryAgentInput): Promise<SummaryResult> {
    const prompt = `
You are a senior strategy summary agent.

Task:
Create a final executive-level market exploration summary using:
1) the original business input
2) the research agent findings
3) the external signals / competitor agent findings

Original Input:
- Topic: ${input.topic}
- Region: ${input.region}
- Markets: ${input.markets.join(', ')}

Research Agent Output:
- Key Markets: ${research.keyMarkets.join(' | ')}
- Market Insights: ${research.marketInsights.join(' | ')}

External Signals Agent Output:
- Recent Developments: ${signals.recentDevelopments.join(' | ')}
- External Signals: ${signals.externalSignals.join(' | ')}

Instructions:
- Synthesize the agent outputs into one coherent business summary.
- Do not repeat the same sentence structure from the earlier agent outputs.
- Focus on executive-level clarity, business opportunity, and strategic caution.
- Make opportunities practical and relevant to the selected markets.
- Make risks realistic and tied to market entry or expansion.

Return ONLY valid JSON with exactly this shape:
{
  "overallInsight": "string",
  "opportunities": ["string", "string", "string"],
  "risks": ["string", "string", "string"]
}
    `.trim();

    this.logger.log(
      `[Summary] start | topic=${input.topic} | region=${input.region} | markets=${input.markets.join(', ')}`,
    );

    try {
      const text = await this.generateText(prompt, 'summary');
      const parsed = this.parseJson<SummaryResult>(text, 'summary');
      this.logger.log('[Summary] OpenAI success');
      return parsed;
    } catch (error: any) {
      this.logger.error(
        `[Summary] OpenAI failed, fallback to mock | ${error?.message || error}`,
      );
      return this.mockSummaryFromAgentOutputs({
        input,
        research,
        signals,
      });
    }
  }

  private async generateText(
    prompt: string,
    label: string,
  ): Promise<string> {
    if (!this.client) {
      throw new Error(`OpenAI client unavailable for ${label}`);
    }

    this.logger.log(`[${label}] sending request to OpenAI`);

    const response = await this.client.responses.create({
      model: this.model,
      input: prompt,
    });

    const outputText = response.output_text?.trim();

    this.logger.log(
      `[${label}] response received | outputLength=${outputText?.length ?? 0}`,
    );

    if (!outputText) {
      throw new Error(`OpenAI returned empty output_text for ${label}`);
    }

    return outputText;
  }

  private parseJson<T>(text: string, label: string): T {
    try {
      return JSON.parse(text) as T;
    } catch (error) {
      this.logger.error(`[${label}] JSON parse failed | raw=${text}`);
      throw new Error(`Failed to parse JSON for ${label}`);
    }
  }

  private mockResearch(input: MarketResearchDto): ResearchResult {
    const topic = input.topic;
    const region = input.region;
    const markets = input.markets;

    return {
      keyMarkets: markets.length ? markets : [`Primary markets in ${region}`],
      marketInsights: [
        `${topic} shows market potential across ${markets.join(', ')} within the broader ${region} region.`,
        `Buyers in ${markets.join(', ')} are likely to value pricing, supply reliability, and product quality for ${topic}.`,
        `Distributor partnerships and digital channels can improve reach for ${topic} across the selected markets in ${region}.`,
      ],
    };
  }

  private mockCompetitor(input: MarketResearchDto): CompetitorResult {
    const topic = input.topic;
    const region = input.region;
    const markets = input.markets;

    return {
      recentDevelopments: [
        `Recent policy and trade movements may affect ${topic} across ${markets.join(', ')}.`,
        `Input cost volatility and supply chain shifts are shaping ${topic} opportunities in ${region}.`,
        `New entrants and local distributors are expanding in ${topic}-related categories across the selected markets.`,
      ],
      externalSignals: [
        `Business signals in ${markets.join(', ')} suggest close attention to cost, availability, and local demand conditions.`,
        `Regional economic conditions in ${region} may affect expansion timing and buyer confidence.`,
        `Sustainability and traceability expectations may become stronger purchase factors across these target markets.`,
      ],
    };
  }

  private mockSummaryFromAgentOutputs({
    input,
    research,
    signals,
  }: SummaryAgentInput): SummaryResult {
    const topic = input.topic;
    const region = input.region;
    const markets = input.markets;

    return {
      overallInsight: `${topic} appears promising across ${markets.join(', ')} within ${region}, especially where the business can build on demand potential, strengthen distribution coverage, and respond carefully to competitive and external market signals.`,
      opportunities: [
        `Prioritize entry or expansion in markets showing stronger demand relevance such as ${research.keyMarkets.join(', ')}`,
        `Use distributor partnerships and local market validation to accelerate go-to-market execution`,
        `Differentiate through supply reliability, pricing discipline, and market-specific positioning`,
      ],
      risks: [
        `Competitive and channel pressure may increase in selected target markets`,
        `External volatility, including cost movement and policy shifts, may affect timing and margins`,
        `Demand conditions may vary across ${markets.join(', ')}, requiring localized execution`,
      ],
    };
  }
}