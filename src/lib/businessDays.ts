// Business days utility — excludes weekends
export function getBusinessDaysSince(dateStr: string): number {
  const start = new Date(dateStr);
  const now = new Date();
  let count = 0;
  const current = new Date(start);
  current.setDate(current.getDate() + 1);
  while (current <= now) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export function addBusinessDays(dateStr: string, days: number): Date {
  const date = new Date(dateStr);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return date;
}
