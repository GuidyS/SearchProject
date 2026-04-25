import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import RaceFlag from "@/components/RaceFlag";
import SiteHeader from "@/components/SiteHeader";

const nationalityToFlagImg: Record<string, string> = {
  British: "gb", Dutch: "nl", Monegasque: "mc", Australian: "au", Spanish: "es",
  Mexican: "mx", Finnish: "fi", German: "de", French: "fr", Canadian: "ca",
  Japanese: "jp", Chinese: "cn", Thai: "th", Italian: "it", "New Zealander": "nz",
  Argentine: "ar", Brazilian: "br", American: "us",
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

interface ApiConstructorStanding {
  position: string;
  points: string;
  wins: string;
  Constructor: { constructorId: string; name: string; nationality: string };
}

interface ApiDriverEntry {
  Driver: { driverId: string; givenName: string; familyName: string; nationality: string; permanentNumber?: string };
  Constructors: { constructorId: string; name: string }[];
}

async function fetchTeamsData(year: number) {
  const [standingsRes, driversRes] = await Promise.all([
    fetch(`https://api.jolpi.ca/ergast/f1/${year}/constructorStandings.json`),
    fetch(`https://api.jolpi.ca/ergast/f1/${year}/driverStandings.json`),
  ]);

  let constructorStandings: ApiConstructorStanding[] = [];
  if (standingsRes.ok) {
    const data = await standingsRes.json();
    const lists = data.MRData.StandingsTable.StandingsLists;
    if (lists?.length > 0) constructorStandings = lists[0].ConstructorStandings || [];
  }

  let driverEntries: ApiDriverEntry[] = [];
  if (driversRes.ok) {
    const data = await driversRes.json();
    const lists = data.MRData.StandingsTable.StandingsLists;
    if (lists?.length > 0) driverEntries = lists[0].DriverStandings || [];
  }

  return { constructorStandings, driverEntries };
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 1950 + 2 }, (_, i) => currentYear + 1 - i);

const Teams = () => {
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data, isLoading } = useQuery({
    queryKey: ["teams-data", selectedYear],
    queryFn: () => fetchTeamsData(selectedYear),
    staleTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    if (data && !isLoading) {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.replace("#", "");
        const el = document.getElementById(id);
        if (el) {
          setTimeout(() => {
             el.scrollIntoView({ behavior: "smooth", block: "center" });
             el.classList.add("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
             setTimeout(() => el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background"), 2500);
          }, 300);
        }
      }
    }
  }, [data, isLoading]);

  return (
    <div className="dark min-h-screen bg-background">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4 flex-wrap mb-1">
            <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-tight">
              <span className="text-primary">{selectedYear}</span>
              <span className="text-foreground ml-2">Teams</span>
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
            {isLoading ? "Loading from API..." : `${data?.constructorStandings.length || 0} teams · Live standings from Jolpica F1 API`}
          </p>
        </motion.div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 min-h-[120px] animate-pulse">
                <div className="h-5 w-32 bg-secondary rounded mb-3" />
                <div className="h-3 w-48 bg-secondary/60 rounded mb-2" />
                <div className="flex gap-3 mt-4">
                  <div className="flex-1 h-12 bg-secondary/40 rounded-lg" />
                  <div className="flex-1 h-12 bg-secondary/40 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && data && data.constructorStandings.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No team standings available for {selectedYear}</p>
          </div>
        )}

        {data && data.constructorStandings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.constructorStandings.map((team, i) => {
              const color = teamColors[team.Constructor.name] || "hsl(0, 0%, 40%)";
              const teamDrivers = data.driverEntries.filter(
                (d) => d.Constructors.some((c) => c.constructorId === team.Constructor.constructorId)
              );

              return (
                <motion.div
                  id={team.Constructor.constructorId}
                  key={team.Constructor.constructorId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i }}
                  className="group relative rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-all duration-300"
                >
                  <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} />
                  <div className="pl-6 pr-5 py-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-black text-foreground uppercase tracking-tight">{team.Constructor.name}</h2>
                          <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">P{team.position}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{team.Constructor.nationality}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{team.points} pts</p>
                        <p className="text-[10px] text-muted-foreground">{team.wins} wins</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {teamDrivers.map((entry) => (
                        <a
                          key={entry.Driver.driverId}
                          href={`/driver/${entry.Driver.driverId}`}
                          className="flex-1 flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
                          style={{ background: `${color}15` }}
                        >
                          <span className="text-xl font-black italic text-foreground/60">
                            {entry.Driver.permanentNumber || "?"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">
                              {entry.Driver.givenName} {entry.Driver.familyName}
                            </p>
                          </div>
                          <RaceFlag
                            flag=""
                            flagImg={nationalityToFlagImg[entry.Driver.nationality] || ""}
                            className="ml-auto shrink-0"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
      <footer className="border-t border-border py-5 px-6 mt-10">
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

export default Teams;
