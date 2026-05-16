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
  relevanceScore?: number;
  matchedKeywords?: string[];
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
  previousRace?: ApiRace | null;
  nextRace?: ApiRace | null;
  driverRaces?: ApiRace[];
  year: number;
  parsedQuery: string;
}

const sourceLimit = 8;
const embeddingDimensions = 64;
const sourceTypeBoost: Record<RagSource["kind"], number> = {
  driver: 0.22,
  team: 0.12,
  circuit: 0.12,
  standing: 0.08,
  race: 0.15,
  article: 0.06,
  media: 0.03,
};
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

function tokenizeForSearch(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function embedText(text: string): number[] {
  const vector = Array.from({ length: embeddingDimensions }, () => 0);
  for (const token of tokenizeForSearch(text)) {
    const hash = hashToken(token);
    const index = hash % embeddingDimensions;
    vector[index] += (hash & 1) === 0 ? 1 : -1;
  }
  const magnitude = Math.hypot(...vector) || 1;
  return vector.map((value) => value / magnitude);
}

function cosineSimilarity(a: number[], b: number[]): number {
  return a.reduce((total, value, index) => total + value * b[index], 0);
}

function getMatchedKeywords(query: string, source: RagSource): string[] {
  const sourceText = `${source.title} ${source.body}`.toLowerCase();
  return [...new Set(tokenizeForSearch(query))]
    .filter((token) => token.length > 2 && sourceText.includes(token))
    .slice(0, 5);
}

function recencyScore(source: RagSource): number {
  const date = sourceRaceDate(source);
  if (!date) return 0;
  const ageDays = Math.abs(Date.now() - new Date(date).getTime()) / 86_400_000;
  return Math.max(0, 1 - ageDays / 365);
}

function scoreRagSources(query: string, sources: RagSource[]): RagSource[] {
  const normalizedQuery = normalizeRagQuery(query, sources);
  const queryText = normalizedQuery || query;
  if (!queryText.trim()) {
    return sources.slice(0, sourceLimit).map((source) => ({
      ...source,
      relevanceScore: source.relevanceScore ?? 100,
      matchedKeywords: [],
    }));
  }

  const queryEmbedding = embedText(queryText);
  const fuse = new Fuse(sources, {
    keys: ["title", "body", "kind"],
    threshold: 0.55,
    ignoreLocation: true,
    includeScore: true,
  });
  const fuzzyScores = new Map(
    fuse.search(queryText).map((result) => [result.item.id, 1 - Math.min(result.score ?? 1, 1)]),
  );

  return sources
    .map((source) => {
      const semantic = Math.max(0, cosineSimilarity(queryEmbedding, embedText(`${source.title} ${source.body}`)));
      const fuzzy = fuzzyScores.get(source.id) ?? 0;
      const typeBoost = sourceTypeBoost[source.kind];
      const freshness = recencyScore(source) * 0.12;
      const exactKeywordBoost = getMatchedKeywords(queryText, source).length > 0 ? 0.08 : 0;
      const relevanceScore = Math.round(Math.min(1, (semantic * 0.42) + (fuzzy * 0.34) + typeBoost + freshness + exactKeywordBoost) * 100);

      return {
        ...source,
        relevanceScore,
        matchedKeywords: getMatchedKeywords(queryText, source),
      };
    })
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
    .slice(0, sourceLimit);
}

function prioritizeSource(primary: RagSource, sources: RagSource[], query: string): RagSource[] {
  const scoredRest = scoreRagSources(query, sources.filter((source) => source.id !== primary.id));
  const [scoredPrimary] = scoreRagSources(query, [primary]);
  return [
    { ...primary, ...scoredPrimary, relevanceScore: Math.max(scoredPrimary?.relevanceScore ?? 0, 96) },
    ...scoredRest,
  ].slice(0, sourceLimit);
}

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
    /(start|starting|grid|time|race time|qualifying|what time)/i.test(lowerQuery) ||
    /(เริ่ม|กี่โมง|กี่โมงวันนี้|เท่าไหร่|สตาร์ท|เวลา|กริด)/.test(query)
  );
}

