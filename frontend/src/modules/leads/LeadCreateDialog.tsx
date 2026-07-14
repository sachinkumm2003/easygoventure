import { useEffect, useRef, useState } from 'react';
import { Bot, Calendar, DollarSign, Mail, MapPin, Phone, Plus, Send, TriangleAlert, User, Users, X } from 'lucide-react';
import { Modal } from '@shared/components/ui/modal';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Textarea } from '@shared/components/ui/textarea';
import { Select } from '@shared/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { useCreateLead } from '@shared/mutations/leads.mutations';
import { useCreateInquiry } from '@shared/mutations/inquiries.mutations';
import { useLeadIntakeChat } from '@shared/mutations/ai.mutations';
import type { ExtractedLeadData, ChatTurn } from '@shared/services/ai.service';
import {
  InquiryType,
  LeadSource,
  type InquiryType as InquiryTypeT,
  type LeadLocation,
  type LeadSource as LeadSourceT,
} from '@shared/types/domain';
import { titleCase } from '@shared/lib/format';
import { cn } from '@shared/utils/cn';

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const SOURCE_OPTIONS = LeadSource.map((s) => ({ label: titleCase(s), value: s }));
const TYPE_OPTIONS = InquiryType.map((t) => ({ label: titleCase(t), value: t }));

interface Fields {
  name: string;
  phone: string;
  email: string;
  companyName: string;
  source: LeadSourceT;
  inquiryType: InquiryTypeT;
  startDate: string;
  endDate: string;
  budget: string;
  travelers: string;
  notes: string;
  locations: LeadLocation[];
}

const EMPTY: Fields = {
  name: '',
  phone: '',
  email: '',
  companyName: '',
  source: 'WHATSAPP',
  inquiryType: 'TRAVEL_PACKAGE',
  startDate: '',
  endDate: '',
  budget: '',
  travelers: '',
  notes: '',
  locations: [],
};

function clampTravelers(v: string): string {
  if (!v.trim()) return '';
  const n = Math.floor(Number(v));
  return Number.isNaN(n) ? '' : String(Math.max(1, Math.min(200, n)));
}

function mergeExtracted(fields: Fields, data: ExtractedLeadData): Fields {
  return {
    ...fields,
    name: data.name || fields.name,
    phone: data.phone || fields.phone,
    email: data.email || fields.email,
    companyName: data.companyName || fields.companyName,
    source: (data.source as LeadSourceT) || fields.source,
    inquiryType: (data.inquiryType as InquiryTypeT) || fields.inquiryType,
    startDate: (data as Record<string, unknown>).startDate as string || data.travelDate || fields.startDate,
    endDate: (data as Record<string, unknown>).endDate as string || fields.endDate,
    budget: data.budget != null ? String(data.budget) : fields.budget,
    travelers: data.travelers != null ? String(data.travelers) : fields.travelers,
    notes: data.notes || fields.notes,
  };
}

interface ChatMsg { id: string; role: 'user' | 'assistant'; content: string }

