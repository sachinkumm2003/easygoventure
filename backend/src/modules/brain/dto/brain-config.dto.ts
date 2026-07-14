import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpsertBrainConfigDto {
  @ApiProperty({ description: 'Super prompt for this section', example: 'Always respond in a concise, professional tone.' })
  @IsString()
  @MaxLength(8000)
  prompt!: string;

  @ApiPropertyOptional({ description: 'Display label', example: 'Leads AI' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;
}

export class BrainConfigResponseDto {
  section!: string;
  label?: string;
  prompt!: string;
  updatedAt!: string;
}
