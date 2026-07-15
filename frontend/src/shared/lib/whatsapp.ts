// Builds the EasyGo Venture WhatsApp quote from a Lead.
//
// The output must stay short enough to avoid WhatsApp's "Read More" fold:
// no marketing copy, no deposit text, no long descriptions. It always ends with
//   — Easy Go Venture Tourism (by {preparedBy})
// so the client can track who prepared / closed each quote.
import type { Lead, LeadHotelOption, LeadServiceItem } from '@shared/types/domain';
import { CUSTOMER_CURRENCY, INTERNAL_CURRENCY, normalizeHotelOption, toCustomerUsd } from './lead-pricing';

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: '$',
  AED: 'AED ',
  EUR: '€',
  GBP: '£',
  NGN: '₦',
};

function money(amount: number, currency = 'USD'): string {
  const sym = CURRENCY_SYMBOL[currency.toUpperCase()] ?? `${currency.toUpperCase()} `;
  const value = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${sym}${value}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function dateRange(travelDate?: string, returnDate?: string): string {
  const a = shortDate(travelDate);
  const b = shortDate(returnDate);
  if (a && b) return `${a}–${b}`;
  return a ?? b ?? '';
}

function stars(rating?: number): string {
  return rating ? ` (${rating}★)` : '';
}

function optionCurrency(option: LeadHotelOption, fallbackCurrency: string): string {
  return option.currency ?? fallbackCurrency ?? INTERNAL_CURRENCY;
}

function hotelOptionPrice(option: LeadHotelOption, fallbackCurrency: string): string | null {
  if (option.pricePerPerson == null) return null;
  return `${money(toCustomerUsd(option.pricePerPerson, optionCurrency(option, fallbackCurrency)), CUSTOMER_CURRENCY)}/person`;
}

interface HotelGroup {
  name: string;
  starRating?: number;
  location?: string;
  recommended?: boolean;
  options: LeadHotelOption[];
}

function hotelGroupKey(option: LeadHotelOption): string {
  return [option.name, option.location ?? '', option.starRating ?? ''].join('|').toLowerCase();
}

function groupHotelOptions(options: LeadHotelOption[]): HotelGroup[] {
  const groups = new Map<string, HotelGroup>();
  options.forEach((option) => {
    const key = hotelGroupKey(option);
    const existing = groups.get(key);
    if (existing) {
      existing.recommended = existing.recommended || option.recommended;
      existing.options.push(option);
      return;
    }
    groups.set(key, {
      name: option.name,
      starRating: option.starRating,
      location: option.location,
      recommended: option.recommended,
      options: [option],
    });
  });
  return [...groups.values()];
}

function hotelBlock(group: HotelGroup, index: number, currency: string): string {
  const lines: string[] = [];
  lines.push(`*${index + 1}. ${group.name}*${stars(group.starRating)}${group.recommended ? ' ✅' : ''}`);
  if (group.location) lines.push(`📍 ${group.location}`);
  group.options.forEach((option) => {
    const priceLabel = hotelOptionPrice(option, currency);
    const rooms = option.roomCount ? `${option.roomCount} room${option.roomCount > 1 ? 's' : ''}` : null;
    const occupancy = option.maxOccupancy ? `max ${option.maxOccupancy}/room` : null;
    const nights = option.nights ? `${option.nights}N` : null;
    const details = [rooms, nights, occupancy, priceLabel].filter(Boolean).join(' | ');
    const label = option.roomType || 'Room option';
    lines.push(`• ${label}${details ? ` — ${details}` : ''}`);
  });
  return lines.join('\n');
}

function serviceAddOnLine(svc: LeadServiceItem, fallbackCurrency: string): string {
  const cur = svc.currency ?? fallbackCurrency ?? INTERNAL_CURRENCY;
  return `🔸 ${svc.serviceName} — ${money(toCustomerUsd(svc.sellPrice!, cur), CUSTOMER_CURRENCY)}/pax`;
}

export interface WhatsAppQuoteOptions {
  staffName?: string;
}

export function buildWhatsAppQuote(lead: Lead, opts: WhatsAppQuoteOptions = {}): string {
  const currency = lead.currency ?? INTERNAL_CURRENCY;
  const pax = (lead.adults ?? 0) + (lead.children ?? 0);
  const blocks: string[] = [];

  // ── Header ─────────────────────────────────────────────────────────────────
  const range = dateRange(lead.travelDate, lead.returnDate);
  const titleParts = [`${lead.destination ? `${lead.destination} ` : ''}Package`, range]
    .filter(Boolean)
    .join(' — ');
  const header = [titleParts, pax > 0 ? `${pax} pax` : ''].filter(Boolean).join(' | ');
  blocks.push(`*${header}*`);

  // ── Recipient ──────────────────────────────────────────────────────────────
  blocks.push(`For: ${lead.name}${lead.companyName ? ` (${lead.companyName})` : ''}`);

  // ── Hotel options ──────────────────────────────────────────────────────────
  const hotels = (lead.hotelOptions ?? []).map((h) =>
    normalizeHotelOption(h, {
      pax: Math.max(1, pax),
      fallbackNights: lead.nights ?? 1,
      fallbackCurrency: lead.currency ?? INTERNAL_CURRENCY,
    }),
  );
  if (hotels.length > 0) {
    blocks.push(groupHotelOptions(hotels).map((g, i) => hotelBlock(g, i, currency)).join('\n\n'));
  }

  // ── Priced services (shown as add-ons with per-person cost) ─────────────────
  const serviceItems = lead.serviceItems ?? [];
  const pricedAddOns = serviceItems.filter((s) => s.sellPrice != null && s.sellPrice > 0);
  if (pricedAddOns.length > 0) {
    const lines = pricedAddOns.map((s) => serviceAddOnLine(s, currency));
    blocks.push(`*Add-ons per person:*\n${lines.join('\n')}`);
  }

  // ── Includes list ──────────────────────────────────────────────────────────
  const serviceNames =
    serviceItems.length > 0
      ? serviceItems.map((s) => s.serviceName)
      : (lead.services ?? []);
  const includes = [
    lead.nights ? `${lead.nights} Nights accommodation` : null,
    'Daily Breakfast',
    ...serviceNames,
    'Taxes (excl. tourism dirham)',
  ].filter(Boolean);
  blocks.push(`*Includes:* ${includes.join(' · ')}`);

  // ── Package total (recommended hotel + converted services) ─────────────────
  const recommended = hotels.find((h) => h.recommended) ?? hotels[0];
  if (recommended?.pricePerPerson != null) {
    const hotelUsd = toCustomerUsd(recommended.pricePerPerson, optionCurrency(recommended, currency));
    const servicesUsd = pricedAddOns.reduce(
      (sum, s) => sum + toCustomerUsd(s.sellPrice ?? 0, s.currency ?? currency),
      0,
    );
    blocks.push(`💰 *Package from ${money(hotelUsd + servicesUsd, CUSTOMER_CURRENCY)}/person*`);
  }

  // ── Validity + terms ───────────────────────────────────────────────────────
  const validity = lead.quoteValidityHours ?? 48;
  blocks.push(`⚠️ ${validity} hours validity · Non refundable · Subject to availability`);

  blocks.push('To confirm: names + passports');

  // ── Signature ──────────────────────────────────────────────────────────────
  const staff = lead.preparedBy || opts.staffName;
  blocks.push(`— Easy Go Venture Tourism${staff ? ` (by ${staff})` : ''}`);

  return blocks.join('\n\n');
}

export function whatsappDeepLink(phone: string | undefined, message: string): string {
  const digits = (phone ?? '').replace(/[^\d]/g, '');
  const text = encodeURIComponent(message);
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
}
