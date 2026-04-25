import { translateThaiQuery, containsThai } from "./thai-mappings";
import Fuse from "fuse.js";
import { f1Calendar2025 } from "./f1-calendar";

export interface SearchItem {
  name: string;
  type: "driver" | "team" | "circuit";
  detail: string;
  color?: string;
  icon: string;
}

const allItems: SearchItem[] = [
  { name: "Max Verstappen", type: "driver", detail: "Red Bull Racing · #3", color: "hsl(220, 80%, 45%)", icon: "person" },
  { name: "Lando Norris", type: "driver", detail: "McLaren · #1", color: "hsl(25, 95%, 55%)", icon: "person" },
  { name: "Charles Leclerc", type: "driver", detail: "Ferrari · #16", color: "hsl(0, 80%, 50%)", icon: "person" },
  { name: "Lewis Hamilton", type: "driver", detail: "Ferrari · #44", color: "hsl(0, 80%, 50%)", icon: "person" },
  { name: "Oscar Piastri", type: "driver", detail: "McLaren · #81", color: "hsl(25, 95%, 55%)", icon: "person" },
  { name: "George Russell", type: "driver", detail: "Mercedes · #63", color: "hsl(168, 100%, 40%)", icon: "person" },
  { name: "Fernando Alonso", type: "driver", detail: "Aston Martin · #14", color: "hsl(155, 70%, 35%)", icon: "person" },
  { name: "Carlos Sainz", type: "driver", detail: "Williams · #55", color: "hsl(215, 90%, 50%)", icon: "person" },
  { name: "McLaren", type: "team", detail: "Constructors' Champions", color: "hsl(25, 95%, 55%)", icon: "groups" },
  { name: "Ferrari", type: "team", detail: "Scuderia Ferrari", color: "hsl(0, 80%, 50%)", icon: "groups" },
  { name: "Red Bull Racing", type: "team", detail: "Oracle Red Bull Racing", color: "hsl(220, 80%, 45%)", icon: "groups" },
  { name: "Mercedes", type: "team", detail: "Mercedes-AMG Petronas", color: "hsl(168, 100%, 40%)", icon: "groups" },
  ...f1Calendar2025.map((r): SearchItem => ({
    name: r.circuit,
    type: "circuit",
    detail: r.name,
    icon: "location_on"
  }))
];

const fuseSearchF1 = new Fuse(allItems, {
  keys: ["name", "detail"],
  threshold: 0.4,
});

export function searchF1(query: string): SearchItem[] {
  let q = query;
  if (containsThai(q)) {
    q = translateThaiQuery(q);
  }
  return fuseSearchF1.search(q).map(res => res.item).slice(0, 6);
}

export function getPopularSearches(): SearchItem[] {
  return allItems.slice(0, 5);
}

// Web search results
export interface WebResult {
  title: string;
  snippet: string;
  source: string;
  url: string;
  date?: string;
  type: "article" | "news" | "video" | "race" | "standings";
  tags?: string[];
  raceData?: {
    circuit: string;
    results: { pos: number; driver: string; team: string; fastestLap: string; pts: number }[];
  };
  standingsData?: { driver: string; pts: number }[];
  
}

export function webSearch(query: string): { results: WebResult[]; totalResults: number } {
  let q = query.toLowerCase();
  if (containsThai(q)) {
    q = translateThaiQuery(q).toLowerCase();
  }
  const results: WebResult[] = [];

  // Always show standings
  results.push({
    title: "2025 World Drivers' Championship Standings",
    snippet: "Current championship standings after 24 races.",
    source: "formula1.com",
    url: "https://www.formula1.com/en/results/2025/drivers",
    type: "standings",
    standingsData: [
      { driver: "Lando Norris", pts: 423 },
      { driver: "Oscar Piastri", pts: 389 },
      { driver: "Max Verstappen", pts: 362 },
      { driver: "George Russell", pts: 245 },
      { driver: "Charles Leclerc", pts: 228 },
    ],
  });

  if (q.includes("verstappen") || q.includes("red bull") || q.includes("max")) {
    results.push({
      title: "Max Verstappen wins Japanese Grand Prix 2025",
      snippet: "Max Verstappen dominated at Suzuka to claim his third win of the 2025 season.",
      source: "formula1.com",
      url: "https://www.formula1.com/en/latest/article/verstappen-wins-japanese-grand-prix-2025",
      date: "6 Apr 2025",
      type: "race",
      raceData: {
        circuit: "Suzuka International Racing Course · 53 Laps",
        results: [
          { pos: 1, driver: "Max Verstappen", team: "Red Bull Racing", fastestLap: "1:30.983", pts: 25 },
          { pos: 2, driver: "Lando Norris", team: "McLaren", fastestLap: "1:31.204", pts: 18 },
          { pos: 3, driver: "Oscar Piastri", team: "McLaren", fastestLap: "1:31.567", pts: 15 },
        ],
      },
    });
  }

  results.push({
    title: `F1 ${query} - Latest News and Updates`,
    snippet: `The latest news, results, and analysis about ${query} in Formula 1.`,
    source: "motorsport.com",
    url: `https://www.motorsport.com/f1/news/?q=${encodeURIComponent(query)}`,
    date: "Mar 2026",
    type: "article",
    tags: ["F1", "News"],
  });

  results.push({
    title: `${query} - Wikipedia`,
    snippet: `Comprehensive information about ${query} in the world of Formula 1 racing.`,
    source: "wikipedia.org",
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/ /g, '_'))}`,
    type: "article",
  });

  return { results, totalResults: 847000 };
}
