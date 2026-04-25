import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowLeft, Trophy, Flag, Timer, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import RaceFlag from "@/components/RaceFlag";
import SiteHeader from "@/components/SiteHeader";
import { getDriverHeadshots } from "@/data/live-api";

const API_BASE = "https://api.jolpi.ca/ergast/f1";

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

const countryToFlagImg: Record<string, string> = {
  Australia: "au", China: "cn", Japan: "jp", Bahrain: "bh", "Saudi Arabia": "sa",
  USA: "us", Italy: "it", Monaco: "mc", Spain: "es", Canada: "ca", Austria: "at",
  UK: "gb", Belgium: "be", Hungary: "hu", Netherlands: "nl", Azerbaijan: "az",
  Singapore: "sg", Mexico: "mx", Brazil: "br", Qatar: "qa", UAE: "ae",
  France: "fr", Germany: "de", Finland: "fi", Thailand: "th", Argentina: "ar", "New Zealand": "nz",
};

interface DriverInfo {
  driverId: string;
  givenName: string;
  familyName: string;
  nationality: string;
  dateOfBirth: string;
  permanentNumber?: string;
  url?: string;
}

interface SeasonStanding {
  position: string;
  points: string;
  wins: string;
  Constructors: { name: string; constructorId: string }[];
}

interface RaceResult {
  round: string;
  raceName: string;
  Circuit: { circuitName: string; Location: { country: string; locality: string } };
  date: string;
  Results: {
    position: string;
    points: string;
    grid: string;
    status: string;
    Time?: { time: string };
    FastestLap?: { rank: string; Time: { time: string } };
    Constructor: { name: string; constructorId: string };
  }[];
}

interface CareerStats {
  totalRaces: number;
  totalWins: number;
  totalPodiums: number;
  totalPoles: number;
  totalPoints: number;
  bestFinish: number;
  seasonsActive: number[];
}

async function fetchDriverProfile(driverId: string, year: number) {
  const [driverRes, standingRes, resultsRes, seasonsRes] = await Promise.all([
    fetch(`${API_BASE}/drivers/${driverId}.json`),
    fetch(`${API_BASE}/${year}/drivers/${driverId}/driverStandings.json`),
    fetch(`${API_BASE}/${year}/drivers/${driverId}/results.json?limit=100`),
    fetch(`${API_BASE}/drivers/${driverId}/seasons.json?limit=100`),
  ]);

  let driver: DriverInfo | null = null;
  if (driverRes.ok) {
    const data = await driverRes.json();
    const drivers = data.MRData.DriverTable.Drivers;
    if (drivers?.length > 0) driver = drivers[0];
  }

  let standing: SeasonStanding | null = null;
  if (standingRes.ok) {
    const data = await standingRes.json();
    const lists = data.MRData.StandingsTable.StandingsLists;
    if (lists?.length > 0 && lists[0].DriverStandings?.length > 0) {
      standing = lists[0].DriverStandings[0];
    }
  }

  let races: RaceResult[] = [];
  if (resultsRes.ok) {
    const data = await resultsRes.json();
    races = data.MRData.RaceTable.Races || [];
  }

  let seasons: number[] = [];
  if (seasonsRes.ok) {
    const data = await seasonsRes.json();
    seasons = (data.MRData.SeasonTable.Seasons || []).map((s: { season: string }) => parseInt(s.season));
  }

  return { driver, standing, races, seasons };
}

