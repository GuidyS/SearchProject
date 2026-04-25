import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, User, Users, MapPin, Trophy, SearchX, PlayCircle } from "lucide-react";
import { containsThai, getThaiSuggestions } from "@/data/thai-mappings";
import SiteHeader from "@/components/SiteHeader";
import { NewsCarousel } from "@/components/NewsCarousel";
import { webSearch, type WebResult } from "@/data/search-data";
import {
  parseYearFromQuery,
  searchDrivers,
  searchConstructors,
  searchCircuits,
  getDriverStandings,
  getLatestRaceResult,
  getDriverResults,
  type ApiDriver,
  type ApiConstructor,
  type ApiCircuit,
  type ApiStanding,
  type ApiRace,
} from "@/data/f1-api";
import { getDriverHeadshots } from "@/data/live-api";

interface LiveSearchResults {
  drivers: ApiDriver[];
  constructors: ApiConstructor[];
  circuits: ApiCircuit[];
  standings: ApiStanding[];
  lastRace: ApiRace | null;
  driverRaces?: ApiRace[];
  headshots: Record<string, string>;
  year: number;
  parsedQuery: string;
}

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get("q") || "";
  const [activeFilter, setActiveFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [searchData, setSearchData] = useState<{ results: WebResult[]; totalResults: number }>({ results: [], totalResults: 0 });
  const [liveData, setLiveData] = useState<LiveSearchResults | null>(null);

  const filters = ["All", "Drivers", "Teams", "Circuits", "Results", "Real-time"];

  useEffect(() => {
    setIsLoading(true);
    const { query: parsedQuery, year } = parseYearFromQuery(initialQuery);

    // Fetch from API and local data in parallel
    Promise.all([
      parsedQuery ? searchDrivers(parsedQuery, year) : Promise.resolve([]),
      parsedQuery ? searchConstructors(parsedQuery, year) : Promise.resolve([]),
      parsedQuery ? searchCircuits(parsedQuery, year) : Promise.resolve([]),
      getDriverStandings(year),
      getLatestRaceResult(year),
      getDriverHeadshots(),
    ]).then(async ([drivers, constructors, circuits, standings, lastRace, dsHeadshots]) => {
      
      let finalConstructors = [...constructors];
      let finalDriverRaces: ApiRace[] = [];
      let finalDrivers = [...drivers];
      
      // Smart populate: Find the team and races of the matched driver
      if (drivers.length > 0) {
         const d = drivers[0];
         const st = standings.find(s => s.Driver.driverId === d.driverId);
         if (st && st.Constructors && st.Constructors.length > 0) {
           const team = st.Constructors[0];
           if (!finalConstructors.some(c => c.constructorId === team.constructorId)) {
             finalConstructors.push(team);
           }
         }
         finalDriverRaces = await getDriverResults(d.driverId, year);
      }
      
      // Smart populate: Find the drivers of the matched team
      if (constructors.length > 0) {
         const t = constructors[0];
         const teamStandings = standings.filter(s => s.Constructors.some(c => c.constructorId === t.constructorId));
         for (const ts of teamStandings) {
            if (!finalDrivers.some(d => d.driverId === ts.Driver.driverId)) {
               finalDrivers.push(ts.Driver);
            }
         }
      }

      setLiveData({ 
        drivers: finalDrivers, constructors: finalConstructors, circuits, 
        standings, lastRace, driverRaces: finalDriverRaces, 
        headshots: dsHeadshots, year, parsedQuery 
      });
      setSearchData(webSearch(initialQuery));
      setIsLoading(false);
    }).catch(() => {
      setSearchData(webSearch(initialQuery));
      setLiveData(null);
      setIsLoading(false);
    });
  }, [initialQuery]);

  const filteredResults = searchData.results.filter((r) => {
    if (activeFilter === "All") return r.type === "article" || r.type === "news";
    if (activeFilter === "Results") return r.type === "race";
    if (activeFilter === "Real-time") return r.type === "article" || r.type === "news";
    return false;
  });

  const showDrivers = activeFilter === "All" || activeFilter === "Drivers";
  const showTeams = activeFilter === "All" || activeFilter === "Teams";
  const showCircuits = activeFilter === "All" || activeFilter === "Circuits";
  const showResults = activeFilter === "All" || activeFilter === "Results";
  const showStandings = activeFilter === "All";
  const showMedia = activeFilter === "All" || activeFilter === "Real-time";

  const hasAnyResults = 
    (showDrivers && !!liveData?.drivers?.length) ||
    (showTeams && !!liveData?.constructors?.length) ||
    (showCircuits && !!liveData?.circuits?.length) ||
    (showResults && (!!liveData?.lastRace?.Results?.length || !!liveData?.driverRaces?.length)) ||
    (showStandings && !!liveData?.standings?.length) ||
    (showMedia && searchData.results.some(r => r.type === "social" || r.type === "video")) ||
    (filteredResults.length > 0);

  return (
    <div className="dark min-h-screen bg-background">
      <SiteHeader />

      <main className="max-w-5xl mx-auto px-6 py-6">
        {/* Year badge */}
        {liveData && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary px-3 py-1 rounded-full">
              Season {liveData.year}
            </span>
            <span className="text-xs text-muted-foreground">
              Live data from Jolpica F1 API
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
                activeFilter === f
                  ? "racing-gradient text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">
            {initialQuery ? `Results for "${initialQuery}"` : "Trending in F1"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Searching..." : `About ${searchData.totalResults.toLocaleString()} results`}
          </p>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                <div className="h-3 w-24 bg-secondary rounded mb-3" />
                <div className="h-4 w-3/4 bg-secondary rounded mb-2" />
                <div className="h-3 w-full bg-secondary/60 rounded mb-1" />
                <div className="h-3 w-2/3 bg-secondary/40 rounded" />
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {!isLoading && (
            <motion.div
              key={initialQuery + activeFilter}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Live API: Drivers */}
              {(activeFilter === "All" || activeFilter === "Drivers") && liveData && liveData.drivers.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="text-primary" size={20} />
                    <h3 className="font-bold text-foreground">Drivers · {liveData.year}</h3>
                  </div>
                  <div className="space-y-2">
                    {liveData.drivers.slice(0, 5).map((d) => {
                      const standing = liveData.standings.find(
                        (s) => s.Driver.driverId === d.driverId
                      );
                      return (
                        <Link to={`/driver/${d.driverId}`} key={d.driverId} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 group hover:bg-secondary/40 px-2 -mx-2 rounded-lg transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            {standing && (
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                standing.position === "1" ? "racing-gradient text-primary-foreground" : "bg-secondary text-muted-foreground"
                              }`}>
                                P{standing.position}
                              </span>
                            )}
                            {/* Driver Headshot */}
                            <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden shrink-0 border border-border/50">
                              <img 
                                src={liveData.headshots[d.familyName.substring(0,3).toUpperCase()] || `https://ui-avatars.com/api/?name=${d.givenName}+${d.familyName}&background=random&color=fff`} 
                                alt={d.givenName}
                                className="w-full h-full object-cover object-top"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${d.givenName}+${d.familyName}&background=random&color=fff`;
                                }}
                              />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                {d.givenName} {d.familyName}
                                {d.permanentNumber && <span className="text-muted-foreground font-normal ml-2">#{d.permanentNumber}</span>}
                              </p>
                              <p className="text-xs text-muted-foreground">{d.nationality}</p>
                            </div>
                          </div>
                          {standing && (
                            <div className="text-right">
                              <span className="text-sm font-bold text-primary">{standing.points} pts</span>
                              <p className="text-[10px] text-muted-foreground">{standing.wins} wins</p>
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Live API: Teams */}
              {(activeFilter === "All" || activeFilter === "Teams") && liveData && liveData.constructors.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="text-primary" size={20} />
                    <h3 className="font-bold text-foreground">Teams · {liveData.year}</h3>
                  </div>
                  <div className="space-y-2">
                    {liveData.constructors.slice(0, 5).map((c) => (
                      <Link to={`/teams#${c.constructorId}`} key={c.constructorId} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 group hover:bg-secondary/40 px-2 -mx-2 rounded-lg transition-colors cursor-pointer">
                        <div>
                          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.nationality}</p>
                        </div>
                        <span className="text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          View Team →
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Live API: Circuits */}
              {(activeFilter === "All" || activeFilter === "Circuits") && liveData && liveData.circuits.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="text-primary" size={20} />
                    <h3 className="font-bold text-foreground">Circuits · {liveData.year}</h3>
                  </div>
                  <div className="space-y-2">
                    {liveData.circuits.slice(0, 5).map((c) => (
                      <div key={c.circuitId} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-sm font-bold text-foreground">{c.circuitName}</p>
                            <p className="text-xs text-muted-foreground">{c.Location.locality}, {c.Location.country}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/calendar?year=${liveData.year}`)}
                          className="text-[10px] font-semibold text-primary hover:underline"
                        >
                          View Calendar →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Driver Race Results */}
              {(activeFilter === "All" || activeFilter === "Results") && liveData?.driverRaces && liveData.driverRaces.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                     <Trophy className="text-primary" size={20} />
                     <h3 className="font-bold text-foreground">Season Results for {liveData.drivers[0]?.givenName} {liveData.drivers[0]?.familyName}</h3>
                  </div>
                  <div className="space-y-2">
                     {liveData.driverRaces.map((r) => (
                        <div key={r.round} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors -mx-2 px-2 rounded-lg">
                           <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground truncate">{r.raceName}</p>
                              <p className="text-xs text-muted-foreground">Round {r.round} · {r.date}</p>
                           </div>
                           <div className="text-right whitespace-nowrap ml-4">
                              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                 P{r.Results?.[0]?.position || "-"}
                              </span>
                           </div>
                        </div>
                     ))}
                  </div>
                </div>
              )}

              {/* Live API: Last Race Result */}
              {(activeFilter === "All" || activeFilter === "Results") && liveData?.lastRace?.Results && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-bold">Latest Race Result · {liveData.year}</span>
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-0.5">{liveData.lastRace.raceName}</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {liveData.lastRace.Circuit.circuitName} · {liveData.lastRace.date}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-[10px] tracking-wider uppercase text-muted-foreground">
                          <th className="text-left pb-2.5 font-semibold w-12">Pos</th>
                          <th className="text-left pb-2.5 font-semibold">Driver</th>
                          <th className="text-left pb-2.5 font-semibold">Team</th>
                          <th className="text-left pb-2.5 font-semibold">Time</th>
                          <th className="text-right pb-2.5 font-semibold">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveData.lastRace.Results.slice(0, 10).map((r) => (
                          <tr key={r.position} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                            <td className="py-2.5 font-bold text-foreground">{r.position}</td>
                            <td className="py-2.5 font-medium text-foreground">
                              {r.Driver.givenName} {r.Driver.familyName}
                            </td>
                            <td className="py-2.5 text-muted-foreground">{r.Constructor.name}</td>
                            <td className="py-2.5 text-muted-foreground font-mono text-xs">
                              {r.Time?.time || r.status}
                            </td>
                            <td className="py-2.5 text-right">
                              <span className="bg-primary/10 text-primary font-bold text-xs px-2 py-0.5 rounded-full">{r.points}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Standings */}
              {(activeFilter === "All") && liveData && liveData.standings.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="text-primary" size={20} />
                    <h3 className="font-bold text-foreground">{liveData.year} World Drivers' Championship</h3>
                  </div>
                  <div className="space-y-2.5">
                    {liveData.standings.slice(0, 5).map((s, i) => (
                      <div key={s.Driver.driverId} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            i === 0 ? "racing-gradient text-primary-foreground" : "bg-secondary text-muted-foreground"
                          }`}>
                            {s.position}
                          </span>
                          <span className={`text-sm font-medium ${i === 0 ? "text-foreground" : "text-muted-foreground"}`}>
                            {s.Driver.givenName} {s.Driver.familyName}
                          </span>
                        </div>
                        <span className={`text-sm font-bold ${i === 0 ? "text-primary" : "text-foreground"}`}>{s.points} pts</span>
                      </div>
                    ))}
                  </div>
                  <a href="/results" className="block w-full mt-4 py-2.5 rounded-lg border border-primary/30 text-primary text-xs font-bold tracking-wider uppercase text-center hover:bg-primary/5 transition-colors">
                    View Full Standings
                  </a>
                </div>
              )}

              {/* Real-time & Social Media */}
              {(activeFilter === "All" || activeFilter === "Real-time") && searchData.results.some(r => r.type === "social" || r.type === "video") && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <PlayCircle className="text-primary" size={20} />
                    <h3 className="font-bold text-foreground">Real-time & Media</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {searchData.results.filter(r => r.type === "social" || r.type === "video").map((r, i) => (
                      <MediaCard key={i} result={r} />
                    ))}
                  </div>
                </div>
              )}

              {/* Latest F1 News component */}
              {(activeFilter === "All" || activeFilter === "Real-time") && (
                <NewsCarousel />
              )}

              {/* Static/mock results */}
              {filteredResults.filter(r => r.type !== "standings").map((result, i) => (
                <motion.div
                  key={`${result.title}-${i}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {result.type !== "race" && result.type !== "standings" ? (
                    <LinkCard result={result} />
                  ) : null}
                </motion.div>
              ))}

              {!hasAnyResults && (
                <div className="text-center py-16">
                  <SearchX className="text-muted-foreground mx-auto mb-3" size={48} />
                  <p className="text-muted-foreground">No results found for this filter.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-border py-5 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
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

const LinkCard = ({ result }: { result: WebResult }) => (
  <a href={result.url} target="_blank" rel="noopener noreferrer" className="block bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-colors group cursor-pointer">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-[10px] text-muted-foreground">{result.source}</span>
      {result.date && <span className="text-[10px] text-muted-foreground/60">· {result.date}</span>}
    </div>
    <h3 className="text-sm font-bold text-primary group-hover:underline mb-1">{result.title}</h3>
    <p className="text-xs text-muted-foreground leading-relaxed">{result.snippet}</p>
    {result.tags && (
      <div className="flex gap-2 mt-3">
        {result.tags.map((tag) => (
          <span key={tag} className="text-[10px] font-semibold tracking-wider uppercase bg-secondary text-muted-foreground px-2.5 py-1 rounded-full">{tag}</span>
        ))}
      </div>
    )}
  </a>
);

const MediaCard = ({ result }: { result: WebResult }) => (
  <a href={result.url} target="_blank" rel="noopener noreferrer" className="block bg-secondary/30 border border-border/50 rounded-xl p-4 hover:border-primary/40 hover:bg-secondary/50 transition-colors group cursor-pointer relative overflow-hidden flex flex-col h-full">
    <div className="flex items-center gap-2 mb-3">
      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-sm uppercase tracking-wider ${result.platform === 'youtube' ? 'bg-red-500/20 text-red-500' : 'bg-pink-500/20 text-pink-500'}`}>
        {result.platform || result.type}
      </span>
      <span className="text-[10px] text-muted-foreground">{result.date}</span>
      <span className="text-[10px] text-muted-foreground ml-auto">{result.source}</span>
    </div>
    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">{result.title}</h3>
    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mt-auto">{result.snippet}</p>
  </a>
);

export default SearchResults;