export function LeadCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (leadId: string, whatsappGreeting?: string) => void;
}) {
  const [mode, setMode] = useState<'chat' | 'manual'>('chat');
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [msgs, setMsgs] = useState<ChatMsg[]>([{
    id: 'init', role: 'assistant',
    content: "Hi! Paste a WhatsApp message, email or just tell me about the client — I'll fill the form instantly.",
  }]);
  const [chatInput, setChatInput] = useState('');
  const [extracted, setExtracted] = useState<ExtractedLeadData>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [whatsappGreeting, setWhatsappGreeting] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const intakeChat = useLeadIntakeChat();
  const createLead = useCreateLead();
  const createInquiry = useCreateInquiry();
  const submitting = createLead.isPending || createInquiry.isPending;
  const set = (patch: Partial<Fields>) => setFields((f) => ({ ...f, ...patch }));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text || intakeChat.isPending) return;
    const history: ChatTurn[] = msgs.filter((m) => m.id !== 'init').map((m) => ({ role: m.role, content: m.content }));
    setMsgs((p) => [...p, { id: uuid(), role: 'user', content: text }]);
    setChatInput('');
    intakeChat.mutate({ message: text, history, extractedData: extracted }, {
      onSuccess: (res) => {
        setMsgs((p) => [...p, { id: uuid(), role: 'assistant', content: res.reply }]);
        setExtracted(res.extractedData);
        setMissing(res.missingFields);
        setFields((prev) => mergeExtracted(prev, res.extractedData));
        if (res.whatsappGreeting) setWhatsappGreeting(res.whatsappGreeting);
        setTimeout(() => inputRef.current?.focus(), 50);
      },
    });
  };

  const reset = () => {
    setFields(EMPTY); setMsgs([{ id: 'init', role: 'assistant', content: "Hi! Paste a WhatsApp message, email or just tell me about the client — I'll fill the form instantly." }]);
    setChatInput(''); setExtracted({}); setMissing([]); setWhatsappGreeting(''); setMode('chat');
  };
  const close = () => { onOpenChange(false); setTimeout(reset, 200); };

  const create = async () => {
    try {
      const lead = await createLead.mutateAsync({
        name: fields.name.trim() || undefined,
        phone: fields.phone.trim() || undefined,
        email: fields.email || undefined,
        companyName: fields.companyName || undefined,
        source: fields.source,
        inquiryType: fields.inquiryType,
        startDate: fields.startDate || undefined,
        endDate: fields.endDate || undefined,
        notes: fields.notes || undefined,
        locations: fields.locations.length > 0 ? fields.locations : undefined,
      });
      await createInquiry.mutateAsync({
        customerName: fields.name.trim(),
        customerPhone: fields.phone || undefined,
        customerEmail: fields.email || undefined,
        companyName: fields.companyName || undefined,
        source: fields.source,
        destination: fields.locations[0]?.city || undefined,
        travelers: fields.travelers ? Number(fields.travelers) : undefined,
        travelDate: fields.startDate || undefined,
        budget: fields.budget ? Number(fields.budget) : undefined,
      });
      onCreated?.(lead.id, whatsappGreeting || undefined);
      close();
    } catch { /* toasts handle errors */ }
  };

  const canCreate = Boolean(fields.name.trim() && fields.phone.trim());
  const totalNights = fields.startDate && fields.endDate
    ? Math.round((new Date(fields.endDate).getTime() - new Date(fields.startDate).getTime()) / 86_400_000)
    : null;

  return (
    <Modal
      open={open}
      onOpenChange={(v) => (v ? onOpenChange(true) : close())}
      title="New lead"
      description="AI extracts all details in real-time. Review and confirm to create."
      className="sm:max-w-[92vw] !max-h-[90vh]"
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {canCreate ? (
              <span className="text-success font-medium">✓ Ready to create</span>
            ) : (
              <span>Name &amp; phone required</span>
            )}
            {missing.length > 0 && (
              <span className="flex items-center gap-1 text-warning">
                <TriangleAlert className="size-3" /> Missing: {missing.slice(0, 3).join(', ')}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button onClick={() => void create()} disabled={!canCreate} loading={submitting}>
              Create lead
            </Button>
          </div>
        </div>
      }
    >
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'chat' | 'manual')}>
        <TabsList className="mb-4">
          <TabsTrigger value="chat"><Bot className="mr-1.5 size-3.5" /> AI Chat</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>

        {/* ── AI Chat: side-by-side full width ── */}
        <TabsContent value="chat">
          <div className="grid grid-cols-2 gap-5 h-[62vh]">

            {/* Left: Chat */}
            <div className="flex flex-col gap-2 h-full min-h-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Conversation</p>
              <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-muted/10 p-3 space-y-3 min-h-0">
                {msgs.map((msg) => (
                  <div key={msg.id} className={cn('flex gap-2.5', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                    <div className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full',
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted border border-border',
                    )}>
                      {msg.role === 'user' ? <User className="size-3.5" /> : <Bot className="size-3.5 text-primary" />}
                    </div>
                    <div className={cn(
                      'max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-card border border-border text-foreground rounded-tl-sm',
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {intakeChat.isPending && (
                  <div className="flex gap-2.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted border border-border">
                      <Bot className="size-3.5 text-primary" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-2.5 text-sm text-muted-foreground">
                      <span className="inline-flex gap-1">
                        <span className="animate-bounce [animation-delay:0ms]">·</span>
                        <span className="animate-bounce [animation-delay:150ms]">·</span>
                        <span className="animate-bounce [animation-delay:300ms]">·</span>
                      </span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChat()}
                  placeholder="Paste WhatsApp message or describe the client…"
                  disabled={intakeChat.isPending}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring disabled:opacity-50"
                />
                <Button size="sm" onClick={sendChat} disabled={!chatInput.trim() || intakeChat.isPending} loading={intakeChat.isPending} className="px-4">
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Right: Live form */}
            <div className="flex flex-col gap-2 h-full min-h-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Lead details — fills in real-time</p>
              <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">

                {/* Contact */}
                <Section icon={User} label="Contact">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Full name" required highlight={!!fields.name}>
                      <Input value={fields.name} onChange={(e) => set({ name: e.target.value })} placeholder="Aisha Khan" />
                    </Field>
                    <Field label="Phone / WhatsApp" required highlight={!!fields.phone}>
                      <div className="relative">
                        <Phone className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input value={fields.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+971 50 000 0000" className="pl-8" />
                      </div>
                    </Field>
                    <Field label="Email" highlight={!!fields.email}>
                      <div className="relative">
                        <Mail className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input type="email" value={fields.email} onChange={(e) => set({ email: e.target.value })} placeholder="you@agency.com" className="pl-8" />
                      </div>
                    </Field>
                    <Field label="Company" highlight={!!fields.companyName}>
                      <Input value={fields.companyName} onChange={(e) => set({ companyName: e.target.value })} placeholder="Acme Travels" />
                    </Field>
                  </div>
                </Section>

                {/* Trip */}
                <Section icon={Calendar} label="Trip details">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Inquiry type" highlight={fields.inquiryType !== 'TRAVEL_PACKAGE'}>
                      <Select options={TYPE_OPTIONS} value={fields.inquiryType} onChange={(e) => set({ inquiryType: e.target.value as InquiryTypeT })} />
                    </Field>
                    <Field label="Source" highlight={false}>
                      <Select options={SOURCE_OPTIONS} value={fields.source} onChange={(e) => set({ source: e.target.value as LeadSourceT })} />
                    </Field>
                    <Field label="Start date" highlight={!!fields.startDate}>
                      <Input type="date" value={fields.startDate} onChange={(e) => set({ startDate: e.target.value })} />
                    </Field>
                    <Field label="End date" highlight={!!fields.endDate}>
                      <Input type="date" value={fields.endDate} onChange={(e) => set({ endDate: e.target.value })} />
                    </Field>
                    {totalNights != null && totalNights > 0 && (
                      <div className="col-span-2 -mt-1 text-xs text-muted-foreground">
                        {totalNights} night{totalNights !== 1 ? 's' : ''} total
                      </div>
                    )}
                    <Field label="Travellers" highlight={!!fields.travelers}>
                      <div className="relative">
                        <Users className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input type="number" min={1} max={200} value={fields.travelers} onChange={(e) => set({ travelers: clampTravelers(e.target.value) })} placeholder="2" className="pl-8" />
                      </div>
                    </Field>
                    <Field label="Budget" highlight={!!fields.budget}>
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input type="number" min={0} value={fields.budget} onChange={(e) => set({ budget: e.target.value.replace(/-/g, '') })} placeholder="15000" className="pl-8" />
                      </div>
                    </Field>
                  </div>
                </Section>

                {/* Destinations */}
                <Section icon={MapPin} label="Destinations">
                  <LocationsEditor locations={fields.locations} onChange={(locs) => set({ locations: locs })} />
                </Section>

                {/* Notes */}
                <Section icon={null} label="Notes">
                  <textarea
                    value={fields.notes}
                    onChange={(e) => set({ notes: e.target.value })}
                    rows={2}
                    placeholder="Any additional details…"
                    className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                  />
                </Section>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Manual mode ── */}
        <TabsContent value="manual">
          <div className="space-y-4 max-h-[62vh] overflow-y-auto pr-1">
            <Section icon={User} label="Contact">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Full name" required highlight={!!fields.name}>
                  <Input value={fields.name} onChange={(e) => set({ name: e.target.value })} placeholder="Aisha Khan" />
                </Field>
                <Field label="Phone / WhatsApp" required highlight={!!fields.phone}>
                  <Input value={fields.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+971 50 000 0000" />
                </Field>
                <Field label="Email" highlight={!!fields.email}>
                  <Input type="email" value={fields.email} onChange={(e) => set({ email: e.target.value })} placeholder="you@agency.com" />
                </Field>
                <Field label="Company" highlight={!!fields.companyName}>
                  <Input value={fields.companyName} onChange={(e) => set({ companyName: e.target.value })} />
                </Field>
              </div>
            </Section>
            <Section icon={Calendar} label="Trip details">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Inquiry type" highlight={false}>
                  <Select options={TYPE_OPTIONS} value={fields.inquiryType} onChange={(e) => set({ inquiryType: e.target.value as InquiryTypeT })} />
                </Field>
                <Field label="Source" highlight={false}>
                  <Select options={SOURCE_OPTIONS} value={fields.source} onChange={(e) => set({ source: e.target.value as LeadSourceT })} />
                </Field>
                <Field label="Start date" highlight={!!fields.startDate}>
                  <Input type="date" value={fields.startDate} onChange={(e) => set({ startDate: e.target.value })} />
                </Field>
                <Field label="End date" highlight={!!fields.endDate}>
                  <Input type="date" value={fields.endDate} onChange={(e) => set({ endDate: e.target.value })} />
                </Field>
                <Field label="Travellers" highlight={!!fields.travelers}>
                  <Input type="number" min={1} max={200} value={fields.travelers} onChange={(e) => set({ travelers: clampTravelers(e.target.value) })} />
                </Field>
                <Field label="Budget" highlight={!!fields.budget}>
                  <Input type="number" min={0} value={fields.budget} onChange={(e) => set({ budget: e.target.value.replace(/-/g, '') })} />
                </Field>
              </div>
            </Section>
            <Section icon={MapPin} label="Destinations">
              <LocationsEditor locations={fields.locations} onChange={(locs) => set({ locations: locs })} />
            </Section>
            <Section icon={null} label="Notes">
              <textarea
                value={fields.notes}
                onChange={(e) => set({ notes: e.target.value })}
                rows={3}
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring"
              />
            </Section>
          </div>
        </TabsContent>
      </Tabs>
    </Modal>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ icon: Icon, label, children }: { icon: React.ElementType | null; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </p>
      {children}
    </div>
  );
}

function Field({
  label, required, highlight, children,
}: { label: string; required?: boolean; highlight?: boolean; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-sm">
      <span className={cn('text-xs font-medium', highlight ? 'text-primary' : 'text-muted-foreground')}>
        {label}{required && <span className="ml-0.5 text-danger">*</span>}
        {highlight && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-primary align-middle" />}
      </span>
      {children}
    </label>
  );
}

function LocationsEditor({ locations, onChange }: { locations: LeadLocation[]; onChange: (locs: LeadLocation[]) => void }) {
  const [newCity, setNewCity] = useState('');
  const [newNights, setNewNights] = useState('');

  const add = () => {
    if (!newCity.trim()) return;
    onChange([...locations, { locationId: uuid(), city: newCity.trim(), hotels: [], nights: newNights ? Number(newNights) : undefined }]);
    setNewCity(''); setNewNights('');
  };

  return (
    <div className="space-y-2">
      {locations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {locations.map((loc, i) => (
            <span key={loc.locationId} className="flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs">
              <MapPin className="size-3 text-primary" />
              <span className="font-medium">{i + 1}. {loc.city}</span>
              {loc.nights && <span className="text-muted-foreground">· {loc.nights}N</span>}
              <button onClick={() => onChange(locations.filter((l) => l.locationId !== loc.locationId))} className="ml-1 text-muted-foreground hover:text-foreground">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input placeholder="City / destination" value={newCity} onChange={(e) => setNewCity(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} className="flex-1" />
        <Input type="number" placeholder="Nights" value={newNights} onChange={(e) => setNewNights(e.target.value)} className="w-20" />
        <Button size="sm" variant="secondary" onClick={add} disabled={!newCity.trim()}><Plus className="size-3.5" /></Button>
      </div>
    </div>
  );
}
