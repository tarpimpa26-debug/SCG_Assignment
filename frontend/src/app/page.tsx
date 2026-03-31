'use client';

import { useState } from 'react';
import styles from './page.module.css';

type MarketResult = {
  topic: string;
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

const sampleTopics = [
  'Coffee',
  'EV Charging',
  'Pet Food',
  'Skincare',
  'Smart Home',
  'Fitness App',
];

export default function HomePage() {
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState<MarketResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async (customTopic?: string) => {
    const finalTopic = (customTopic ?? topic).trim();

    if (!finalTopic) {
      setError('Please enter a topic.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResult(null);
      setTopic(finalTopic);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/market/explore?topic=${encodeURIComponent(finalTopic)}`
      );

      if (!res.ok) {
        let message = 'Failed to analyze topic';

        try {
          const errorData = await res.json();
          message = errorData.message || message;
        } catch {
          message = 'Failed to analyze topic';
        }

        throw new Error(message);
      }

      const data = await res.json();
      setResult(data);
    } catch (error: any) {
      console.error(error);
      setError(error.message || 'Something went wrong while analyzing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.heroCard}>
          <span className={styles.badge}>AI-Powered Exploration</span>
          <h1 className={styles.title}>AI Multi-Agent Market Exploration System</h1>
          <p className={styles.subtitle}>
            Explore a market topic with multiple analysis agents and get fast insights on demand,
            competition, opportunities, and risks.
          </p>
        </section>

        <section className={styles.searchCard}>
          <div className={styles.searchRow}>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  handleAnalyze();
                }
              }}
              placeholder="Enter a market topic, e.g. coffee, EV charging, pet food"
              className={styles.input}
            />

            <button
              onClick={() => handleAnalyze()}
              disabled={loading || !topic.trim()}
              className={styles.button}
            >
              {loading ? (
                <span className={styles.buttonContent}>
                  <span className={styles.spinner} />
                  Analyzing...
                </span>
              ) : (
                'Analyze'
              )}
            </button>
          </div>

          <div className={styles.chips}>
            {sampleTopics.map((item) => (
              <button
                key={item}
                type="button"
                className={styles.chip}
                onClick={() => handleAnalyze(item)}
                disabled={loading}
              >
                {item}
              </button>
            ))}
          </div>

          {error && <p className={styles.error}>{error}</p>}
        </section>

        {result && (
          <div className={styles.resultsWrap}>
            <div className={styles.resultsGrid}>
              <section className={styles.topicCard}>
                <p className={styles.topicLabel}>Analyzed Topic</p>
                <h2 className={styles.topicTitle}>{result.topic}</h2>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={`${styles.cardTitle} ${styles.researchTitle}`}>Research Agent</h3>
                  <span className={`${styles.agentDot} ${styles.researchDot}`} />
                </div>

                <div className={styles.item}>
                  <p className={styles.label}>Market Overview</p>
                  <p className={styles.cardText}>{result.agents.research.marketOverview}</p>
                </div>

                <div className={styles.item}>
                  <p className={styles.label}>Target Customers</p>
                  <p className={styles.cardText}>{result.agents.research.targetCustomers}</p>
                </div>

                <div className={styles.item}>
                  <p className={styles.label}>Demand Signals</p>
                  <p className={styles.cardText}>{result.agents.research.demandSignals}</p>
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={`${styles.cardTitle} ${styles.competitorTitle}`}>
                    Competitor Agent
                  </h3>
                  <span className={`${styles.agentDot} ${styles.competitorDot}`} />
                </div>

                <div className={styles.item}>
                  <p className={styles.label}>Key Players</p>
                  <p className={styles.cardText}>{result.agents.competitor.keyPlayers}</p>
                </div>

                <div className={styles.item}>
                  <p className={styles.label}>Strengths</p>
                  <p className={styles.cardText}>{result.agents.competitor.strengths}</p>
                </div>

                <div className={styles.item}>
                  <p className={styles.label}>Gaps</p>
                  <p className={styles.cardText}>{result.agents.competitor.gaps}</p>
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={`${styles.cardTitle} ${styles.summaryTitle}`}>Summary Agent</h3>
                  <span className={`${styles.agentDot} ${styles.summaryDot}`} />
                </div>

                <div className={styles.item}>
                  <p className={styles.label}>Opportunities</p>
                  <p className={styles.cardText}>{result.agents.summary.opportunities}</p>
                </div>

                <div className={styles.item}>
                  <p className={styles.label}>Risks</p>
                  <p className={styles.cardText}>{result.agents.summary.risks}</p>
                </div>

                <div className={styles.item}>
                  <p className={styles.label}>Recommendation</p>
                  <p className={styles.cardText}>{result.agents.summary.recommendation}</p>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}