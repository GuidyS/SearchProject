export type CalendarTimeZone = "Asia/Bangkok" | "local" | "UTC";

export interface CalendarSession {
  label: string;
  date: string;
  time: string;
}

export function sessionStart(session: Pick<CalendarSession, "date" | "time">): Date | null {
  if (!session.date || !session.time) return null;
  const utcTime = session.time.endsWith("Z") ? session.time : `${session.time}Z`;
  const date = new Date(`${session.date}T${utcTime}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function raceEnd(date: string, time: string): Date {
  const start = sessionStart({ date, time });
  if (start) return new Date(start.getTime() + 3 * 60 * 60 * 1000);
  // Historical schedules without a start time remain upcoming through race day.
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000);
}

export function displayTimeZone(zone: CalendarTimeZone): string {
  return zone === "local" ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" : zone;
}

export function formatCalendarDate(date: Date, zone: CalendarTimeZone, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: displayTimeZone(zone) }).format(date);
}

export function raceDisplayDate(date: string, time: string): Date {
  return sessionStart({ date, time }) || new Date(`${date}T12:00:00Z`);
}

export function raceDateParts(date: string, time: string, zone: CalendarTimeZone): { month: string; day: string } {
  const displayDate = raceDisplayDate(date, time);
  const displayZone = time ? zone : "UTC";
  return {
    month: formatCalendarDate(displayDate, displayZone, { month: "short" }).toUpperCase(),
    day: formatCalendarDate(displayDate, displayZone, { day: "2-digit" }),
  };
}
