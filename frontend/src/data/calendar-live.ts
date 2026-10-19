import { cachedJson } from "./f1-cache";
import { sessionStart, type CalendarSession } from "./calendar-time";

interface OpenF1Session {
  session_key: number;
  date_start: string;
  date_end?: string;
}

interface OpenF1Weather {
  date: string;
  air_temperature: number;
  track_temperature: number;
  humidity: number;
  wind_speed: number;
}

interface OpenF1RaceControl {
  date: string;
  category: string;
  flag?: string;
  message?: string;
  scope?: string;
}

export interface CircuitLiveSnapshot {
  sessionKey: number;
  weather: OpenF1Weather | null;
  trackStatus: OpenF1RaceControl | null;
}

const minute = 60_000;

export function scheduledSessionIsActive(sessions: CalendarSession[], now = new Date()): boolean {
  return sessions.some((session) => {
    const start = sessionStart(session)?.getTime();
    return start !== undefined && now.getTime() >= start - 15 * minute && now.getTime() <= start + 4 * 60 * minute;
  });
}

export function matchesScheduledSession(session: OpenF1Session, sessions: CalendarSession[], now = new Date()): boolean {
  const actualStart = Date.parse(session.date_start);
  const actualEnd = session.date_end ? Date.parse(session.date_end) : actualStart + 4 * 60 * minute;
  if (!Number.isFinite(actualStart) || !Number.isFinite(actualEnd)) return false;
  if (now.getTime() < actualStart - 15 * minute || now.getTime() > actualEnd + 15 * minute) return false;
  return sessions.some((scheduled) => {
    const expectedStart = sessionStart(scheduled)?.getTime();
    return expectedStart !== undefined && Math.abs(actualStart - expectedStart) <= 2 * 60 * minute;
  });
}

export async function getCircuitLiveSnapshot(sessions: CalendarSession[], now = new Date()): Promise<CircuitLiveSnapshot | null> {
  if (!scheduledSessionIsActive(sessions, now)) return null;

  const latestSessions = await cachedJson<OpenF1Session[]>("https://api.openf1.org/v1/sessions?session_key=latest", 30_000);
  const current = latestSessions.at(-1);
  if (!current || !matchesScheduledSession(current, sessions, now)) return null;

  const [weatherResult, controlResult] = await Promise.allSettled([
    cachedJson<OpenF1Weather[]>(`https://api.openf1.org/v1/weather?session_key=${current.session_key}`, 30_000),
    cachedJson<OpenF1RaceControl[]>(`https://api.openf1.org/v1/race_control?session_key=${current.session_key}`, 30_000),
  ]);
  const weatherRows = weatherResult.status === "fulfilled" ? weatherResult.value : [];
  const controlRows = controlResult.status === "fulfilled" ? controlResult.value : [];
  const recentWeather = [...weatherRows].reverse().find((row) =>
    Number.isFinite(Date.parse(row.date)) && now.getTime() - Date.parse(row.date) <= 10 * minute && Date.parse(row.date) <= now.getTime() + minute
  ) || null;
  const trackStatus = [...controlRows].reverse().find((row) => row.category === "Flag" && row.scope === "Track") || null;

  return { sessionKey: current.session_key, weather: recentWeather, trackStatus };
}
