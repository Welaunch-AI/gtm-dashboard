/** Eastern Time (America/New_York) for all user-facing dates and times. */
export const APP_TIMEZONE = "America/New_York";

/** Empty table / field placeholder (no em dash). */
export const EMPTY_VALUE = "-";

function toDate(input: string | Date | number): Date {
  if (typeof input === "number") {
    return new Date(input < 1e12 ? input * 1000 : input);
  }
  if (typeof input === "string") return new Date(input);
  return input;
}

export function formatDateEST(input: string | Date | number): string {
  return toDate(input).toLocaleDateString("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateESTShort(input: string | Date | number): string {
  return toDate(input).toLocaleDateString("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).replace(",", "");
}

export function formatDateTimeEST(input: string | Date | number): string {
  return toDate(input).toLocaleString("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

export function formatShortDateEST(input: string | Date | number): string {
  return toDate(input).toLocaleDateString("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
  });
}

export function formatTimeEST(input: string | Date | number): string {
  return toDate(input).toLocaleTimeString("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatWeekdayDateEST(dateYmd: string): string {
  return new Date(`${dateYmd}T12:00:00`).toLocaleDateString("en-US", {
    timeZone: APP_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function todayYmdEST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(new Date());
}

export function getZonedDateParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  weekday: number;
} {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TIMEZONE,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
    }).formatToParts(date).map((p) => [p.type, p.value]),
  );
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    year: Number(parts.year),
    month: Number(parts.month) - 1,
    day: Number(parts.day),
    weekday: weekdayMap[parts.weekday] ?? 0,
  };
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d + days, 12));
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(anchor);
}

export function startOfWeekYmdEST(): string {
  const today = todayYmdEST();
  const { weekday } = getZonedDateParts();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  return addDaysYmd(today, mondayOffset);
}
