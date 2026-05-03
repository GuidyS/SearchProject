import Fuse from "fuse.js";
import { containsThai } from "./thai-mappings";
import type { WebResult } from "./search-data";
import type { ApiCircuit, ApiConstructor, ApiDriver, ApiRace, ApiStanding } from "./f1-api";

export interface RagSource {
  id: string;
  title: string;
  kind: "driver" | "team" | "circuit" | "standing" | "race" | "media" | "article";
  body: string;
  url?: string;
}

export interface RagBundle {
  answer: string;
  sources: RagSource[];
}

export interface RagLiveData {
  drivers: ApiDriver[];
  constructors: ApiConstructor[];
  circuits: ApiCircuit[];
  standings: ApiStanding[];
  lastRace: ApiRace | null;
  driverRaces?: ApiRace[];
  year: number;
  parsedQuery: string;
}

const sourceLimit = 8;
const shortDriverNames: Record<string, string> = {
  max: "Max Verstappen",
  lando: "Lando Norris",
  lewis: "Lewis Hamilton",
  charles: "Charles Leclerc",
  oscar: "Oscar Piastri",
  george: "George Russell",
  fernando: "Fernando Alonso",
  carlos: "Carlos Sainz",
  yuki: "Yuki Tsunoda",
  kimi: "Kimi Antonelli",
};

function normalizeRagQuery(query: string, sources: RagSource[]): string {
  const trimmed = query.trim();
  if (!trimmed) return "";

  const lowerQuery = trimmed.toLowerCase();
  const matchedSourceTitle = sources.find((source) => {
    if (source.kind !== "driver" && source.kind !== "team" && source.kind !== "circuit") return false;
    const title = source.title.toLowerCase();
    const parts = title.split(/\s+/).filter((part) => part.length > 2);
    return parts.some((part) => lowerQuery.includes(part));
  })?.title;

  if (matchedSourceTitle) return matchedSourceTitle;

  for (const [shortName, fullName] of Object.entries(shortDriverNames)) {
    if (lowerQuery.includes(shortName)) return fullName;
  }

  return trimmed;
}

function asksForTodayStart(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return (
    /(start|starting|grid|time|today|race time|qualifying)/i.test(lowerQuery) ||
    /(เริ่ม|กี่โมง|กี่โมงวันนี้|เท่าไหร่|วันนี้|สตาร์ท|เวลา|กริด)/.test(query)
  );
}

function driverSource(driver: ApiDriver, standings: ApiStanding[], year: number): RagSource {
  const standing = standings.find((s) => s.Driver.driverId === driver.driverId);
  const team = standing?.Constructors?.[0]?.name;
  const stats = standing
    ? `Current ${year} standing: P${standing.position}, ${standing.points} points, ${standing.wins} wins.`
    : `No current ${year} standing was found in the retrieved data.`;

  return {
    id: `driver-${driver.driverId}`,
    title: `${driver.givenName} ${driver.familyName}`,
    kind: "driver",
    url: driver.url,
    body: [
      `${driver.givenName} ${driver.familyName} is an F1 driver from ${driver.nationality}.`,
      driver.permanentNumber ? `Race number: ${driver.permanentNumber}.` : "",
      team ? `Team: ${team}.` : "",
      stats,
    ].filter(Boolean).join(" "),
  };
}

function teamSource(team: ApiConstructor, standings: ApiStanding[], year: number): RagSource {
  const drivers = standings
    .filter((s) => s.Constructors.some((c) => c.constructorId === team.constructorId))
    .map((s) => `${s.Driver.givenName} ${s.Driver.familyName} P${s.position}`)
    .slice(0, 4);

  return {
    id: `team-${team.constructorId}`,
    title: team.name,
    kind: "team",
    url: team.url,
    body: [
      `${team.name} is an F1 constructor from ${team.nationality}.`,
      drivers.length ? `${year} retrieved drivers: ${drivers.join(", ")}.` : "",
    ].filter(Boolean).join(" "),
  };
}

function raceSource(race: ApiRace, title = race.raceName): RagSource {
  const podium = race.Results?.slice(0, 3)
    .map((r) => `P${r.position} ${r.Driver.givenName} ${r.Driver.familyName} (${r.Constructor.name})`)
    .join(", ");

  return {
    id: `race-${race.round}-${title}`,
    title,
    kind: "race",
    body: [
      `${race.raceName} was held at ${race.Circuit.circuitName} on ${race.date}.`,
      podium ? `Top results: ${podium}.` : "",
    ].filter(Boolean).join(" "),
  };
}

