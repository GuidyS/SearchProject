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
  // Drivers
  { name: "Max Verstappen", type: "driver", detail: "Red Bull Racing · #3", color: "hsl(220, 80%, 45%)", icon: "person" },
  { name: "Liam Lawson", type: "driver", detail: "Red Bull Racing · #30", color: "hsl(220, 80%, 45%)", icon: "person" },
  { name: "Lando Norris", type: "driver", detail: "McLaren · #1", color: "hsl(25, 95%, 55%)", icon: "person" },
  { name: "Oscar Piastri", type: "driver", detail: "McLaren · #81", color: "hsl(25, 95%, 55%)", icon: "person" },
  { name: "Charles Leclerc", type: "driver", detail: "Ferrari · #16", color: "hsl(0, 80%, 50%)", icon: "person" },
  { name: "Lewis Hamilton", type: "driver", detail: "Ferrari · #44", color: "hsl(0, 80%, 50%)", icon: "person" },
  { name: "George Russell", type: "driver", detail: "Mercedes · #63", color: "hsl(168, 100%, 40%)", icon: "person" },
  { name: "Kimi Antonelli", type: "driver", detail: "Mercedes · #12", color: "hsl(168, 100%, 40%)", icon: "person" },
  { name: "Fernando Alonso", type: "driver", detail: "Aston Martin · #14", color: "hsl(155, 70%, 35%)", icon: "person" },
  { name: "Lance Stroll", type: "driver", detail: "Aston Martin · #18", color: "hsl(155, 70%, 35%)", icon: "person" },
  { name: "Pierre Gasly", type: "driver", detail: "Alpine · #10", color: "hsl(330, 70%, 50%)", icon: "person" },
  { name: "Jack Doohan", type: "driver", detail: "Alpine · #7", color: "hsl(330, 70%, 50%)", icon: "person" },
  { name: "Carlos Sainz", type: "driver", detail: "Williams · #55", color: "hsl(215, 90%, 50%)", icon: "person" },
  { name: "Alex Albon", type: "driver", detail: "Williams · #23", color: "hsl(215, 90%, 50%)", icon: "person" },
  { name: "Yuki Tsunoda", type: "driver", detail: "RB · #22", color: "hsl(230, 80%, 50%)", icon: "person" },
  { name: "Isack Hadjar", type: "driver", detail: "RB · #6", color: "hsl(230, 80%, 50%)", icon: "person" },
  { name: "Esteban Ocon", type: "driver", detail: "Haas F1 Team · #31", color: "hsl(0, 0%, 50%)", icon: "person" },
  { name: "Oliver Bearman", type: "driver", detail: "Haas F1 Team · #87", color: "hsl(0, 0%, 50%)", icon: "person" },
  { name: "Nico Hülkenberg", type: "driver", detail: "Kick Sauber · #27", color: "hsl(120, 80%, 40%)", icon: "person" },
  { name: "Gabriel Bortoleto", type: "driver", detail: "Kick Sauber · #5", color: "hsl(120, 80%, 40%)", icon: "person" },

  // Teams
  { name: "McLaren", type: "team", detail: "Constructors'", color: "hsl(25, 95%, 55%)", icon: "groups" },
  { name: "Ferrari", type: "team", detail: "Scuderia Ferrari", color: "hsl(0, 80%, 50%)", icon: "groups" },
  { name: "Red Bull Racing", type: "team", detail: "Oracle Red Bull Racing", color: "hsl(220, 80%, 45%)", icon: "groups" },
  { name: "Mercedes", type: "team", detail: "Mercedes-AMG Petronas", color: "hsl(168, 100%, 40%)", icon: "groups" },
  { name: "Aston Martin", type: "team", detail: "Aston Martin Aramco", color: "hsl(155, 70%, 35%)", icon: "groups" },
  { name: "Alpine", type: "team", detail: "BWT Alpine F1 Team", color: "hsl(330, 70%, 50%)", icon: "groups" },
  { name: "Williams", type: "team", detail: "Williams Racing", color: "hsl(215, 90%, 50%)", icon: "groups" },
  { name: "RB", type: "team", detail: "Visa Cash App RB", color: "hsl(230, 80%, 50%)", icon: "groups" },
  { name: "Haas F1 Team", type: "team", detail: "MoneyGram Haas F1 Team", color: "hsl(0, 0%, 50%)", icon: "groups" },
  { name: "Kick Sauber", type: "team", detail: "Stake F1 Team Kick Sauber", color: "hsl(120, 80%, 40%)", icon: "groups" },

  // Circuits
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
  let q = query.trim();
  if (!q) return [];

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
  type: "article" | "news" | "video" | "race" | "standings" | "social";
  tags?: string[];
  platform?: "youtube" | "instagram" | "twitter" | "tiktok";
  thumbnail?: string;
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


  if (query && query.trim() !== '') {
    const yearMatch = query.match(/\b(20\d{2})\b/);
    const displayYear = yearMatch ? yearMatch[1] : "2026";
    
    // Attempt logic to find canonical name, else strip year from input
    const f1Results = searchF1(query);
    const qName = f1Results.length > 0 ? f1Results[0].name : query.replace(/\b20\d{2}\b/g, '').trim() || query.trim();

    results.push({
      title: `${qName} | Exclusive Interview ${displayYear}`,
      snippet: `Hear directly from ${qName} about the latest race strategy, team dynamics, and upcoming challenges in this live interview.`,
      source: "YouTube F1",
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(qName + ' interview ' + displayYear)}`,
      date: "10 mins ago",
      type: "video",
      platform: "youtube",
      tags: ["Interview", "Live", "Realtime"],
    });

    results.push({
      title: `Latest Update from ${qName}`,
      snippet: `"Focusing on the next race! 💪🏎️ The car feels great. Big thanks to the fans for the amazing support."`,
      source: "@" + qName.replace(/\s+/g, '').toLowerCase(),
      url: `https://www.instagram.com/explore/tags/${encodeURIComponent(qName.replace(/\s+/g, '').toLowerCase())}/`,
      date: "Just now",
      type: "social",
      platform: "instagram",
      tags: ["IG", "Realtime"],
    });

    results.push({
      title: `${qName} - Best Highlights & Overtakes ${displayYear}`,
      snippet: `Watch the most intense wheel-to-wheel battles, epic radio moments, and overtakes from ${qName} in ${displayYear}.`,
      source: "F1 Official",
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(qName + ' f1 highlights ' + displayYear)}`,
      date: "2 hours ago",
      type: "video",
      platform: "youtube",
      tags: ["Highlights", "Action"],
    });
  }

  return { results, totalResults: 847000 };
}