function asksForTodayVenue(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return (
    /(today).*(where|venue|circuit|track|race|grand prix)/i.test(lowerQuery) ||
    /(where|venue|circuit|track).*(today)/i.test(lowerQuery) ||
    /(วันนี้).*(แข่งที่ไหน|ที่ไหน|สนาม|แข่ง)/.test(query) ||
    /(แข่งที่ไหน|ที่ไหน|สนาม|แข่ง).*(วันนี้)/.test(query)
  );
}

function asksForLatestCircuit(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return (
    /(latest|last|recent).*(circuit|track|venue|race|grand prix|where)/i.test(lowerQuery) ||
    /(circuit|track|venue|where).*(latest|last|recent)/i.test(lowerQuery) ||
    /(สนาม|แข่งที่ไหน|ที่ไหน).*(ล่าสุด|ล่าสุ|last|latest)/i.test(query) ||
    /(ล่าสุด|ล่าสุ).*(สนาม|แข่งที่ไหน|ที่ไหน)/i.test(query)
  );
}

function sourceRaceDate(source: RagSource): string {
  const match = source.body.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  return match?.[1] || "";
}

function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatThaiTimeFromUtc(time?: string): string {
  if (!time) return "";
  const [hourText, minuteText] = time.replace("Z", "").split(":");
  const hour = Number.parseInt(hourText, 10);
  if (Number.isNaN(hour) || !minuteText) return time;
  return `${String((hour + 7) % 24).padStart(2, "0")}:${minuteText} น. ไทย`;
}

function formatRaceDate(date: string): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function extractRaceFacts(source: RagSource) {
  const heldMatch = source.body.match(/^(.+?) was held at (.+?) in (.+?), (.+?) on (20\d{2}-\d{2}-\d{2})\./);
  const raceName = source.title.replace(/^(Latest|Next|Previous|Driver) race:\s*/i, "") || heldMatch?.[1] || source.title;
  const circuit = heldMatch?.[2] || "";
  const locality = heldMatch?.[3] || "";
  const country = heldMatch?.[4] || "";
  const date = heldMatch?.[5] || sourceRaceDate(source);
  const sessions = [...source.body.matchAll(/\b(FP1|FP2|FP3|Sprint|Qualifying|Race start)\s+(20\d{2}-\d{2}-\d{2})\s+([^.\n]+)\./g)]
    .map((match) => ({
      label: match[1] === "Race start" ? "Race" : match[1],
      date: match[2],
      time: match[3],
    }));

  return { raceName, circuit, locality, country, date, sessions };
}

function formatRaceOverview(source: RagSource, intro: string): string {
  const facts = extractRaceFacts(source);
  const lines = [
    intro,
    facts.circuit ? `สนาม: ${facts.circuit}${facts.locality || facts.country ? ` (${[facts.locality, facts.country].filter(Boolean).join(", ")})` : ""}` : "",
    facts.date ? `วันที่แข่ง: ${formatRaceDate(facts.date)}` : "",
  ].filter(Boolean);

  const sessionLines = facts.sessions.map((session) => `- ${session.label}: ${formatRaceDate(session.date)} ${session.time}`);
  return [
    lines.join("\n"),
    sessionLines.length ? `\nตารางเวลา:\n${sessionLines.join("\n")}` : "",
  ].filter(Boolean).join("\n");
}

function asksForPreviousCircuit(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return (
    /(previous|before|prior).*(circuit|track|venue|race|grand prix|where)/i.test(lowerQuery) ||
    /(circuit|track|venue|where).*(previous|before|prior)/i.test(lowerQuery) ||
    /(สนาม|แข่งที่ไหน|ที่ไหน).*(ก่อนหน้า|ก่อนหน้านี้|ที่แล้ว|รอบก่อน|สนามก่อน)/i.test(query) ||
    /(ก่อนหน้า|ก่อนหน้านี้|ที่แล้ว|รอบก่อน|สนามก่อน).*(สนาม|แข่งที่ไหน|ที่ไหน)/i.test(query)
  );
}

