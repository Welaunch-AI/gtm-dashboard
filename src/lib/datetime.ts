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

/** Returns ordinal suffix for a number: 1 → "st", 2 → "nd", 3 → "rd", 4 → "th" */
function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

/**
 * Formats a date/time in the style: "3:33 AM · 9th July 2026 (EDT)"
 * Always in America/New_York timezone.
 */
export function formatDateTimeOrdinalEST(input: string | Date | number): string {
  const d = toDate(input);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZoneName: "short",
  }).formatToParts(d);
  const p = Object.fromEntries(parts.map(pt => [pt.type, pt.value]));
  const day = parseInt(p.day);
  const suffix = ordinalSuffix(day);
  const time = `${p.hour}:${p.minute} ${p.dayPeriod?.toUpperCase() ?? ""}`.trim();
  return `${time} · ${day}${suffix} ${p.month} ${p.year} (${p.timeZoneName ?? "ET"})`;
}

/**
 * Repairs garbled text that results from UTF-8 bytes being mis-stored as
 * Latin-1/Windows-1252 characters. Walks the string char-by-char and
 * reconstructs original Unicode from the raw byte values.
 */
export function cleanScheduledLabel(label: string): string {
  // Build a byte array: each char that is <= 0xFF contributes its code point as a byte.
  // High chars (> 0xFF, e.g. real Unicode like U+2020) are left through un-decoded.
  const bytes: number[] = [];
  const highChars: Map<number, string> = new Map();

  for (let i = 0; i < label.length; i++) {
    const code = label.charCodeAt(i);
    if (code <= 0xFF) {
      bytes.push(code);
    } else {
      // Windows-1252 maps some positions to high Unicode; reverse-map common ones back to bytes
      const win1252 = WIN1252_REVERSE[code];
      if (win1252 !== undefined) {
        bytes.push(win1252);
      } else {
        // Genuine Unicode char - store a placeholder
        const placeholder = 0xFFFE + i; // unique sentinel per position
        bytes.push(0xFF); // placeholder byte (won't appear in UTF-8 valid sequences)
        highChars.set(bytes.length - 1, label[i]);
      }
    }
  }

  // Try to decode as UTF-8
  let result = "";
  let i = 0;
  while (i < bytes.length) {
    if (highChars.has(i)) {
      result += highChars.get(i);
      i++;
      continue;
    }
    const b0 = bytes[i];
    if (b0 < 0x80) {
      result += String.fromCharCode(b0);
      i++;
    } else if ((b0 & 0xE0) === 0xC0 && i + 1 < bytes.length && (bytes[i + 1] & 0xC0) === 0x80) {
      result += String.fromCodePoint(((b0 & 0x1F) << 6) | (bytes[i + 1] & 0x3F));
      i += 2;
    } else if ((b0 & 0xF0) === 0xE0 && i + 2 < bytes.length && (bytes[i + 1] & 0xC0) === 0x80 && (bytes[i + 2] & 0xC0) === 0x80) {
      result += String.fromCodePoint(((b0 & 0x0F) << 12) | ((bytes[i + 1] & 0x3F) << 6) | (bytes[i + 2] & 0x3F));
      i += 3;
    } else {
      // Not a valid UTF-8 lead byte - output as-is
      result += String.fromCharCode(b0);
      i++;
    }
  }
  return result;
}

// Reverse map: Unicode code point → Windows-1252 byte (for the non-standard 0x80–0x9F range)
const WIN1252_REVERSE: Record<number, number> = {
  0x20AC: 0x80, // €
  0x201A: 0x82, // ‚
  0x0192: 0x83, // ƒ
  0x201E: 0x84, // „
  0x2026: 0x85, // …
  0x2020: 0x86, // †
  0x2021: 0x87, // ‡
  0x02C6: 0x88, // ˆ
  0x2030: 0x89, // ‰
  0x0160: 0x8A, // Š
  0x2039: 0x8B, // ‹
  0x0152: 0x8C, // Œ
  0x017D: 0x8E, // Ž
  0x2018: 0x91, // '
  0x2019: 0x92, // '
  0x201C: 0x93, // "
  0x201D: 0x94, // "
  0x2022: 0x95, // •
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x02DC: 0x98, // ˜
  0x2122: 0x99, // ™
  0x0161: 0x9A, // š
  0x203A: 0x9B, // ›
  0x0153: 0x9C, // œ
  0x017E: 0x9E, // ž
  0x0178: 0x9F, // Ÿ
};

export function startOfWeekYmdEST(): string {
  const today = todayYmdEST();
  const { weekday } = getZonedDateParts();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  return addDaysYmd(today, mondayOffset);
}
