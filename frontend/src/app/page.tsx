'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';

type AnalyzeResponse = {
  topic: string;
  region: string;
  markets?: string[];
  keyMarkets: string[];
  marketInsights: string[];
  recentDevelopments: string[];
  externalSignals: string[];
  overallInsight: string;
  opportunities: string[];
  risks: string[];
};

type HistoryItem = {
  id: number;
  topic: string;
  region: string;
  markets?: string[] | string;
  keyMarkets: string[];
  marketInsights: string[];
  recentDevelopments: string[];
  externalSignals: string[];
  overallInsight: string;
  opportunities: string[];
  risks: string[];
  createdAt?: string;
};

const topicSuggestions = [
  'Coffee',
  'EV Charging',
  'Pet Food',
  'Skincare',
  'Smart Home',
  'Fitness App',
];

const regionOptions = [
  'Southeast Asia',
  'East Asia',
  'South Asia',
  'Europe',
  'North America',
  'Middle East',
  'Latin America',
];

const marketOptionsByRegion: Record<string, string[]> = {
  'Southeast Asia': [
    'Thailand',
    'Vietnam',
    'Indonesia',
    'Malaysia',
    'Singapore',
    'Philippines',
  ],
  'East Asia': ['China', 'Japan', 'South Korea', 'Taiwan', 'Hong Kong'],
  'South Asia': ['India', 'Pakistan', 'Bangladesh', 'Sri Lanka'],
  Europe: ['Germany', 'France', 'United Kingdom', 'Italy', 'Spain', 'Netherlands'],
  'North America': ['United States', 'Canada', 'Mexico'],
  'Middle East': ['United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Turkey'],
  'Latin America': ['Brazil', 'Mexico', 'Argentina', 'Chile', 'Colombia'],
};

