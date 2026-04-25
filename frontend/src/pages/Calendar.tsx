import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarOff } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import SiteHeader from "@/components/SiteHeader";
import RaceFlag from "@/components/RaceFlag";
import { CircuitCard } from "@/components/CircuitCard";

import { f1Calendar2025, type F1Race } from "@/data/f1-calendar";

interface JolpicaRace {
  round: string;
  raceName: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: { country: string; locality: string };
  };
  date: string;
  time?: string;
  FirstPractice?: { date: string; time: string };
  SecondPractice?: { date: string; time: string };
  ThirdPractice?: { date: string; time: string };
  Qualifying?: { date: string; time: string };
  Sprint?: { date: string; time: string };
}

type MappedRace = F1Race & { sessions: { label: string; date: string; time: string }[] };

const countryToFlagImg: Record<string, string> = {
  Australia: "au", China: "cn", Japan: "jp", Bahrain: "bh", "Saudi Arabia": "sa",
  USA: "us", Italy: "it", Monaco: "mc", Spain: "es", Canada: "ca", Austria: "at",
  UK: "gb", Belgium: "be", Hungary: "hu", Netherlands: "nl", Azerbaijan: "az",
  Singapore: "sg", Mexico: "mx", Brazil: "br", Qatar: "qa", UAE: "ae",
  France: "fr", Germany: "de", Finland: "fi", Thailand: "th", Argentina: "ar", "New Zealand": "nz",
};

const MONTHS = ["ALL", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function mapJolpicaToRace(jr: JolpicaRace): MappedRace {
  const d = new Date(jr.date);
  const month = d.toLocaleString("en", { month: "short" }).toUpperCase();
  const days = String(d.getDate()).padStart(2, "0");
  const flagImg = countryToFlagImg[jr.Circuit.Location.country] || "";

  const sessions: { label: string; date: string; time: string }[] = [];
  if (jr.FirstPractice) sessions.push({ label: "FP1", date: jr.FirstPractice.date, time: jr.FirstPractice.time });
  if (jr.SecondPractice) sessions.push({ label: "FP2", date: jr.SecondPractice.date, time: jr.SecondPractice.time });
  if (jr.ThirdPractice) sessions.push({ label: "FP3", date: jr.ThirdPractice.date, time: jr.ThirdPractice.time });
  if (jr.Sprint) sessions.push({ label: "Sprint", date: jr.Sprint.date, time: jr.Sprint.time });
  if (jr.Qualifying) sessions.push({ label: "Qualifying", date: jr.Qualifying.date, time: jr.Qualifying.time });
  sessions.push({ label: "Race", date: jr.date, time: jr.time || "" });

  return {
    round: parseInt(jr.round), name: jr.raceName, country: jr.Circuit.Location.country,
    circuit: jr.Circuit.circuitName, circuitId: jr.Circuit.circuitId, date: jr.date, flag: "", flagImg, month, days, sessions,
  };
}

async function fetchCalendar(year: number): Promise<MappedRace[]> {
  const res = await fetch(`https://api.jolpi.ca/ergast/f1/${year}.json`);
  if (!res.ok) throw new Error("API error");
  const data = await res.json();
  const races: JolpicaRace[] = data.MRData.RaceTable.Races;
  return races.map(mapJolpicaToRace);
}

function formatSessionTime(time: string) {
  if (!time) return "";
  const [h, m] = time.replace("Z", "").split(":");
  const utcHour = parseInt(h);
  const thHour = (utcHour + 7) % 24;
  return `${String(thHour).padStart(2, "0")}:${m} TH`;
}

function getRaceStatus(date: string) {
  const now = new Date();
  const raceDate = new Date(date);
  const diffMs = raceDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: "Completed", color: "text-muted-foreground" };
  if (diffDays <= 7) return { label: `${diffDays}d to go`, color: "text-primary" };
  return { label: "Upcoming", color: "text-muted-foreground" };
}

