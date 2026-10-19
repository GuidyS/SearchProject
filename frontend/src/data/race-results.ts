import { cachedJson } from "./f1-cache";

interface RaceResult {
  position: string;
  Driver: { givenName: string; familyName: string };
  Constructor: { name: string };
  Time?: { time: string };
  laps: string;
  status: string;
  points: string;
}

export interface RaceWinner {
  round: string;
  raceName: string;
  Circuit: { circuitId: string; circuitName: string; Location: { country: string } };
  date: string;
  Results: [RaceResult];
}

interface RaceResultResponse {
  MRData: {
    limit: string;
    total: string;
    RaceTable: { Races: Array<Omit<RaceWinner, "Results"> & { Results?: RaceResult[] }> };
  };
}

export async function fetchRaceWinners(year: number): Promise<RaceWinner[]> {
  const baseUrl = `https://api.jolpi.ca/ergast/f1/${year}/results.json`;
  const firstPage = await cachedJson<RaceResultResponse>(`${baseUrl}?limit=100&offset=0`);
  const limit = Number(firstPage.MRData.limit);
  const total = Number(firstPage.MRData.total);
  if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(total) || total < 0) {
    throw new Error("Invalid race results response from Jolpica.");
  }

  const offsets = Array.from({ length: Math.max(0, Math.ceil(total / limit) - 1) }, (_, index) => (index + 1) * limit);
  const laterPages = await Promise.all(offsets.map((offset) =>
    cachedJson<RaceResultResponse>(`${baseUrl}?limit=100&offset=${offset}`)
  ));

  const winners = new Map<string, RaceWinner>();
  for (const page of [firstPage, ...laterPages]) {
    for (const race of page.MRData.RaceTable.Races || []) {
      const winner = race.Results?.find((result) => result.position === "1");
      if (winner) winners.set(race.round, { ...race, Results: [winner] });
    }
  }
  return [...winners.values()].sort((a, b) => Number(a.round) - Number(b.round));
}
