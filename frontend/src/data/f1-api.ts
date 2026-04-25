import { translateThaiQuery, containsThai } from "./thai-mappings";
import Fuse from "fuse.js";

const API_BASE = "https://api.jolpi.ca/ergast/f1";

export interface ApiDriver {
  driverId: string;
  givenName: string;
  familyName: string;
  nationality: string;
  permanentNumber?: string;
  dateOfBirth?: string;
  url?: string;
}

export interface ApiConstructor {
  constructorId: string;
  name: string;
  nationality: string;
  url?: string;
}

export interface ApiCircuit {
  circuitId: string;
  circuitName: string;
  Location: { country: string; locality: string };
  url?: string;
}

export interface ApiRaceResult {
  position: string;
  Driver: ApiDriver;
  Constructor: ApiConstructor;
  Time?: { time: string };
  FastestLap?: { Time: { time: string }; rank: string };
  points: string;
  status: string;
}

export interface ApiRace {
  round: string;
  raceName: string;
  Circuit: ApiCircuit;
  date: string;
  Results?: ApiRaceResult[];
}

export interface ApiStanding {
  position: string;
  points: string;
  wins: string;
  Driver: ApiDriver;
  Constructors: ApiConstructor[];
}

// Parse year from query: "Lando 2023" or "แลนโด 2023" → { query: "lando", year: 2023 }
export function parseYearFromQuery(raw: string): { query: string; year: number } {
  const currentYear = new Date().getFullYear();
  const yearMatch = raw.match(/\b(19[5-9]\d|20[0-9]\d)\b/);
  let query = raw;
  let year = currentYear;
  if (yearMatch) {
    query = raw.replace(yearMatch[0], "").trim();
    year = parseInt(yearMatch[0]);
  } else {
    query = raw.trim();
  }
  // Translate Thai to English if needed
  if (containsThai(query)) {
    query = translateThaiQuery(query);
  }
  return { query, year };
}

// Search drivers
export async function searchDrivers(query: string, year: number): Promise<ApiDriver[]> {
  try {
    const res = await fetch(`${API_BASE}/${year}/drivers.json?limit=100`);
    if (!res.ok) return [];
    const data = await res.json();
    const drivers: ApiDriver[] = data.MRData.DriverTable.Drivers || [];
    
    if (!query.trim()) return drivers;
    
    const fuse = new Fuse(drivers, {
      keys: [
        "givenName", 
        "familyName",
        { name: "fullName", getFn: (d: ApiDriver) => `${d.givenName} ${d.familyName}` }
      ],
      threshold: 0.2
    });
    return fuse.search(query).map(r => r.item);
  } catch {
    return [];
  }
}

// Search constructors
export async function searchConstructors(query: string, year: number): Promise<ApiConstructor[]> {
  try {
    const res = await fetch(`${API_BASE}/${year}/constructors.json?limit=100`);
    if (!res.ok) return [];
    const data = await res.json();
    const constructors: ApiConstructor[] = data.MRData.ConstructorTable.Constructors || [];
    
    if (!query.trim()) return constructors;
    
    const fuse = new Fuse(constructors, {
      keys: ["name"],
      threshold: 0.2
    });
    return fuse.search(query).map(r => r.item);
  } catch {
    return [];
  }
}

// Search circuits
export async function searchCircuits(query: string, year: number): Promise<ApiCircuit[]> {
  try {
    const res = await fetch(`${API_BASE}/${year}/circuits.json?limit=100`);
    if (!res.ok) return [];
    const data = await res.json();
    const circuits: ApiCircuit[] = data.MRData.CircuitTable.Circuits || [];
    
    if (!query.trim()) return circuits;
    
    const fuse = new Fuse(circuits, {
      keys: [
        "circuitName", 
        "Location.country", 
        "Location.locality",
        { name: "combined", getFn: (c: ApiCircuit) => `${c.circuitName} ${c.Location.locality} ${c.Location.country}` }
      ],
      threshold: 0.2
    });
    return fuse.search(query).map(r => r.item);
  } catch {
    return [];
  }
}

// Get driver standings
export async function getDriverStandings(year: number): Promise<ApiStanding[]> {
  try {
    const res = await fetch(`${API_BASE}/${year}/driverStandings.json`);
    if (!res.ok) return [];
    const data = await res.json();
    const lists = data.MRData.StandingsTable.StandingsLists;
    if (!lists || lists.length === 0) return [];
    return lists[0].DriverStandings || [];
  } catch {
    return [];
  }
}

// Get race results for a specific driver
export async function getDriverResults(driverId: string, year: number): Promise<ApiRace[]> {
  try {
    const res = await fetch(`${API_BASE}/${year}/drivers/${driverId}/results.json?limit=100`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.MRData.RaceTable.Races || [];
  } catch {
    return [];
  }
}

// Get latest race result
export async function getLatestRaceResult(year: number): Promise<ApiRace | null> {
  try {
    const res = await fetch(`${API_BASE}/${year}/results/last.json`);
    if (!res.ok) return null;
    const data = await res.json();
    const races = data.MRData.RaceTable.Races;
    return races && races.length > 0 ? races[0] : null;
  } catch {
    return null;
  }
}
