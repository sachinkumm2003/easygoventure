import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ChatTurnDto } from './chat.dto';

/** Partial lead fields gathered so far in the conversation. */
export class ExtractedLeadDataDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() inquiryType?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() destination?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsNumber() budget?: number;
  @IsOptional() @IsNumber() travelers?: number;
  @IsOptional() @IsString() notes?: string;
}

export class LeadIntakeChatDto {
  @ApiProperty({ description: 'The user message in the intake chat' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional({ type: [ChatTurnDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  history?: ChatTurnDto[];

  @ApiPropertyOptional({ description: 'Lead fields extracted so far' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ExtractedLeadDataDto)
  extractedData?: ExtractedLeadDataDto;
}

export interface LeadIntakeChatResponse {
  reply: string;
  extractedData: {
    name?: string;
    phone?: string;
    email?: string;
    companyName?: string;
    inquiryType?: string;
    source?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    budget?: number;
    travelers?: number;
    notes?: string;
  };
  isComplete: boolean;
  missingFields: string[];
  whatsappGreeting?: string;
}