export function buildRagSources(
  liveData: RagLiveData | null,
  webResults: WebResult[],
): RagSource[] {
  const sources: RagSource[] = [];

  if (liveData) {
    sources.push(...liveData.drivers.map((d) => driverSource(d, liveData.standings, liveData.year)));
    sources.push(...liveData.constructors.map((c) => teamSource(c, liveData.standings, liveData.year)));
    sources.push(...liveData.circuits.map((c) => ({
      id: `circuit-${c.circuitId}`,
      title: c.circuitName,
      kind: "circuit" as const,
      url: c.url,
      body: `${c.circuitName} is a circuit in ${c.Location.locality}, ${c.Location.country}.`,
    })));
    sources.push(...liveData.standings.slice(0, 10).map((s) => ({
      id: `standing-${s.Driver.driverId}`,
      title: `${liveData.year} standing: ${s.Driver.givenName} ${s.Driver.familyName}`,
      kind: "standing" as const,
      body: `${s.Driver.givenName} ${s.Driver.familyName} is P${s.position} with ${s.points} points and ${s.wins} wins in ${liveData.year}. Constructor: ${s.Constructors.map((c) => c.name).join(", ")}.`,
    })));
    if (liveData.lastRace) sources.push(raceSource(liveData.lastRace, `Latest race: ${liveData.lastRace.raceName}`));
    sources.push(...(liveData.driverRaces || []).slice(0, 8).map((r) => raceSource(r, `Driver race: ${r.raceName}`)));
  }

  sources.push(...webResults
    .filter((result) => result.type === "news" || result.type === "article" || result.type === "standings" || result.type === "race")
    .map((result, index) => ({
      id: `web-${index}-${result.title}`,
      title: result.title,
      kind: result.type === "news" || result.type === "article" ? "article" as const : "race" as const,
      url: result.url,
      body: `${result.source}${result.date ? `, ${result.date}` : ""}: ${result.snippet}`,
    })));

  return sources;
}

export function retrieveRagSources(query: string, sources: RagSource[]): RagSource[] {
  const normalizedQuery = normalizeRagQuery(query, sources);
  if (!normalizedQuery) return sources.slice(0, sourceLimit);

  const fuse = new Fuse(sources, {
    keys: ["title", "body", "kind"],
    threshold: 0.45,
    ignoreLocation: true,
  });

  const matches = fuse.search(normalizedQuery).map((result) => result.item);
  return (matches.length ? matches : sources).slice(0, sourceLimit);
}

export function makeLocalRagAnswer(query: string, sources: RagSource[]): string {
  if (!sources.length) {
    return "I could not find enough F1 context for that question yet. Try a driver, team, circuit, race, or season year.";
  }

  const top = sources[0];
  const supporting = sources.slice(1, 4);
  const details = supporting.map((source) => `- ${source.title}: ${source.body}`).join("\n");
  const isThai = containsThai(query);

  if (asksForTodayStart(query)) {
    const hasStartContext = sources.some((source) => /(start|starting|grid|เวลา|เริ่ม)/i.test(`${source.title} ${source.body}`));
    if (!hasStartContext) {
      return isThai
        ? [
          `ผมหาข้อมูลที่เกี่ยวกับ "${query}" แล้วเจอ match หลักเป็น ${top.title}`,
          "แต่ context ที่มีตอนนี้ยังไม่มีเวลาเริ่มแข่งวันนี้หรือตำแหน่งสตาร์ทที่ยืนยันได้ จึงไม่ควรตอบเป็นตัวเลขแบบเดาสุ่ม",
          supporting.length ? `\nข้อมูลที่เจอ:\n${details}` : "",
        ].filter(Boolean).join("\n\n")
        : [
          `I found ${top.title} as the strongest match for "${query}".`,
          "The retrieved context does not include a confirmed start time or starting grid for today, so I should not guess.",
          supporting.length ? `\nRetrieved context:\n${details}` : "",
        ].filter(Boolean).join("\n\n");
    }
  }

  if (isThai) {
    return [
      `จากข้อมูล F1 ที่ค้นเจอสำหรับ "${query || "การค้นหานี้"}" match หลักคือ ${top.title}`,
      top.body,
      supporting.length ? `\nข้อมูลประกอบ:\n${details}` : "",
    ].filter(Boolean).join("\n\n");
  }

  return [
    `Based on the retrieved F1 data for "${query || "this search"}", the strongest match is ${top.title}.`,
    top.body,
    supporting.length ? `\nUseful supporting context:\n${details}` : "",
  ].filter(Boolean).join("\n\n");
}

export function buildRagBundle(query: string, liveData: RagLiveData | null, webResults: WebResult[]): RagBundle {
  const allSources = buildRagSources(liveData, webResults);
  const sources = retrieveRagSources(query, allSources);
  return {
    answer: makeLocalRagAnswer(query, sources),
    sources,
  };
}
