import { http } from '@shared/api/http';
import type { ParsedInquiry } from '@shared/types/domain';
import type { ProposalDraft } from '@shared/types/ops-domain';

export interface ProposalDraftInput {
  destination: string;
  customerName?: string;
  travelers?: number;
  nights?: number;
  budget?: number;
  travelDate?: string;
}

export interface FollowupSuggestionInput {
  leadName: string;
  inquiryType: string;
  status: string;
  context?: string;
}

export interface ProposalSummaryInput {
  title: string;
  proposalType: string;
  amount?: number;
  currency?: string;
  description?: string;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatInput {
  message: string;
  history?: ChatTurn[];
  context?: string;
}

export type NextActionType =
  | 'create_followup'
  | 'add_note'
  | 'update_status'
  | 'create_proposal'
  | 'none';

export interface NextAction {
  summary: string;
  action: {
    type: NextActionType;
    scheduledDate?: string;
    remarks?: string;
    nextAction?: string;
    note?: string;
    status?: string;
    title?: string;
    proposalType?: string;
    amount?: number;
    currency?: string;
    description?: string;
  };
}

export interface NextActionInput {
  context: string;
  message?: string;
}

export interface LeadChatInput {
  message: string;
  history?: ChatTurn[];
  context?: string;
}

export interface ExtractedLeadData {
  name?: string;
  phone?: string;
  email?: string;
  companyName?: string;
  inquiryType?: string;
  source?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  travelDate?: string; // legacy fallback from parseInquiry
  budget?: number;
  travelers?: number;
  notes?: string;
}

export interface LeadIntakeChatInput {
  message: string;
  history?: ChatTurn[];
  extractedData?: ExtractedLeadData;
}

export interface LeadIntakeChatResponse {
  reply: string;
  extractedData: ExtractedLeadData;
  isComplete: boolean;
  missingFields: string[];
  whatsappGreeting?: string;
}

export const aiService = {
  parseInquiry: (text: string) => http.post<ParsedInquiry>('/ai/parse-inquiry', { text }),
  followupSuggestion: (input: FollowupSuggestionInput) =>
    http.post<{ message: string }>('/ai/followup-suggestion', input),
  proposalSummary: (input: ProposalSummaryInput) =>
    http.post<{ summary: string }>('/ai/proposal-summary', input),
  chat: (input: ChatInput) => http.post<{ reply: string }>('/ai/chat', input),
  leadChat: (input: LeadChatInput) => http.post<{ reply: string }>('/ai/lead-chat', input),
  leadIntakeChat: (input: LeadIntakeChatInput) =>
    http.post<LeadIntakeChatResponse>('/ai/lead-intake-chat', input),
  nextAction: (input: NextActionInput) => http.post<NextAction>('/ai/next-action', input),
  proposalDraft: (input: ProposalDraftInput) =>
    http.post<ProposalDraft>('/ai/proposal-draft', input),
};
