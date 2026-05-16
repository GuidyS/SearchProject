import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarOff } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import RaceFlag from "@/components/RaceFlag";

import SiteHeader from "@/components/SiteHeader";
import { cachedJson } from "@/data/f1-cache";

const countryToFlagImg: Record<string, string> = {
  Australia: "au", China: "cn", Japan: "jp", Bahrain: "bh", "Saudi Arabia": "sa",
  USA: "us", Italy: "it", Monaco: "mc", Spain: "es", Canada: "ca", Austria: "at",
  UK: "gb", Belgium: "be", Hungary: "hu", Netherlands: "nl", Azerbaijan: "az",
  Singapore: "sg", Mexico: "mx", Brazil: "br", Qatar: "qa", UAE: "ae",
  France: "fr", Germany: "de",
};

const teamColors: Record<string, string> = {
  "McLaren": "hsl(25, 95%, 55%)",
  "Ferrari": "hsl(0, 80%, 50%)",
  "Red Bull": "hsl(220, 80%, 45%)",
  "Mercedes": "hsl(168, 100%, 40%)",
  "Aston Martin": "hsl(155, 70%, 35%)",
  "Alpine F1 Team": "hsl(200, 70%, 55%)",
  "Williams": "hsl(215, 90%, 50%)",
  "RB F1 Team": "hsl(220, 60%, 50%)",
  "Haas F1 Team": "hsl(0, 0%, 55%)",
  "Kick Sauber": "hsl(0, 80%, 45%)",
};

interface ApiRaceResult {
  round: string;
  raceName: string;
  Circuit: { circuitId: string; circuitName: string; Location: { country: string } };
  date: string;
  Results?: {
    position: string;
    Driver: { givenName: string; familyName: string };
    Constructor: { name: string };
    Time?: { time: string };
    laps: string;
    status: string;
    points: string;
  }[];
}

async function fetchRaceResults(year: number): Promise<ApiRaceResult[]> {
  const data = await cachedJson<any>(`https://api.jolpi.ca/ergast/f1/${year}/results.json?limit=500`);
  return data.MRData.RaceTable.Races || [];
}

const RaceResults = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: races, isLoading } = useQuery({
    queryKey: ["race-results", selectedYear],
    queryFn: () => fetchRaceResults(selectedYear).catch(() => []),
    staleTime: 1000 * 60 * 30,
  });

  const completedRaces = races?.filter((r) => r.Results && r.Results.length > 0) || [];
  const yearOptions = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i);

  return (
    <div className="dark min-h-screen bg-background">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-2 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground uppercase tracking-tight">{selectedYear} Race Results</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedYear((y) => Math.max(1950, y - 1))}
                className="w-7 h-7 rounded-lg bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-secondary border border-border rounded-lg px-2 py-1 text-sm font-bold text-foreground outline-none appearance-none cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={() => setSelectedYear((y) => Math.min(currentYear, y + 1))}
                disabled={selectedYear >= currentYear}
                className="w-7 h-7 rounded-lg bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
        <p className="text-sm text-muted-foreground mb-8">
          {isLoading ? "Loading..." : `${completedRaces.length} races completed · Live data from Jolpica F1 API`}
        </p>

        {isLoading && (
          <div className="bg-card border border-border rounded-xl p-6 animate-pulse space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-secondary/40 rounded" />
            ))}
          </div>
        )}

        {!isLoading && completedRaces.length === 0 && (
          <div className="text-center py-20">
            <CalendarOff className="text-muted-foreground mx-auto mb-3" size={48} />
            <p className="text-muted-foreground">No race results available for {selectedYear}</p>
          </div>
        )}

        {!isLoading && completedRaces.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1.5fr_0.8fr_1.3fr_1.2fr_0.6fr_1fr] gap-4 px-6 py-4 border-b border-border">
              <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">Grand Prix</span>
              <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">Date</span>
              <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">Winner</span>
              <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">Team</span>
              <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">Laps</span>
              <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground text-right">Time</span>
            </div>
            {completedRaces.map((race, i) => {
              const winner = race.Results?.[0];
              if (!winner) return null;
              const country = race.Circuit.Location.country;
              const flagImg = countryToFlagImg[country] || "";
              const teamColor = teamColors[winner.Constructor.name] || "hsl(0, 0%, 40%)";
              const d = new Date(race.date);
              const dateStr = d.toLocaleDateString("en", { day: "2-digit", month: "short" });

              return (
                <motion.div
                  key={race.round}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.02 }}
                  className="grid grid-cols-[1.5fr_0.8fr_1.3fr_1.2fr_0.6fr_1fr] gap-4 px-6 py-3.5 border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <RaceFlag flag="" flagImg={flagImg} className="text-base" />
                    
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {race.raceName.replace(" Grand Prix", " GP")}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-muted-foreground">{dateStr}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
                    <span className="text-sm font-medium text-foreground truncate">
                      {winner.Driver.givenName} {winner.Driver.familyName}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-muted-foreground truncate">{winner.Constructor.name}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-foreground">{winner.laps}</span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="text-sm text-muted-foreground font-mono truncate">{winner.Time?.time || winner.status}</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>
      <footer className="border-t border-border py-5 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">© 2026 F1 Search. Not affiliated with Formula 1 or FIA.</p>
          <div className="flex items-center gap-5">
            {["Privacy Policy", "Terms of Service", "Contact Support"].map((item) => (
              <a key={item} href="#" className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors">{item}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RaceResults;
