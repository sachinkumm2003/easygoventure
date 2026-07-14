import { http } from '@shared/api/http';
import type { BrainConfig } from '@shared/types/domain';

export const BrainService = {
  list: () => http.get<BrainConfig[]>('/brain'),

  get: (section: string) => http.get<BrainConfig>(`/brain/${section}`),

  upsert: (section: string, data: { prompt: string; label?: string }) =>
    http.put<BrainConfig>(`/brain/${section}`, data),
};

export interface LeadChatInput {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: string;
}