async function fetchCareerStats(driverId: string): Promise<CareerStats> {
  const allRaces: RaceResult[] = [];
  let offset = 0;
  const limit = 100;

  // Paginate through all results
  while (true) {
    const res = await fetch(`${API_BASE}/drivers/${driverId}/results.json?limit=${limit}&offset=${offset}`);
    if (!res.ok) break;
    const data = await res.json();
    const races: RaceResult[] = data.MRData.RaceTable.Races || [];
    allRaces.push(...races);
    const total = parseInt(data.MRData.total || "0");
    offset += limit;
    if (offset >= total || races.length === 0) break;
  }

  if (allRaces.length === 0) {
    return { totalRaces: 0, totalWins: 0, totalPodiums: 0, totalPoles: 0, totalPoints: 0, bestFinish: 0, seasonsActive: [] };
  }

  let totalWins = 0, totalPodiums = 0, totalPoles = 0, totalPoints = 0, bestFinish = 99;
  const seasonsSet = new Set<number>();

  allRaces.forEach((race) => {
    const r = race.Results[0];
    if (!r) return;
    const pos = parseInt(r.position);
    const pts = parseFloat(r.points);
    totalPoints += pts;
    if (pos === 1) totalWins++;
    if (pos <= 3) totalPodiums++;
    if (r.grid === "1") totalPoles++;
    if (pos < bestFinish) bestFinish = pos;
    seasonsSet.add(new Date(race.date).getFullYear());
  });

  return {
    totalRaces: allRaces.length,
    totalWins,
    totalPodiums,
    totalPoles,
    totalPoints: Math.round(totalPoints),
    bestFinish: bestFinish === 99 ? 0 : bestFinish,
    seasonsActive: Array.from(seasonsSet).sort(),
  };
}

const currentYear = new Date().getFullYear();