const Calendar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const yearParam = parseInt(searchParams.get("year") || "") || currentYear;
  const [selectedYear, setSelectedYear] = useState(yearParam);
  const [monthFilter, setMonthFilter] = useState("ALL");
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const nextRaceRef = useRef<HTMLDivElement>(null);

  const { data: races, isLoading, error } = useQuery({
    queryKey: ["f1-calendar", selectedYear],
    queryFn: () => fetchCalendar(selectedYear),
    staleTime: 1000 * 60 * 60,
  });

  const fallbackRaces = selectedYear === 2025
    ? f1Calendar2025.map((r) => ({ ...r, sessions: [] as MappedRace["sessions"] }))
    : [];

  const displayRaces = races || fallbackRaces;

  // Available months from actual data
  const availableMonths = useMemo(() => {
    const months = new Set(displayRaces.map((r) => r.month));
    return ["ALL", ...MONTHS.filter((m) => m !== "ALL" && months.has(m))];
  }, [displayRaces]);

  const filteredRaces = monthFilter === "ALL"
    ? displayRaces
    : displayRaces.filter((r) => r.month === monthFilter);

  // Find next race index
  const nextRaceIdx = useMemo(() => {
    return displayRaces.findIndex((r) => getRaceStatus(r.date).label !== "Completed");
  }, [displayRaces]);

  // Auto-scroll to next race on load
  useEffect(() => {
    if (!isLoading && nextRaceRef.current && monthFilter === "ALL") {
      setTimeout(() => {
        nextRaceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
    }
  }, [isLoading, selectedYear, monthFilter]);

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setMonthFilter("ALL");
    setSearchParams({ year: String(year) });
  };

  const yearOptions = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i);

  return (
    <div className="dark min-h-screen bg-racing-vignette">
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-3xl font-bold italic">
              <span className="text-primary">{selectedYear}</span>
              <span className="text-foreground ml-2">Race Calendar</span>
            </h1>
            {/* Year selector */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleYearChange(selectedYear - 1)}
                disabled={selectedYear <= 1950}
                className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(parseInt(e.target.value))}
                className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm font-bold text-foreground outline-none focus:border-primary/40 appearance-none cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={() => handleYearChange(selectedYear + 1)}
                disabled={selectedYear >= currentYear + 1}
                className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading..." : error ? "Using offline data" : `${displayRaces.length} races · Jolpica F1 API`}
            </p>
            {selectedYear === currentYear && nextRaceIdx >= 0 && monthFilter !== "ALL" && (
              <button
                onClick={() => { setMonthFilter("ALL"); }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Jump to next race →
              </button>
            )}
          </div>
        </motion.div>

        {/* Month filter */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {availableMonths.map((m) => (
            <button
              key={m}
              onClick={() => setMonthFilter(m)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
                monthFilter === m
                  ? "racing-gradient text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>


        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="pl-14 relative">
                <div className="absolute left-[15px] top-5 w-[15px] h-[15px] rounded-full bg-border" />
                <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-10 bg-secondary rounded" />
                    <div className="w-px h-10 bg-border" />
                    <div className="w-7 h-5 bg-secondary rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-20 bg-secondary rounded" />
                      <div className="h-4 w-48 bg-secondary rounded" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {!isLoading && filteredRaces.length === 0 && (
          <div className="text-center py-20">
            <CalendarOff className="text-muted-foreground mx-auto mb-3" size={48} />
            <p className="text-muted-foreground">
              {displayRaces.length === 0 ? `No calendar data available for ${selectedYear}` : "No races in this month"}
            </p>
          </div>
        )}

        {/* Timeline */}
        {!isLoading && filteredRaces.length > 0 && (
          <div className="relative">
            <div className="absolute left-[22px] top-0 bottom-0 w-px bg-border" />
            <div className="space-y-1">
              {filteredRaces.map((race, i) => {
                const status = getRaceStatus(race.date);
                const isCompleted = status.label === "Completed";
                const isNext = displayRaces.indexOf(race) === nextRaceIdx && selectedYear === currentYear;
                const isExpanded = isNext || expandedRound === race.round;

                return (
                  <motion.div
                    key={race.round}
                    ref={isNext ? nextRaceRef : undefined}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="relative pl-14 group"
                  >
                    {/* Timeline dot */}
                    <div className={`absolute left-[15px] top-5 w-[15px] h-[15px] rounded-full border-2 z-10 transition-all ${
                      isNext
                        ? "border-primary bg-primary glow-red scale-110"
                        : isCompleted
                          ? "border-muted-foreground/40 bg-muted-foreground/20"
                          : "border-border bg-card"
                    }`} />

                    <div
                      onClick={() => setExpandedRound(expandedRound === race.round ? null : race.round)}
                      className={`rounded-xl border p-4 transition-all cursor-pointer ${
                        isNext
                          ? "border-primary/30 bg-card glow-red"
                          : isCompleted
                            ? "border-border/50 bg-card/50 opacity-60"
                            : "border-border bg-card hover:border-primary/20"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center shrink-0 w-14">
                          <span className="text-[10px] font-bold tracking-wider text-primary uppercase">{race.month}</span>
                          <p className="text-xl font-bold text-foreground leading-none">{race.days}</p>
                        </div>
                        <div className="w-px h-10 bg-border shrink-0" />
                        <div className="shrink-0">
                          <RaceFlag flag={race.flag || "🏁"} flagImg={race.flagImg} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">R{race.round}</span>
                            {isNext && (
                              <span className="text-[9px] font-bold tracking-wider uppercase bg-primary text-primary-foreground px-2 py-0.5 rounded-full animate-pulse">
                                Next Race
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-foreground truncate">{race.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{race.circuit} · {race.country}</p>
                        </div>
                        
                        <div className="shrink-0 text-right">
                          <span className={`text-xs font-semibold ${status.color}`}>{status.label}</span>
                        </div>
                      </div>

                      {/* Sessions (expanded) */}
                      {isExpanded && race.sessions.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="mt-4 pt-3 border-t border-border"
                        >
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {race.sessions.map((s) => (
                              <div key={s.label} className="bg-secondary/50 rounded-lg px-3 py-2">
                                <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{s.label}</p>
                                <p className="text-xs font-medium text-foreground">
                                  {new Date(s.date).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
                                </p>
                                {s.time && <p className="text-[10px] text-primary font-medium">{formatSessionTime(s.time)}</p>}
                              </div>
                            ))}
                          </div>

                          {/* Circuit Card matched to specific circuit below the schedule */}
                          <div className="mt-4">
                            <CircuitCard circuitId={race.circuitId} />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Calendar;
