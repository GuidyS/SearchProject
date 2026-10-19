import { afterEach, describe, expect, it, vi } from "vitest";
import { getCircuitLiveSnapshot, matchesScheduledSession } from "../calendar-live";
import { formatCalendarDate, raceDateParts, raceEnd, sessionStart } from "../calendar-time";

afterEach(() => vi.unstubAllGlobals());

describe("calendar dates", () => {
  it("moves UTC race times past midnight into the correct Thai day", () => {
    const start = sessionStart({ date: "2026-10-25", time: "20:00:00Z" });
    expect(formatCalendarDate(start!, "Asia/Bangkok", { weekday: "short", month: "short", day: "numeric" })).toBe("Mon, Oct 26");
    expect(formatCalendarDate(start!, "Asia/Bangkok", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })).toBe("03:00");
    expect(raceDateParts("2026-10-25", "20:00:00Z", "Asia/Bangkok")).toEqual({ month: "OCT", day: "26" });
    expect(raceEnd("2026-10-25", "20:00:00Z").toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });
});

describe("circuit live data", () => {
  const sessions = [{ label: "Race", date: "2026-10-25", time: "20:00:00Z" }];
  const now = new Date("2026-10-25T20:30:00Z");

  it("rejects a latest session from another Grand Prix", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [
      { session_key: 123, date_start: "2026-10-11T20:00:00Z", date_end: "2026-10-11T22:00:00Z" },
    ] }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await getCircuitLiveSnapshot(sessions, now)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(matchesScheduledSession({ session_key: 123, date_start: "2026-10-11T20:00:00Z" }, sessions, now)).toBe(false);
  });

  it("loads weather only from the matched active session", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const endpoint = new URL(url).pathname.split("/").at(-1);
      const rows = endpoint === "sessions"
        ? [{ session_key: 456, date_start: "2026-10-25T20:00:00Z", date_end: "2026-10-25T22:00:00Z" }]
        : endpoint === "weather"
          ? [{ date: "2026-10-25T20:29:00Z", air_temperature: 30, track_temperature: 40, humidity: 50, wind_speed: 2 }]
          : [{ date: "2026-10-25T20:20:00Z", category: "Flag", scope: "Track", flag: "GREEN", message: "TRACK CLEAR" }];
      return { ok: true, json: async () => rows };
    });
    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await getCircuitLiveSnapshot(sessions, now);
    expect(snapshot?.weather?.air_temperature).toBe(30);
    expect(snapshot?.trackStatus?.flag).toBe("GREEN");
    expect(fetchMock.mock.calls.map(([url]) => url)).toContain("https://api.openf1.org/v1/weather?session_key=456");
  });
});
