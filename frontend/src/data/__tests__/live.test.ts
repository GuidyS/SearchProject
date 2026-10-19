import { afterEach, describe, expect, it, vi } from "vitest";
import { loadLiveSnapshot } from "../../../api/live";

afterEach(() => vi.unstubAllGlobals());

describe("live snapshot", () => {
  it("uses the newest position and interval for each driver and sorts by position", async () => {
    const responses: Record<string, unknown> = {
      sessions: [{ session_key: 123, session_name: "Race", meeting_name: "Test Grand Prix", location: "Test Circuit", date_start: "2025-01-01T00:00:00Z", date_end: "2025-01-01T02:00:00Z" }],
      drivers: [
        { driver_number: 11, full_name: "Driver B", team_name: "Team B", team_colour: "abcdef" },
        { driver_number: 22, full_name: "Driver A", team_name: "Team A", team_colour: "123456" },
      ],
      position: [
        { driver_number: 11, position: 1, date: "2025-01-01T00:01:00Z" },
        { driver_number: 11, position: 2, date: "2025-01-01T00:02:00Z" },
        { driver_number: 22, position: 1, date: "2025-01-01T00:02:00Z" },
      ],
      intervals: [
        { driver_number: 11, gap_to_leader: 5, interval: 2, date: "2025-01-01T00:01:00Z" },
        { driver_number: 11, gap_to_leader: 3, interval: 1, date: "2025-01-01T00:02:00Z" },
      ],
      weather: [], race_control: [],
    };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const endpoint = new URL(url).pathname.split("/").at(-1) || "";
      return { ok: true, json: async () => responses[endpoint] };
    }));

    const snapshot = await loadLiveSnapshot();
    expect(snapshot.drivers.map((driver) => driver.number)).toEqual([22, 11]);
    expect(snapshot.drivers[1]).toMatchObject({ position: 2, gap: 3, interval: 1 });
    expect(snapshot.dataAsOf).toBe("2025-01-01T00:02:00Z");
    expect(snapshot.session.active).toBe(false);
  });
});