function asksForNextCircuit(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return (
    /(next|upcoming).*(circuit|track|venue|race|grand prix|where)/i.test(lowerQuery) ||
    /(circuit|track|venue|where).*(next|upcoming)/i.test(lowerQuery) ||
    /(สนาม|แข่งที่ไหน|ที่ไหน).*(ถัดไป|ต่อไป|หน้า|สนามหน้า|เรซหน้า)/i.test(query) ||
    /(ถัดไป|ต่อไป|สนามหน้า|เรซหน้า).*(สนาม|แข่งที่ไหน|ที่ไหน)/i.test(query)
  );
}

function asksForStandingsLeader(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return (
    /(leader|leading|p1|standings|championship|points)/i.test(lowerQuery) ||
    /(คะแนน|ตาราง|อันดับ|ผู้นำ|นำอยู่|ที่หนึ่ง|แชมป์)/.test(query)
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
  const locality = race.Circuit.Location?.locality || "unknown locality";
  const country = race.Circuit.Location?.country || "unknown country";
  const sessionDetails = [
    race.FirstPractice ? `FP1 ${race.FirstPractice.date} ${formatThaiTimeFromUtc(race.FirstPractice.time)}.` : "",
    race.SecondPractice ? `FP2 ${race.SecondPractice.date} ${formatThaiTimeFromUtc(race.SecondPractice.time)}.` : "",
    race.ThirdPractice ? `FP3 ${race.ThirdPractice.date} ${formatThaiTimeFromUtc(race.ThirdPractice.time)}.` : "",
    race.Sprint ? `Sprint ${race.Sprint.date} ${formatThaiTimeFromUtc(race.Sprint.time)}.` : "",
    race.Qualifying ? `Qualifying ${race.Qualifying.date} ${formatThaiTimeFromUtc(race.Qualifying.time)}.` : "",
    race.time ? `Race start ${race.date} ${formatThaiTimeFromUtc(race.time)}.` : "",
  ].filter(Boolean).join(" ");

  return {
    id: `race-${race.round}-${title}`,
    title,
    kind: "race",
    body: [
      `${race.raceName} was held at ${race.Circuit.circuitName} in ${locality}, ${country} on ${race.date}.`,
      sessionDetails,
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
    if (liveData.previousRace) sources.push(raceSource(liveData.previousRace, `Previous race: ${liveData.previousRace.raceName}`));
    if (liveData.lastRace) sources.push(raceSource(liveData.lastRace, `Latest race: ${liveData.lastRace.raceName}`));
    if (liveData.nextRace) sources.push(raceSource(liveData.nextRace, `Next race: ${liveData.nextRace.raceName}`));
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
  if (asksForTodayStart(query)) {
    const today = todayIsoDate();
    const todayRace = sources.find((source) => source.kind === "race" && sourceRaceDate(source) === today);
    const nextRace = sources.find((source) => source.kind === "race" && source.title.toLowerCase().startsWith("next race:"));
    const latestRace = sources.find((source) => source.kind === "race" && source.title.toLowerCase().startsWith("latest race:"));
    const primary = todayRace || nextRace || latestRace;
    if (primary) {
      return prioritizeSource(primary, sources, query);
    }
  }

  if (asksForTodayVenue(query)) {
    const today = todayIsoDate();
    const todayRace = sources.find((source) => source.kind === "race" && sourceRaceDate(source) === today);
    const nextRace = sources.find((source) => source.kind === "race" && source.title.toLowerCase().startsWith("next race:"));
    const latestRace = sources.find((source) => source.kind === "race" && source.title.toLowerCase().startsWith("latest race:"));
    const primary = todayRace || nextRace || latestRace;
    if (primary) {
      return prioritizeSource(primary, sources, query);
    }
  }

  if (asksForPreviousCircuit(query)) {
    const previousRace = sources.find((source) => source.kind === "race" && source.title.toLowerCase().startsWith("previous race:"));
    if (previousRace) {
      return prioritizeSource(previousRace, sources, query);
    }
  }

  if (asksForNextCircuit(query)) {
    const nextRace = sources.find((source) => source.kind === "race" && source.title.toLowerCase().startsWith("next race:"));
    if (nextRace) {
      return prioritizeSource(nextRace, sources, query);
    }
  }

  if (asksForLatestCircuit(query)) {
    const latestRace = sources.find((source) => source.kind === "race" && source.title.toLowerCase().startsWith("latest race:"));
    if (latestRace) {
      return prioritizeSource(latestRace, sources, query);
    }
  }

  if (asksForStandingsLeader(query)) {
    const leader = sources.find((source) => source.kind === "standing" && /\bP1\b/.test(source.body));
    if (leader) {
      return prioritizeSource(leader, sources, query);
    }
  }

  return scoreRagSources(query, sources);
}

export function makeLocalRagAnswer(query: string, sources: RagSource[]): string {
  if (!sources.length) {
    return "I could not find enough F1 context for that question yet. Try a driver, team, circuit, race, or season year.";
  }

  const top = sources[0];
  const supporting = sources.slice(1, 4);
  const details = supporting.map((source) => `- ${source.title}: ${source.body}`).join("\n");
  const isThai = containsThai(query);

  if (asksForTodayStart(query) && top.kind === "race") {
    const raceStartMatch = top.body.match(/Race start\s+(20\d{2}-\d{2}-\d{2})\s+([^.\n]+)/);
    const isToday = sourceRaceDate(top) === todayIsoDate();

    if (raceStartMatch) {
      return isThai
        ? [
          formatRaceOverview(
            top,
            isToday
              ? `จากข้อมูล F1 API วันนี้ Race เริ่มเวลา ${raceStartMatch[2]}`
              : `ไม่พบ Race ที่ตรงกับวันนี้ในข้อมูล API/ตารางเว็บ\nสนามถัดไปคือ ${top.title.replace(/^(Latest|Next|Previous) race:\s*/i, "")} และ Race เริ่มเวลา ${raceStartMatch[2]}`,
          ),
          supporting.length ? `\nข้อมูลประกอบ:\n${details}` : "",
        ].filter(Boolean).join("\n\n")
        : [
          isToday
            ? `According to the F1 API data, today's race starts at ${raceStartMatch[2]}.`
            : `No race dated today was found. The next race is ${top.title.replace(/^(Latest|Next|Previous) race:\s*/i, "")}, starting at ${raceStartMatch[2]}.`,
          top.body,
          supporting.length ? `\nRetrieved context:\n${details}` : "",
        ].filter(Boolean).join("\n\n");
    }

    return isThai
      ? [
        `ไม่พบเวลาเริ่มแข่งที่ยืนยันได้จากข้อมูล API/ตารางเว็บสำหรับคำถาม "${query}"`,
        top.body,
        supporting.length ? `\nข้อมูลประกอบ:\n${details}` : "",
      ].filter(Boolean).join("\n\n")
      : [
        `No confirmed race start time was found in the API/site calendar for "${query}".`,
        top.body,
        supporting.length ? `\nRetrieved context:\n${details}` : "",
      ].filter(Boolean).join("\n\n");
  }

  if (asksForTodayVenue(query) && top.kind === "race") {
    const isToday = sourceRaceDate(top) === todayIsoDate();
    return isThai
      ? [
        isToday
          ? `จากข้อมูล F1 API วันนี้มีแข่งที่ ${top.title.replace(/^(Latest|Next|Previous) race:\s*/i, "")}`
          : `ไม่พบรายการแข่ง F1 ที่ตรงกับวันนี้จากข้อมูล API/ตารางในเว็บ สนามถัดไปคือ ${top.title.replace(/^(Latest|Next|Previous) race:\s*/i, "")}`,
        top.body,
        supporting.length ? `\nข้อมูลประกอบ:\n${details}` : "",
      ].filter(Boolean).join("\n\n")
      : [
        isToday
          ? `According to the F1 API data, today's race venue is ${top.title.replace(/^(Latest|Next|Previous) race:\s*/i, "")}.`
          : `No F1 race dated today was found in the API/site calendar. The next race venue is ${top.title.replace(/^(Latest|Next|Previous) race:\s*/i, "")}.`,
        top.body,
        supporting.length ? `\nRetrieved context:\n${details}` : "",
      ].filter(Boolean).join("\n\n");
  }

  if (asksForPreviousCircuit(query) && top.kind === "race") {
    return isThai
      ? [
        `จากข้อมูลตารางแข่ง สนามก่อนหน้านี้คือ ${top.title.replace(/^Previous race:\s*/i, "")}`,
        top.body,
        supporting.length ? `\nข้อมูลประกอบ:\n${details}` : "",
      ].filter(Boolean).join("\n\n")
      : [
        `The previous race venue is ${top.title.replace(/^Previous race:\s*/i, "")}.`,
        top.body,
        supporting.length ? `\nRetrieved context:\n${details}` : "",
      ].filter(Boolean).join("\n\n");
  }

  if (asksForNextCircuit(query) && top.kind === "race") {
    return isThai
      ? [
        `จากข้อมูลตารางแข่ง สนามถัดไปคือ ${top.title.replace(/^Next race:\s*/i, "")}`,
        top.body,
        supporting.length ? `\nข้อมูลประกอบ:\n${details}` : "",
      ].filter(Boolean).join("\n\n")
      : [
        `The next race venue is ${top.title.replace(/^Next race:\s*/i, "")}.`,
        top.body,
        supporting.length ? `\nRetrieved context:\n${details}` : "",
      ].filter(Boolean).join("\n\n");
  }

  if (asksForLatestCircuit(query) && top.kind === "race") {
    return isThai
      ? [
        `จากข้อมูลตารางแข่ง สนามล่าสุดคือ ${top.title.replace(/^Latest race:\s*/i, "")}`,
        top.body,
        supporting.length ? `\nข้อมูลประกอบ:\n${details}` : "",
      ].filter(Boolean).join("\n\n")
      : [
        `The latest race venue is ${top.title.replace(/^Latest race:\s*/i, "")}.`,
        top.body,
        supporting.length ? `\nRetrieved context:\n${details}` : "",
      ].filter(Boolean).join("\n\n");
  }

  if (asksForStandingsLeader(query) && top.kind === "standing") {
    return isThai
      ? [
        `จากข้อมูล standings ผู้นำตารางตอนนี้คือ ${top.title.replace(/^\d{4} standing:\s*/i, "")}`,
        top.body,
        supporting.length ? `\nข้อมูลประกอบ:\n${details}` : "",
      ].filter(Boolean).join("\n\n")
      : [
        `The current standings leader is ${top.title.replace(/^\d{4} standing:\s*/i, "")}.`,
        top.body,
        supporting.length ? `\nRetrieved context:\n${details}` : "",
      ].filter(Boolean).join("\n\n");
  }

  if (isThai) {
    return [
      `สรุปจากข้อมูล F1 API และผลลัพธ์ในเว็บสำหรับ "${query || "การค้นหานี้"}": ${top.title}`,
      top.body,
      supporting.length ? `\nข้อมูลประกอบ:\n${details}` : "",
    ].filter(Boolean).join("\n\n");
  }

  return [
    `Search summary for "${query || "this search"}": ${top.title}.`,
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
