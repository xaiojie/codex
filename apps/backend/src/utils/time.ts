export function getDateKey(timezoneOffset: string) {
  const now = new Date();
  const offsetMatch = timezoneOffset.match(/([+-])(\d{2}):(\d{2})/);
  if (!offsetMatch) {
    return now.toISOString().slice(0, 10);
  }
  const sign = offsetMatch[1] === "+" ? 1 : -1;
  const hours = Number(offsetMatch[2]);
  const minutes = Number(offsetMatch[3]);
  const offsetMs = sign * (hours * 60 + minutes) * 60 * 1000;
  const local = new Date(now.getTime() + offsetMs);
  return local.toISOString().slice(0, 10);
}

export function toDateOrNull(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
