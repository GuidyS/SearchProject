import type { LiveDriver, LiveSnapshot } from "../src/data/live-types";

const baseUrl = "https://api.openf1.org/v1";
let tokenCache: { value: string; expiresAt: number } | null = null;
let snapshotCache: { value: LiveSnapshot; expiresAt: number } | null = null;

interface OpenF1Session {
  session_key: number;
  session_name: string;
  date_start: string;
  date_end: string | null;
  meeting_name?: string;
  country_name?: string;
  location?: string;
}

interface OpenF1Driver {
  driver_number: number;
  full_name?: string;
  name_acronym?: string;
  team_name?: string;
  team_colour?: string;
}

interface OpenF1Position {
  driver_number: number;
  position: number;
  date: string;
}

interface OpenF1Interval {
  driver_number: number;
  gap_to_leader: string | number | null;
  interval: string | number | null;
  date: string;
}

async function getToken(credentials?: { username?: string; password?: string }): Promise<string | null> {
  const username = credentials?.username ?? process.env.OPENF1_USERNAME;
  const password = credentials?.password ?? process.env.OPENF1_PASSWORD;
  if (!username || !password) return null;
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.value;

  const response = await fetch("https://api.openf1.org/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("OpenF1 authentication failed. Check server credentials.");
  const payload = await response.json() as { access_token: string; expires_in: number | string };
  tokenCache = {
    value: payload.access_token,
    expiresAt: Date.now() + Math.max(60, Number(payload.expires_in) - 60) * 1000,
  };
  return tokenCache.value;
}

async function openF1<T>(path: string, token: string | null): Promise<T> {
  const response = await fetch(`${baseUrl}/${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error("Current OpenF1 data requires an authenticated subscription.");
  }
  if (!response.ok) throw new Error(`OpenF1 request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

function latestByDriver<T extends { driver_number: number; date: string }>(rows: T[]): Map<number, T> {
  const latest = new Map<number, T>();
  for (const row of rows) {
    const previous = latest.get(row.driver_number);
    if (!previous || row.date > previous.date) latest.set(row.driver_number, row);
  }
  return latest;
}

export async function loadLiveSnapshot(credentials?: { username?: string; password?: string }): Promise<LiveSnapshot> {
  if (snapshotCache && snapshotCache.expiresAt > Date.now()) return snapshotCache.value;
  const token = await getToken(credentials);
  const sessions = await openF1<OpenF1Session[]>("sessions?session_key=latest", token);
  const session = sessions.at(-1);
  if (!session) throw new Error("OpenF1 has no session available yet.");
  const key = encodeURIComponent(session.session_key);

  const [drivers, positions, intervals, weather, control] = await Promise.all([
    openF1<OpenF1Driver[]>(`drivers?session_key=${key}`, token),
    openF1<OpenF1Position[]>(`position?session_key=${key}`, token),
    openF1<OpenF1Interval[]>(`intervals?session_key=${key}`, token).catch(() => []),
    openF1<Array<{ date: string; air_temperature: number; track_temperature: number; humidity: number; rainfall: number }>>(`weather?session_key=${key}`, token).catch(() => []),
    openF1<Array<{ date: string; category: string; flag: string | null; message: string; scope?: string }>>(`race_control?session_key=${key}`, token).catch(() => []),
  ]);

  const latestPositions = latestByDriver(positions);
  const latestIntervals = latestByDriver(intervals);
  const sortedDrivers: LiveDriver[] = drivers.map((driver) => ({
    number: driver.driver_number,
    position: latestPositions.get(driver.driver_number)?.position ?? null,
    name: driver.full_name || driver.name_acronym || `Driver ${driver.driver_number}`,
    acronym: driver.name_acronym || String(driver.driver_number),
    team: driver.team_name || "Unknown team",
    colour: /^[0-9a-fA-F]{6}$/.test(driver.team_colour || "") ? `#${driver.team_colour}` : "#71717a",
    gap: latestIntervals.get(driver.driver_number)?.gap_to_leader ?? null,
    interval: latestIntervals.get(driver.driver_number)?.interval ?? null,
  })).sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity) || a.number - b.number);

  const latestWeather = weather.at(-1);
  const latestTrackFlag = control.filter((event) => event.category === "Flag" && (!event.scope || event.scope === "Track")).at(-1);
  const timestamps = [...latestPositions.values(), ...latestIntervals.values()].map((row) => row.date).sort();
  const now = Date.now();
  const active = Date.parse(session.date_start) <= now && (!session.date_end || Date.parse(session.date_end) >= now);
  const snapshot: LiveSnapshot = {
    session: {
      name: session.session_name,
      meeting: session.meeting_name || session.country_name || "Formula 1",
      location: session.location || "",
      start: session.date_start,
      end: session.date_end,
      active,
    },
    drivers: sortedDrivers,
    weather: latestWeather ? {
      air: latestWeather.air_temperature ?? null,
      track: latestWeather.track_temperature ?? null,
      humidity: latestWeather.humidity ?? null,
      rain: latestWeather.rainfall ?? null,
    } : null,
    trackStatus: latestTrackFlag ? {
      flag: latestTrackFlag.flag,
      message: latestTrackFlag.message,
      date: latestTrackFlag.date,
    } : null,
    dataAsOf: timestamps.at(-1) || null,
    fetchedAt: new Date().toISOString(),
  };
  snapshotCache = { value: snapshot, expiresAt: now + 15_000 };
  return snapshot;
}

interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): { json(body: object): void };
}

export default async function handler(req: { method?: string }, res: ApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    return res.status(200).json(await loadLiveSnapshot());
  } catch (error) {
    return res.status(503).json({ error: error instanceof Error ? error.message : "Live data is unavailable." });
  }
}
