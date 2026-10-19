import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRaceWinners } from "../race-results";

afterEach(() => vi.unstubAllGlobals());

const result = (position: string, name: string) => ({
  position,
  Driver: { givenName: name, familyName: "Driver" },
  Constructor: { name: "Test Team" },
  laps: "50",
  status: "Finished",
  points: "25",
});

const race = (round: number, results: ReturnType<typeof result>[]) => ({
  round: String(round),
  raceName: `Race ${round}`,
  Circuit: { circuitId: "test", circuitName: "Test", Location: { country: "Australia" } },
  date: "2026-03-01",
  Results: results,
});

describe("race results", () => {
  it("loads every API page and keeps only the winner for each round", async () => {
    const pages = [
      { MRData: { limit: "3", total: "5", RaceTable: { Races: [race(1, [result("1", "One"), result("2", "Other")]), race(2, [result("1", "Two")])] } } },
      { MRData: { limit: "3", total: "5", RaceTable: { Races: [race(2, [result("2", "Other")]), race(3, [result("1", "Three")])] } } },
    ];
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => pages[Number(new URL(url).searchParams.get("offset")) === 0 ? 0 : 1],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const winners = await fetchRaceWinners(2026);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith("https://api.jolpi.ca/ergast/f1/2026/results.json?limit=100&offset=3");
    expect(winners.map(({ round }) => round)).toEqual(["1", "2", "3"]);
    expect(winners[1].Results).toEqual([result("1", "Two")]);
  });
});
