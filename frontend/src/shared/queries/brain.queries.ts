import { useQuery } from '@tanstack/react-query';
import { BrainService } from '@shared/services/brain.service';

export const BRAIN_KEYS = {
  all: ['brain'] as const,
  section: (s: string) => ['brain', s] as const,
};

export function useBrainConfigs() {
  return useQuery({
    queryKey: BRAIN_KEYS.all,
    queryFn: () => BrainService.list(),
  });
}

export function useBrainSection(section: string) {
  return useQuery({
    queryKey: BRAIN_KEYS.section(section),
    queryFn: () => BrainService.get(section),
  });
}
