import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ChatTurnDto } from './chat.dto';

export class LeadChatDto {
  @ApiProperty({ description: 'The user message' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional({ type: [ChatTurnDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  history?: ChatTurnDto[];

  /** Pre-rendered lead context (locations, travelers, proposals, etc.) */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(12000)
  context?: string;
}
