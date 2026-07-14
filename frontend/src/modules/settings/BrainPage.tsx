import { useState, useEffect, type ElementType } from 'react';
import { Bot, BookOpen, ChevronRight, Info, Sparkles } from 'lucide-react';
import { PageHeader } from '@shared/components/layout/page-header';
import { Button } from '@shared/components/ui/button';
import { Skeleton } from '@shared/components/ui/skeleton';
import { useBrainConfigs } from '@shared/queries/brain.queries';
import { useUpsertBrainConfig } from '@shared/mutations/brain.mutations';
import type { BrainConfig } from '@shared/types/domain';
import { cn } from '@shared/utils/cn';

const SECTION_META: Record<string, { icon: ElementType; description: string; placeholder: string }> = {
  leads: {
    icon: BookOpen,
    description: 'Injected into every AI call for this lead - follow-up suggestions, next actions, lead chat.',
    placeholder:
      'e.g. Always respond in English and Arabic. Focus on luxury DMC experiences. When suggesting hotels, prefer 5-star properties. For Dubai leads, always mention desert safari as an activity option.',
  },
  proposals: {
    icon: Sparkles,
    description: 'Used when drafting proposals and generating proposal summaries.',
    placeholder:
      'e.g. Include a payment terms section in every proposal. Always add a "What\'s included" and "What\'s excluded" table. Use USD as default currency unless the client is from UAE.',
  },
  followups: {
    icon: ChevronRight,
    description: 'Shapes follow-up message suggestions.',
    placeholder:
      'e.g. Keep follow-up messages short, friendly, and under 3 sentences. Always end with a clear question to prompt a reply.',
  },
  inquiries: {
    icon: BookOpen,
    description: 'Used when parsing and processing raw inquiries.',
    placeholder:
      'e.g. If the destination is unclear, default to Dubai. Always extract the traveler nationality if mentioned, even if not asked.',
  },
  ai_chat: {
    icon: Bot,
    description: 'Global system prompt for the AI copilot chat (applies to all sections).',
    placeholder:
      'e.g. You are a senior DMC consultant with 15 years of experience. Always provide at least 3 options when asked for suggestions. Be concise but thorough.',
  },
  operations: {
    icon: ChevronRight,
    description: 'AI guidance for the operations and fulfillment stage.',
    placeholder:
      'e.g. When generating operations timelines, add a 2-day buffer before departure. Always flag visa processing as a critical path item.',
  },
};

function sectionLabel(section: string): string {
  return section.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function BrainPage() {
  const { data: configs, isLoading } = useBrainConfigs();
  const [selected, setSelected] = useState<string>('leads');

  const activeConfig = configs?.find((c) => c.section === selected);
  const activeMeta = SECTION_META[selected] ?? { icon: Bot, description: '', placeholder: '' };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brain"
        description="Configure super prompts that shape how the AI behaves for each section of your CRM."
        breadcrumb={[{ label: 'Settings' }, { label: 'Brain' }]}
      />

      <div className="flex items-start gap-4 rounded-lg border border-primary/20 bg-primary/[0.03] p-4 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          Super prompts are injected as system instructions when the AI works on that section.
          They let you tune the AI's tone, focus, rules, and domain knowledge - without changing
          the underlying model. Changes take effect immediately.
        </p>
      </div>

      <div className="grid grid-cols-[220px_1fr] gap-6">
        {/* Section list */}
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sections
          </div>
          <nav className="space-y-0.5 p-2">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))
              : (configs ?? []).map((c) => {
                  const meta = SECTION_META[c.section];
                  const Icon: ElementType = meta?.icon ?? Bot;
                  const hasPrompt = Boolean(c.prompt?.trim());
                  return (
                    <button
                      key={c.section}
                      onClick={() => setSelected(c.section)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors',
                        selected === c.section
                          ? 'bg-primary/10 font-semibold text-primary'
                          : 'text-foreground hover:bg-muted/60',
                      )}
                    >
                      <Icon className="size-3.5 shrink-0" />
                      <span className="flex-1 truncate">{c.label ?? sectionLabel(c.section)}</span>
                      {hasPrompt && (
                        <span className="size-1.5 rounded-full bg-primary" title="Prompt configured" />
                      )}
                    </button>
                  );
                })}
          </nav>
        </div>

        {/* Editor */}
        <div>
          {isLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : (
            <BrainEditor
              key={selected}
              section={selected}
              config={activeConfig}
              description={activeMeta.description}
              placeholder={activeMeta.placeholder}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function BrainEditor({
  section,
  config,
  description,
  placeholder,
}: {
  section: string;
  config?: BrainConfig;
  description: string;
  placeholder: string;
}) {
  const upsert = useUpsertBrainConfig();
  const [prompt, setPrompt] = useState(config?.prompt ?? '');
  const isDirty = prompt !== (config?.prompt ?? '');

  useEffect(() => {
    setPrompt(config?.prompt ?? '');
  }, [config?.prompt]);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground capitalize">
            {sectionLabel(section)}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-xs text-warning">Unsaved changes</span>
          )}
          <Button
            size="sm"
            disabled={!isDirty || upsert.isPending}
            loading={upsert.isPending}
            onClick={() => upsert.mutate({ section, prompt })}
          >
            Save prompt
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> Super prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={placeholder}
          rows={12}
          className="w-full resize-y rounded-lg border border-input bg-background px-4 py-3 font-mono text-sm leading-relaxed text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring placeholder:font-sans placeholder:text-muted-foreground/60"
        />
        <p className="text-right text-xs text-muted-foreground">
          {prompt.length} chars{prompt.length > 6000 && ' · approaching limit'}
        </p>
      </div>

      {!prompt.trim() && (
        <div className="rounded-md border border-dashed border-muted-foreground/30 px-4 py-3 text-xs text-muted-foreground">
          No super prompt configured for <strong>{sectionLabel(section)}</strong>.
          The AI will use its default DMC persona. Add a prompt to customize its behavior for this section.
        </div>
      )}
    </div>
  );
}
