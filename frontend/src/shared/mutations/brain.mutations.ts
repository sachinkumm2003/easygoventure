import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BrainService } from '@shared/services/brain.service';
import { BRAIN_KEYS } from '@shared/queries/brain.queries';
import { toast } from 'sonner';

export function useUpsertBrainConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ section, prompt, label }: { section: string; prompt: string; label?: string }) =>
      BrainService.upsert(section, { prompt, label }),
    onSuccess: (_, { section }) => {
      void qc.invalidateQueries({ queryKey: BRAIN_KEYS.all });
      void qc.invalidateQueries({ queryKey: BRAIN_KEYS.section(section) });
      toast.success('Brain prompt saved');
    },
  });
}
