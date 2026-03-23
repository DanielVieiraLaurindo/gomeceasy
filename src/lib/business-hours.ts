/**
 * Business hours utilities — Seg–Sex, 08:00–18:00 (São Paulo)
 */

const BUSINESS_START_HOUR = 8;
const BUSINESS_END_HOUR = 18;
const BUSINESS_HOURS_PER_DAY = BUSINESS_END_HOUR - BUSINESS_START_HOUR;

function toSaoPauloDate(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function businessDayStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(BUSINESS_START_HOUR, 0, 0, 0);
  return d;
}

function businessDayEnd(date: Date): Date {
  const d = new Date(date);
  d.setHours(BUSINESS_END_HOUR, 0, 0, 0);
  return d;
}

export function businessMillisecondsBetween(start: Date, end: Date): number {
  if (end <= start) return 0;
  const spStart = toSaoPauloDate(start);
  const spEnd = toSaoPauloDate(end);
  let totalMs = 0;
  const cursor = new Date(spStart);
  while (cursor < spEnd) {
    if (isBusinessDay(cursor)) {
      const dayStart = businessDayStart(cursor);
      const dayEnd = businessDayEnd(cursor);
      const periodStart = cursor < dayStart ? dayStart : cursor;
      const periodEnd = spEnd < dayEnd ? spEnd : dayEnd;
      if (periodEnd > periodStart) {
        totalMs += periodEnd.getTime() - periodStart.getTime();
      }
    }
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(BUSINESS_START_HOUR, 0, 0, 0);
  }
  return totalMs;
}

export function formatBusinessTime(ms: number): string {
  if (ms <= 0 || !isFinite(ms)) return '—';
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / BUSINESS_HOURS_PER_DAY);
    const remHours = hours % BUSINESS_HOURS_PER_DAY;
    if (days > 0 && remHours > 0) return `${days}d ${remHours}h`;
    if (days > 0) return `${days}d útil${days > 1 ? 'eis' : ''}`;
  }
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

export function formatSlaTime(ms: number): string {
  if (ms < 0) return '—';
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}
