import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import RaceFlag from "@/components/RaceFlag";
import SiteHeader from "@/components/SiteHeader";
import { getDriverHeadshots } from "@/data/live-api";
import { cachedJson } from "@/data/f1-cache";

const nationalityToFlagImg: Record<string, string> = {
  British: "gb", Dutch: "nl", Monegasque: "mc", Australian: "au", Spanish: "es",
  Mexican: "mx", Finnish: "fi", German: "de", French: "fr", Canadian: "ca",
  Japanese: "jp", Chinese: "cn", Thai: "th", Italian: "it", "New Zealander": "nz",
  Argentine: "ar", Brazilian: "br", American: "us", Danish: "de",
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
  "Audi": "hsl(0, 0%, 40%)",
  "Cadillac F1 Team": "hsl(45, 80%, 50%)",
};

interface ApiDriverStanding {
  position: string;
  points: string;
  wins: string;
  Driver: {
    driverId: string;
    givenName: string;
    familyName: string;
    nationality: string;
    permanentNumber?: string;
  };
  Constructors: { constructorId: string; name: string }[];
}

async function fetchDriverStandings(year: number): Promise<ApiDriverStanding[]> {
  const data = await cachedJson<any>(`https://api.jolpi.ca/ergast/f1/${year}/driverStandings.json`);
  const lists = data.MRData.StandingsTable.StandingsLists;
  if (!lists || lists.length === 0) return [];
  return lists[0].DriverStandings || [];
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 1950 + 2 }, (_, i) => currentYear + 1 - i);

const Drivers = () => {
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: standings, isLoading } = useQuery({
    queryKey: ["driver-standings", selectedYear],
    queryFn: () => fetchDriverStandings(selectedYear).catch(() => []),
    staleTime: 1000 * 60 * 30,
  });

  const { data: headshots } = useQuery({
    queryKey: ["driver-headshots"],
    queryFn: getDriverHeadshots,
    staleTime: 1000 * 60 * 60,
  });

  return (
    <div className="dark min-h-screen bg-background">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4 flex-wrap mb-1">
            <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight">
              <span className="text-primary">{selectedYear}</span>
              <span className="text-foreground ml-2">Drivers</span>
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedYear((y) => Math.max(1950, y - 1))}
                disabled={selectedYear <= 1950}
                className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm font-bold text-foreground outline-none focus:border-primary/40 appearance-none cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={() => setSelectedYear((y) => Math.min(currentYear + 1, y + 1))}
                disabled={selectedYear >= currentYear + 1}
                className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-8">
            {isLoading ? "Loading from API..." : `${standings?.length || 0} drivers · Live standings from Jolpica F1 API`}
          </p>
        </motion.div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 min-h-[140px] animate-pulse">
                <div className="h-3 w-16 bg-secondary rounded mb-2" />
                <div className="h-5 w-32 bg-secondary rounded mb-1" />
                <div className="h-3 w-20 bg-secondary/60 rounded" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && standings && standings.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No driver standings available for {selectedYear}</p>
          </div>
        )}

        {standings && standings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {standings.map((s, i) => {
              const teamName = s.Constructors[0]?.name || "Unknown";
              const color = teamColors[teamName] || "hsl(0, 0%, 40%)";
              const flagImg = nationalityToFlagImg[s.Driver.nationality] || "";
              return (
                <motion.a
                  key={s.Driver.driverId}
                  href={`/driver/${s.Driver.driverId}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * i }}
                  className="group relative rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-all duration-300 cursor-pointer"
                  style={{ background: `linear-gradient(135deg, ${color} 0%, hsl(0 0% 8%) 100%)` }}
                >
                  <div className="absolute bottom-2 left-3 text-[80px] font-black leading-none opacity-[0.12] select-none z-0" style={{ fontStyle: "italic" }}>
                    {s.Driver.permanentNumber || s.position}
                  </div>
                  {headshots && headshots[s.Driver.familyName.substring(0,3).toUpperCase()] && (
                    <img
                      src={headshots[s.Driver.familyName.substring(0,3).toUpperCase()]}
                      alt={s.Driver.familyName}
                      className="absolute bottom-0 right-[-5%] h-[120%] w-auto object-contain object-bottom pointer-events-none transition-transform duration-300 group-hover:scale-105 z-10"
                      style={{ filter: "drop-shadow(-3px 0px 8px rgba(0,0,0,0.8))" }}
                    />
                  )}
                  <div className="relative p-5 pb-4 min-h-[140px] flex flex-col justify-between z-20">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>{s.Driver.givenName}</p>
                        <span className="text-[9px] font-bold bg-black/30 text-white/80 px-1.5 py-0.5 rounded-full">P{s.position}</span>
                      </div>
                      <p className="text-xl font-black uppercase tracking-tight leading-tight" style={{ color: "rgba(255,255,255,1)" }}>{s.Driver.familyName}</p>
                      <p className="text-[11px] font-semibold mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{teamName}</p>
                    </div>
                    <div className="flex items-end justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <RaceFlag flag="" flagImg={flagImg} className="" />
                        <span className="text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>
                          {s.points} pts · {s.wins}W
                        </span>
                      </div>
                      <span className="text-2xl font-black italic" style={{ color: "rgba(255,255,255,0.8)" }}>
                        {s.Driver.permanentNumber || s.position}
                      </span>
                    </div>
                  </div>
                </motion.a>
              );
            })}
          </div>
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

export default Drivers;