const DriverProfile = () => {
  const { driverId } = useParams<{ driverId: string }>();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["driver-profile", driverId, selectedYear],
    queryFn: () => fetchDriverProfile(driverId!, selectedYear),
    enabled: !!driverId,
    staleTime: 1000 * 60 * 30,
  });

  const { data: career } = useQuery({
    queryKey: ["driver-career", driverId],
    queryFn: () => fetchCareerStats(driverId!),
    enabled: !!driverId,
    staleTime: 1000 * 60 * 60,
  });

  const { data: headshots } = useQuery({
    queryKey: ["driver-headshots"],
    queryFn: getDriverHeadshots,
    staleTime: 1000 * 60 * 60,
  });

  const driver = profile?.driver;
  const standing = profile?.standing;
  const races = profile?.races || [];
  const seasons = profile?.seasons || [];
  const teamName = standing?.Constructors?.[0]?.name || races[0]?.Results?.[0]?.Constructor?.name || "";
  const teamColor = teamColors[teamName] || "hsl(0, 0%, 40%)";
  const flagImg = driver ? nationalityToFlagImg[driver.nationality] || "" : "";

  const age = driver?.dateOfBirth
    ? Math.floor((Date.now() - new Date(driver.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  // Season stats from race results
  const seasonWins = races.filter((r) => r.Results[0]?.position === "1").length;
  const seasonPodiums = races.filter((r) => parseInt(r.Results[0]?.position || "99") <= 3).length;
  const seasonPoints = races.reduce((sum, r) => sum + parseFloat(r.Results[0]?.points || "0"), 0);
  const seasonBestFinish = Math.min(...races.map((r) => parseInt(r.Results[0]?.position || "99")));
  const avgFinish = races.length > 0
    ? (races.reduce((sum, r) => sum + parseInt(r.Results[0]?.position || "0"), 0) / races.length).toFixed(1)
    : "–";

  return (
    <div className="dark min-h-screen bg-background">
      <SiteHeader />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Back button */}
        <Link to="/drivers" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft size={14} />
          Back to Drivers
        </Link>

        {isLoading && !driver && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-8 animate-pulse">
              <div className="h-8 w-48 bg-secondary rounded mb-3" />
              <div className="h-4 w-32 bg-secondary/60 rounded" />
            </div>
          </div>
        )}

        {driver && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Hero card */}
            <div
              className="relative rounded-2xl overflow-hidden border border-border mb-8"
              style={{ background: `linear-gradient(135deg, ${teamColor} 0%, hsl(0 0% 6%) 60%)` }}
            >
              <div className="absolute top-4 right-6 text-[120px] md:text-[180px] font-black leading-none opacity-[0.08] select-none italic z-0">
                {driver.permanentNumber || "?"}
              </div>
              {headshots && headshots[driver.familyName.substring(0,3).toUpperCase()] && (
                <img
                  src={headshots[driver.familyName.substring(0,3).toUpperCase()]}
                  alt={driver.familyName}
                  className="absolute bottom-0 right-0 md:right-[5%] h-[120%] w-auto object-contain object-bottom z-10 pointer-events-none fade-in"
                  style={{ filter: "drop-shadow(-8px 0px 16px rgba(0,0,0,0.8))" }}
                />
              )}
              <div className="relative p-8 md:p-10 z-20 bg-gradient-to-r from-black/60 via-black/30 to-transparent">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <RaceFlag flag="" flagImg={flagImg} className="" />
                      <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>
                        {driver.nationality}
                      </span>
                      {standing && (
                        <span className="text-[10px] font-bold bg-black/30 text-white/90 px-2 py-0.5 rounded-full">
                          P{standing.position} in {selectedYear}
                        </span>
                      )}
                    </div>
                    <p className="text-lg md:text-xl font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                      {driver.givenName}
                    </p>
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-none" style={{ color: "rgba(255,255,255,1)" }}>
                      {driver.familyName}
                    </h1>
                    <div className="flex items-center gap-4 mt-3">
                      {teamName && (
                        <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
                          {teamName}
                        </span>
                      )}
                      {age && (
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                          Age {age} · Born {driver.dateOfBirth}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-6xl md:text-8xl font-black italic" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {driver.permanentNumber || "–"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Career stats */}
            {career && career.totalRaces > 0 && (
              <div className="mb-8">
                <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground mb-4">Career Statistics</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    { label: "Races", value: career.totalRaces, icon: Flag },
                    { label: "Wins", value: career.totalWins, icon: Trophy },
                    { label: "Podiums", value: career.totalPodiums, icon: TrendingUp },
                    { label: "Poles", value: career.totalPoles, icon: Timer },
                    { label: "Points", value: career.totalPoints.toLocaleString(), icon: TrendingUp },
                    { label: "Seasons", value: career.seasonsActive.length, icon: Flag },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-card border border-border rounded-xl p-4 text-center">
                      <stat.icon className="mx-auto text-primary mb-2" size={18} />
                      <p className="text-2xl font-black text-foreground">{stat.value}</p>
                      <p className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Year selector */}
            <div className="flex items-center gap-4 flex-wrap mb-6">
              <h2 className="text-lg font-bold">
                <span className="text-primary">{selectedYear}</span>
                <span className="text-foreground ml-2">Season Results</span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedYear((y) => Math.max(seasons[0] || 1950, y - 1))}
                  disabled={selectedYear <= (seasons[0] || 1950)}
                  className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm font-bold text-foreground outline-none focus:border-primary/40 appearance-none cursor-pointer"
                >
                  {(seasons.length > 0 ? [...seasons].reverse() : [currentYear]).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button
                  onClick={() => setSelectedYear((y) => Math.min(seasons[seasons.length - 1] || currentYear, y + 1))}
                  disabled={selectedYear >= (seasons[seasons.length - 1] || currentYear)}
                  className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Season summary */}
            {races.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                {[
                  { label: "Races", value: races.length },
                  { label: "Wins", value: seasonWins },
                  { label: "Podiums", value: seasonPodiums },
                  { label: "Points", value: Math.round(seasonPoints) },
                  { label: "Avg Finish", value: avgFinish },
                ].map((s) => (
                  <div key={s.label} className="bg-card border border-border rounded-lg px-4 py-3 text-center">
                    <p className="text-xl font-black text-foreground">{s.value}</p>
                    <p className="text-[9px] font-semibold tracking-wider uppercase text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Points progression chart */}
            {races.length > 0 && (() => {
              const chartData = races.reduce((acc: { race: string; points: number; round: number }[], race, i) => {
                const pts = parseFloat(race.Results[0]?.points || "0");
                const cumulative = (acc[i - 1]?.points || 0) + pts;
                acc.push({
                  race: `R${race.round}`,
                  points: cumulative,
                  round: parseInt(race.round),
                });
                return acc;
              }, []);

              return (
                <div className="bg-card border border-border rounded-xl p-5 mb-6">
                  <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground mb-4">
                    Points Progression — {selectedYear}
                  </h3>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="pointsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={teamColor} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={teamColor} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis
                          dataKey="race"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                          axisLine={{ stroke: "hsl(var(--border))" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                            color: "hsl(var(--foreground))",
                          }}
                          labelStyle={{ color: "hsl(var(--muted-foreground))", fontWeight: 600 }}
                          formatter={(value: number) => [`${value} pts`, "Cumulative Points"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="points"
                          stroke={teamColor}
                          strokeWidth={2.5}
                          fill="url(#pointsGradient)"
                          dot={{ r: 3, fill: teamColor, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                          activeDot={{ r: 5, fill: teamColor, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}

            {/* Race results table */}
            {isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 bg-card border border-border rounded-lg animate-pulse" />
                ))}
              </div>
            )}

            {!isLoading && races.length === 0 && (
              <div className="text-center py-16 bg-card border border-border rounded-xl">
                <p className="text-muted-foreground">No race results for {driver.givenName} {driver.familyName} in {selectedYear}</p>
              </div>
            )}

            {!isLoading && races.length > 0 && (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-[10px] tracking-wider uppercase text-muted-foreground">
                        <th className="text-left px-5 py-3 font-semibold">Round</th>
                        <th className="text-left px-3 py-3 font-semibold">Grand Prix</th>
                        <th className="text-center px-3 py-3 font-semibold">Grid</th>
                        <th className="text-center px-3 py-3 font-semibold">Pos</th>
                        <th className="text-center px-3 py-3 font-semibold">Pts</th>
                        <th className="text-left px-3 py-3 font-semibold hidden md:table-cell">Status</th>
                        <th className="text-left px-3 py-3 font-semibold hidden lg:table-cell">Fastest Lap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {races.map((race) => {
                        const r = race.Results[0];
                        if (!r) return null;
                        const pos = parseInt(r.position);
                        const isWin = pos === 1;
                        const isPodium = pos <= 3;
                        const isDNF = r.status !== "Finished" && !r.status.startsWith("+");
                        const raceCountry = race.Circuit.Location.country;
                        const raceFlagImg = countryToFlagImg[raceCountry] || "";

                        return (
                          <tr
                            key={race.round}
                            className={`border-b border-border/50 transition-colors ${
                              isWin ? "bg-primary/5" : "hover:bg-secondary/30"
                            }`}
                          >
                            <td className="px-5 py-3 text-muted-foreground font-mono text-xs">R{race.round}</td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <RaceFlag flag="" flagImg={raceFlagImg} className="" />
                                <div>
                                  <p className="font-medium text-foreground text-sm">{race.raceName}</p>
                                  <p className="text-[10px] text-muted-foreground">{race.Circuit.circuitName}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center text-muted-foreground">{r.grid}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                isWin
                                  ? "racing-gradient text-primary-foreground"
                                  : isPodium
                                    ? "bg-primary/20 text-primary"
                                    : isDNF
                                      ? "bg-destructive/10 text-destructive"
                                      : "text-foreground"
                              }`}>
                                {isDNF ? "DNF" : `P${pos}`}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`text-xs font-bold ${parseFloat(r.points) > 0 ? "text-primary" : "text-muted-foreground"}`}>
                                {r.points}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-xs text-muted-foreground hidden md:table-cell">
                              {r.Time?.time || r.status}
                            </td>
                            <td className="px-3 py-3 text-xs font-mono text-muted-foreground hidden lg:table-cell">
                              {r.FastestLap ? (
                                <span className={r.FastestLap.rank === "1" ? "text-purple-400 font-bold" : ""}>
                                  {r.FastestLap.Time.time}
                                  {r.FastestLap.rank === "1" && " ⚡"}
                                </span>
                              ) : "–"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
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

export default DriverProfile;