export default function HomePage() {
  const [topic, setTopic] = useState('');
  const [region, setRegion] = useState('');
  const [markets, setMarkets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  const availableMarkets = region ? marketOptionsByRegion[region] ?? [] : [];

  const handleRegionChange = (value: string) => {
    setRegion(value);
    setMarkets([]);
    setError('');
  };

  const handleMarketToggle = (market: string) => {
    setError('');
    setMarkets((prev) =>
      prev.includes(market) ? prev.filter((item) => item !== market) : [...prev, market],
    );
  };

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);

      const response = await fetch(`${apiUrl}/market/history`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to load history.');
      }

      const data: HistoryItem[] = await response.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('History load error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleAnalyze = async () => {
    const trimmedTopic = topic.trim();

    if (!trimmedTopic) {
      setError('Please enter a market topic.');
      return;
    }

    if (!region) {
      setError('Please select a region.');
      return;
    }

    if (markets.length === 0) {
      setError('Please choose at least one market.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/market/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: trimmedTopic,
          region,
          markets,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze market.');
      }

      const data: AnalyzeResponse = await response.json();
      setResult(data);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistory = (item: HistoryItem) => {
    try {
      const mappedResult: AnalyzeResponse = {
        topic: item.topic,
        region: item.region,
        markets: Array.isArray(item.markets)
          ? item.markets
          : typeof item.markets === 'string'
            ? item.markets
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean)
            : [],
        keyMarkets: item.keyMarkets ?? [],
        marketInsights: item.marketInsights ?? [],
        recentDevelopments: item.recentDevelopments ?? [],
        externalSignals: item.externalSignals ?? [],
        overallInsight: item.overallInsight ?? '',
        opportunities: item.opportunities ?? [],
        risks: item.risks ?? [],
      };

      setResult(mappedResult);
      setTopic(item.topic);
      setRegion(item.region);

      if (Array.isArray(item.markets)) {
        setMarkets(item.markets);
      } else if (typeof item.markets === 'string') {
        setMarkets(
          item.markets
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        );
      } else {
        setMarkets([]);
      }

      setError('');
    } catch (err) {
      console.error('Failed to load history result:', err);
      setError('Unable to load this history item.');
    }
  };

  const displayMarkets =
    result?.markets?.length ? result.markets.join(', ') : markets.join(', ');

  const informationNeeded = [
    'Key markets in the selected region',
    'Industry or market insights',
    'Recent developments affecting the selected markets',
  ];

  const formatMarkets = (value: string[] | string | undefined) => {
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'string') return value;
    return '-';
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.topBar}>
          <div className={styles.brandBlock}>
            <div className={styles.brandMark}>SCG</div>
            <div>
              <p className={styles.brandEyebrow}>SCG ASSIGNMENT PROTOTYPE</p>
              <h1 className={styles.brandTitle}>AI Market Exploration</h1>
            </div>
          </div>

          <div className={styles.topMeta}>Multi-Agent Business Insight</div>
        </header>

        <section className={styles.heroCard}>
          <div className={styles.heroContent}>
            <div className={styles.badge}>BUSINESS INSIGHT PLATFORM</div>

            <h2 className={styles.title}>
              Explore market opportunities with an SCG-inspired business interface
            </h2>

            <p className={styles.subtitle}>
              Analyze a market topic through multiple AI agents and receive structured
              insight on market direction, recent developments, opportunities, and
              risks for business decision-making.
            </p>
          </div>
        </section>

        <div className={styles.workspace}>
          <aside className={styles.sidebarColumn}>
            <div className={styles.sidebarSticky}>
              <section className={styles.searchCard}>
                <div className={styles.sectionHeader}>
                  <p className={styles.sectionEyebrow}>MARKET INPUT</p>
                  <h3 className={styles.sectionTitle}>Start a market analysis</h3>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Topic</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => {
                      setTopic(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter a topic such as Agricultural products"
                    className={styles.input}
                  />

                  <div className={styles.chips}>
                    {topicSuggestions.map((item) => {
                      const isActive = topic === item;

                      return (
                        <button
                          key={item}
                          type="button"
                          className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
                          onClick={() => {
                            setTopic(item);
                            setError('');
                          }}
                          disabled={loading}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Region</label>
                  <select
                    value={region}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    className={styles.input}
                    disabled={loading}
                  >
                    <option value="">Select region</option>
                    {regionOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.fieldLabel}>Markets</label>

                  {region ? (
                    <div className={styles.marketPicker}>
                      <div className={styles.sectionHeaderCompact}>
                        <p className={styles.sectionEyebrow}>MARKETS</p>
                        <h3 className={styles.sectionTitleSmall}>Choose countries in this region</h3>
                      </div>

                      <div className={styles.chips}>
                        {availableMarkets.map((market) => {
                          const isActive = markets.includes(market);

                          return (
                            <button
                              key={market}
                              type="button"
                              className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
                              onClick={() => handleMarketToggle(market)}
                              disabled={loading}
                            >
                              {market}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.marketPlaceholder}>
                      Please select a region first.
                    </div>
                  )}
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={loading}
                  className={styles.button}
                >
                  <span className={styles.buttonContent}>
                    {loading && <span className={styles.spinner} />}
                    {loading ? 'Analyzing...' : 'Analyze Market'}
                  </span>
                </button>
              </section>

              <section className={styles.historySection}>
                <div className={styles.historyHeader}>
                  <div>
                    <p className={styles.sectionEyebrow}>DATABASE HISTORY</p>
                    <h3 className={styles.sectionTitle}>Previous analyses</h3>
                  </div>
                  <div className={styles.historyMeta}>
                    {historyLoading ? 'Loading...' : `${history.length} record(s)`}
                  </div>
                </div>

                {history.length === 0 ? (
                  <div className={styles.historyEmpty}>No saved analysis history yet.</div>
                ) : (
                  <div className={styles.historyList}>
                    {history.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={styles.historyCard}
                        onClick={() => handleSelectHistory(item)}
                      >
                        <div className={styles.historyCardTop}>
                          <div>
                            <p className={styles.historyLabel}>Saved Analysis</p>
                            <h4 className={styles.historyTitle}>{item.topic}</h4>
                          </div>

                          <span className={styles.historyDate}>
                            {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'No date'}
                          </span>
                        </div>

                        <div className={styles.historyInfo}>
                          <div className={styles.historyInfoBox}>
                            <span className={styles.historyInfoKey}>Region</span>
                            <span className={styles.historyInfoValue}>{item.region}</span>
                          </div>

                          <div className={styles.historyInfoBox}>
                            <span className={styles.historyInfoKey}>Markets</span>
                            <span className={styles.historyInfoValue}>
                              {formatMarkets(item.markets)}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </aside>

          <section className={styles.contentColumn}>
            {loading && result && (
              <div className={styles.resultsUpdating}>Updating analysis...</div>
            )}

            {result ? (
              <section className={styles.resultsWrap}>
                <div className={styles.resultsGrid}>
                  <section className={styles.topicCard}>
                    <div className={styles.topicTopRow}>
                      <div>
                        <p className={styles.topicLabel}>Final Report</p>
                        <h3 className={styles.topicTitle}>AI Market Exploration Summary</h3>
                      </div>

                      <div className={styles.topicMetaWrap}>
                        <div className={styles.topicMetaBox}>
                          <span className={styles.topicMetaKey}>Topic</span>
                          <span className={styles.topicMetaValue}>{result.topic}</span>
                        </div>

                        <div className={styles.topicMetaBox}>
                          <span className={styles.topicMetaKey}>Region</span>
                          <span className={styles.topicMetaValue}>{result.region}</span>
                        </div>

                        <div className={styles.topicMetaBox}>
                          <span className={styles.topicMetaKey}>Markets</span>
                          <span className={styles.topicMetaValue}>{displayMarkets}</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <article className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        <p className={styles.agentTag}>Input Summary</p>
                        <h4 className={`${styles.cardTitle} ${styles.researchTitle}`}>
                          Query Understanding
                        </h4>
                      </div>
                      <span className={`${styles.agentDot} ${styles.researchDot}`} />
                    </div>

                    <div className={styles.item}>
                      <p className={styles.label}>Topic</p>
                      <p className={styles.cardText}>{result.topic}</p>
                    </div>

                    <div className={styles.item}>
                      <p className={styles.label}>Region</p>
                      <p className={styles.cardText}>{result.region}</p>
                    </div>

                    <div className={styles.item}>
                      <p className={styles.label}>Selected Markets</p>
                      <p className={styles.cardText}>{displayMarkets}</p>
                    </div>

                    <div className={styles.item}>
                      <p className={styles.label}>Information Needed</p>
                      <div className={styles.listWrap}>
                        {informationNeeded.map((item, index) => (
                          <p key={`need-${index}`} className={styles.listItem}>
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>
                  </article>
    
                  <article className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        <p className={styles.agentTag}>Executive Summary</p>
                        <h4 className={`${styles.cardTitle} ${styles.summaryTitle}`}>
                          Strategic Overview
                        </h4>
                      </div>
                      <span className={`${styles.agentDot} ${styles.summaryDot}`} />
                    </div>

                    <div className={styles.item}>
                      <p className={styles.label}>Overall Insight</p>
                      <p className={styles.cardText}>{result.overallInsight}</p>
                    </div>
                  </article>

                  <article className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        <p className={styles.agentTag}>Scope</p>
                        <h4 className={`${styles.cardTitle} ${styles.researchTitle}`}>
                          Analysis Coverage
                        </h4>
                      </div>
                      <span className={`${styles.agentDot} ${styles.researchDot}`} />
                    </div>

                    <div className={styles.item}>
                      <p className={styles.label}>Selected Region</p>
                      <p className={styles.cardText}>{result.region}</p>
                    </div>

                    <div className={styles.item}>
                      <p className={styles.label}>Target Markets</p>
                      <p className={styles.cardText}>{displayMarkets}</p>
                    </div>

                    <div className={styles.item}>
                      <p className={styles.label}>Focus Topic</p>
                      <p className={styles.cardText}>{result.topic}</p>
                    </div>
                  </article>

                  <article className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h4 className={`${styles.cardTitle} ${styles.researchTitle}`}>
                          Market Research Findings
                        </h4>
                      </div>
                      <span className={`${styles.agentDot} ${styles.researchDot}`} />
                    </div>

                    <div className={styles.item}>
                      <p className={styles.label}>Key Markets</p>
                      <div className={styles.listWrap}>
                        {result.keyMarkets.length ? (
                          result.keyMarkets.map((item, index) => (
                            <p key={`market-${index}`} className={styles.listItem}>
                              {item}
                            </p>
                          ))
                        ) : (
                          <p className={styles.listItem}>No key markets available.</p>
                        )}
                      </div>
                    </div>

                    <div className={styles.item}>
                      <p className={styles.label}>Market Insights</p>
                      <div className={styles.listWrap}>
                        {result.marketInsights.length ? (
                          result.marketInsights.map((item, index) => (
                            <p key={`insight-${index}`} className={styles.listItem}>
                              {item}
                            </p>
                          ))
                        ) : (
                          <p className={styles.listItem}>No market insights available.</p>
                        )}
                      </div>
                    </div>
                  </article>

                  <article className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        <h4 className={`${styles.cardTitle} ${styles.competitorTitle}`}>
                          External Signals & Developments
                        </h4>
                      </div>
                      <span className={`${styles.agentDot} ${styles.competitorDot}`} />
                    </div>

                    <div className={styles.item}>
                      <p className={styles.label}>Recent Developments</p>
                      <div className={styles.listWrap}>
                        {result.recentDevelopments.length ? (
                          result.recentDevelopments.map((item, index) => (
                            <p key={`development-${index}`} className={styles.listItem}>
                              {item}
                            </p>
                          ))
                        ) : (
                          <p className={styles.listItem}>No recent developments available.</p>
                        )}
                      </div>
                    </div>

                    <div className={styles.item}>
                      <p className={styles.label}>External Signals</p>
                      <div className={styles.listWrap}>
                        {result.externalSignals.length ? (
                          result.externalSignals.map((item, index) => (
                            <p key={`signal-${index}`} className={styles.listItem}>
                              {item}
                            </p>
                          ))
                        ) : (
                          <p className={styles.listItem}>No external signals available.</p>
                        )}
                      </div>
                    </div>
                  </article>

                  <article className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        <p className={styles.agentTag}>Decision Support</p>
                        <h4 className={`${styles.cardTitle} ${styles.researchTitle}`}>
                          Growth Opportunities
                        </h4>
                      </div>
                      <span className={`${styles.agentDot} ${styles.researchDot}`} />
                    </div>

                    <div className={styles.item}>
                      <p className={styles.label}>Priority Opportunities</p>
                      <div className={styles.listWrap}>
                        {result.opportunities.length ? (
                          result.opportunities.map((item, index) => (
                            <p key={`opportunity-${index}`} className={styles.listItem}>
                              {item}
                            </p>
                          ))
                        ) : (
                          <p className={styles.listItem}>No opportunities available.</p>
                        )}
                      </div>
                    </div>
                  </article>

                  <article className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div>
                        <p className={styles.agentTag}>Decision Support</p>
                        <h4 className={`${styles.cardTitle} ${styles.competitorTitle}`}>
                          Risk Considerations
                        </h4>
                      </div>
                      <span className={`${styles.agentDot} ${styles.competitorDot}`} />
                    </div>

                    <div className={styles.item}>
                      <p className={styles.label}>Key Risks</p>
                      <div className={styles.listWrap}>
                        {result.risks.length ? (
                          result.risks.map((item, index) => (
                            <p key={`risk-${index}`} className={styles.listItem}>
                              {item}
                            </p>
                          ))
                        ) : (
                          <p className={styles.listItem}>No risks available.</p>
                        )}
                      </div>
                    </div>
                  </article>
                </div>
              </section>
            ) : (
              <section className={styles.emptyState}>
                <p className={styles.sectionEyebrow}>READY TO ANALYZE</p>
                <h3 className={styles.sectionTitle}>Your analysis result will appear here</h3>
                <p className={styles.emptyText}>
                  Select a topic, choose a region and markets, then click Analyze Market.
                </p>
              </section>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}