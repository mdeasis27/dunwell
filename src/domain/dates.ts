const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const SUNDAY = 0;
const SATURDAY = 6;
const EPOCH_WEEKDAY_OFFSET = 4; // 1970-01-01 was a Thursday

export type Day = number;

function daysFromCivil(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (month + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function civilFromDays(days: number): { year: number; month: number; day: number } {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  return { year, month, day };
}

export function tryParseDay(text: string): Day | null {
  const match = DAY_PATTERN.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return null;
  const value = daysFromCivil(year, month, day);
  const back = civilFromDays(value);
  if (back.year !== year || back.month !== month || back.day !== day) return null;
  return value;
}

export function parseDay(text: string): Day {
  const value = tryParseDay(text);
  if (value === null) throw new Error(`Invalid date: ${text}`);
  return value;
}

export function formatDay(day: Day): string {
  const { year, month, day: d } = civilFromDays(day);
  const pad = (n: number, w: number): string => String(n).padStart(w, "0");
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(d, 2)}`;
}

/** 0 = Sunday ... 6 = Saturday. */
export function weekday(day: Day): number {
  return (((day + EPOCH_WEEKDAY_OFFSET) % 7) + 7) % 7;
}

export function isWeekend(day: Day): boolean {
  const w = weekday(day);
  return w === SUNDAY || w === SATURDAY;
}
