import { IsNotEmpty, IsString } from 'class-validator';

export class ExploreMarketQueryDto {
  @IsString()
  @IsNotEmpty()
  topic: string;
}