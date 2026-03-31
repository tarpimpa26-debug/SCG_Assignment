import { IsOptional, IsString } from 'class-validator';

export class MarketResearchDto {
  @IsString()
  topic!: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  audience?: string;
}