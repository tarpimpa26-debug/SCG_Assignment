import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('analysis_history')
export class AnalysisHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  topic: string;

  @Column('text')
  region: string;

  @Column('simple-json')
  markets: string[];

  @Column('simple-json')
  keyMarkets: string[];

  @Column('simple-json')
  marketInsights: string[];

  @Column('simple-json')
  recentDevelopments: string[];

  @Column('simple-json')
  externalSignals: string[];

  @Column('text')
  overallInsight: string;

  @Column('simple-json')
  opportunities: string[];

  @Column('simple-json')
  risks: string[];

  @CreateDateColumn()
  createdAt: Date;
}