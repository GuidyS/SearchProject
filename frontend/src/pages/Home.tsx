import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, X, User, Users, MapPin, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getUpcomingRace } from "@/data/f1-calendar";
import { cachedJson } from "@/data/f1-cache";
import { searchF1, getPopularSearches, type SearchItem } from "@/data/search-data";
import { containsThai, getThaiSuggestions, type ThaiSuggestion } from "@/data/thai-mappings";
import RaceFlag from "@/components/RaceFlag";
import SiteHeader from "@/components/SiteHeader";



const countryToFlagImg: Record<string, string> = {
  Australia: "au", China: "cn", Japan: "jp", Bahrain: "bh", "Saudi Arabia": "sa",
  USA: "us", Italy: "it", Monaco: "mc", Spain: "es", Canada: "ca", Austria: "at",
  UK: "gb", Belgium: "be", Hungary: "hu", Netherlands: "nl", Azerbaijan: "az",
  Singapore: "sg", Mexico: "mx", Brazil: "br", Qatar: "qa", UAE: "ae",
  France: "fr", Germany: "de", Finland: "fi", Thailand: "th", Argentina: "ar", "New Zealand": "nz",
};

interface NextRaceData {
  round: number;
  name: string;
  flagImg: string;
  flag: string;
  month: string;
  days: string;
}

async function fetchNextRace(): Promise<NextRaceData> {
  const currentYear = new Date().getFullYear();
  const data = await cachedJson<any>(`https://api.jolpi.ca/ergast/f1/${currentYear}.json`);
  const races = data.MRData.RaceTable.Races;
  const now = new Date();
  const upcoming = races.find((r: any) => new Date(r.date) >= now) || races[races.length - 1];
  const d = new Date(upcoming.date);
  return {
    round: parseInt(upcoming.round),
    name: upcoming.raceName,
    flagImg: countryToFlagImg[upcoming.Circuit.Location.country] || "",
    flag: "",
    month: d.toLocaleString("en", { month: "short" }).toUpperCase(),
    days: String(d.getDate()).padStart(2, "0"),
  };
}

// ===== YouTube Video IDs =====
const BG_VIDEO_ID = 'GErmjAnP6ug'; // TimFrogt clip (Main Background)

const MUSIC_VIDEO_IDS = [
  'YhX_Woa3kVA', // F1 Theme
  'MSrHoJHCa3I', // Brian Tyler F1 Theme
];

// Helper to shuffle array
const shuffleArray = (array: string[]) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};




const Home = () => {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const ytPlayerRef = useRef<any>(null);
  const ytMusicRef = useRef<any>(null);


  // Create a randomized playlist once per session
  const musicPlaylist = useMemo(() => shuffleArray(MUSIC_VIDEO_IDS), []);
  const musicIndexRef = useRef(0);



  const fallbackRace = getUpcomingRace();
  const { data: apiRace } = useQuery({
    queryKey: ["next-race"],
    queryFn: fetchNextRace,
    staleTime: 1000 * 60 * 30,
  });
  const race = apiRace || fallbackRace;

  // ===== YouTube IFrame API for Background Video =====
  useEffect(() => {
    const YT = (window as any).YT;

    const initPlayer = () => {
      // Main Video Player (Fixed to TimFrogt clip)
      ytPlayerRef.current = new (window as any).YT.Player('yt-bg-player', {
        videoId: BG_VIDEO_ID,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          loop: 1,
          playlist: BG_VIDEO_ID, // Loop the single video
          rel: 0,
          showinfo: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          iv_load_policy: 3,
          fs: 0,
        },
        events: {
          onReady: (e: any) => e.target.playVideo(),
        },
      });

      // Separate Music Player (Hidden Playlist)
      ytMusicRef.current = new (window as any).YT.Player('yt-music-player', {
        videoId: musicPlaylist[0],
        playerVars: {
          autoplay: 0,
          mute: 0,
          controls: 0,
          loop: 0, // We manage track sequence manually
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: (e: any) => {
            e.target.setVolume(volume);
            if (isMusicPlaying) e.target.playVideo();
          },
          onStateChange: (e: any) => {
            // When a track ends, play the next one in the shuffled playlist
            if (e.data === 0) {
              musicIndexRef.current = (musicIndexRef.current + 1) % musicPlaylist.length;
              ytMusicRef.current?.loadVideoById(musicPlaylist[musicIndexRef.current]);
              ytMusicRef.current?.setVolume(volume);
            }
          },
        },
      });
    };

    if (YT && YT.Player) {
      initPlayer();
    } else {
      if (!document.getElementById('yt-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      ytPlayerRef.current?.destroy();
      ytMusicRef.current?.destroy();
    };
  }, []);

  const toggleMusic = () => {
    if (!ytMusicRef.current) return;
    if (isMusicPlaying) {
      ytMusicRef.current.pauseVideo();
    } else {
      ytMusicRef.current.playVideo();
      ytMusicRef.current.setVolume(volume);
    }
    setIsMusicPlaying(!isMusicPlaying);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (ytMusicRef.current) {
      ytMusicRef.current.setVolume(newVolume);
    }
  };




  const results = query.trim() ? searchF1(query) : isFocused ? getPopularSearches() : [];
  const thaiSuggestions = useMemo(() => containsThai(query) ? getThaiSuggestions(query) : [], [query]);
  const showResults = isFocused && (results.length > 0 || thaiSuggestions.length > 0);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const typeLabel = (type: SearchItem["type"]) => {
    switch (type) {
      case "driver": return "Driver";
      case "team": return "Team";
      case "circuit": return "Circuit";
    }
  };

  return (
    <div className="dark min-h-screen flex flex-col relative overflow-hidden bg-background">
      <SiteHeader showSearch={false} />

      {/* Hidden Music Player */}
      <div id="yt-music-player" className="absolute opacity-0 pointer-events-none" />

      {/* ========== YOUTUBE VIDEO BACKGROUND ========== */}
      {/* Outer wrapper clips the oversized iframe to the viewport */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          id="yt-bg-player"
          style={{
            position: 'absolute',
            /* Scale up to cover viewport while keeping 16:9 ratio */
            width: '100vw',
            height: '56.25vw',   /* = width × 9/16 */
            minHeight: '100vh',
            minWidth: '177.78vh', /* = height × 16/9 */
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            filter: 'brightness(0.32) saturate(1.4) contrast(1.05)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Dark vignette overlay on top of video */}
      <div className="absolute inset-0 z-[1] pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.85) 100%)'
      }} />

      {/* Animated scanlines effect */}
      <div className="absolute inset-0 z-[2] pointer-events-none opacity-[0.03]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 2px)',
        backgroundSize: '100% 2px'
      }} />

      {/* Red racing glow at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[2px] z-[3] pointer-events-none" style={{
        background: 'linear-gradient(90deg, transparent, hsl(0 72% 51% / 0.8), transparent)',
        boxShadow: '0 0 80px 20px hsl(0 72% 51% / 0.3)'
      }} />

      {/* Center glow orb */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full pointer-events-none z-[2]" style={{
        background: 'radial-gradient(ellipse, hsl(0 72% 51% / 0.06) 0%, transparent 70%)'
      }} />

      <div className="flex-1 flex flex-col items-center justify-center -mt-16 relative z-10" style={{ zIndex: 10 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center">
          <h1 className="text-7xl md:text-8xl font-black italic mb-2 tracking-tighter" style={{
            textShadow: '0 0 50px hsl(0 72% 51% / 0.4), 0 2px 20px rgba(0,0,0,0.8)'
          }}>
            <span className="text-primary italic">F1</span>
            <span className="text-foreground ml-2">SEARCH</span>
          </h1>
          <div className="w-24 h-1 racing-gradient mx-auto mb-10 rounded-full" style={{
            boxShadow: '0 0 15px 3px hsl(0 72% 51% / 0.4)'
          }} />
        </motion.div>

        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-xl px-6 relative z-50"
        >
          <div className={`flex items-center gap-3 border rounded-full px-6 py-3.5 transition-all duration-500 ${isFocused ? "border-primary/50 glow-red" : "border-white/10"
            }`} style={{
              background: 'rgba(10, 6, 6, 0.55)',
              backdropFilter: 'blur(24px) saturate(1.5)',
              WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
              boxShadow: isFocused
                ? '0 0 30px -8px hsl(0 72% 51% / 0.5), inset 0 1px 0 rgba(255,255,255,0.06)'
                : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)'
            }}>
            <Search className="text-primary" size={20} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim()) {
                  navigate(`/search?q=${encodeURIComponent(query)}`);
                }
              }}
              placeholder="ค้นหานักแข่ง ทีม สนาม... (Search in Thai or English)"
              className="bg-transparent text-base md:text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
            />
            {query && (
              <button onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            )}
          </div>

          <AnimatePresence>
            {showResults && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="absolute left-6 right-6 top-full mt-2 bg-card border border-border rounded-xl overflow-hidden shadow-2xl shadow-black/40"
              >
                {/* Thai suggestions */}
                {thaiSuggestions.length > 0 && (
                  <>
                    <p className="px-4 pt-3 pb-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-medium">
                      🇹🇭 คำแนะนำภาษาไทย
                    </p>
                    {thaiSuggestions.map((s, i) => (
                      <button
                        key={`thai-${s.english}-${i}`}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors text-left group"
                        onClick={() => { setQuery(s.thai); navigate(`/search?q=${encodeURIComponent(s.thai)}`); }}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
                          {s.type === "driver" && <User size={16} className="text-primary" />}
                          {s.type === "team" && <Users size={16} className="text-primary" />}
                          {s.type === "circuit" && <MapPin size={16} className="text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {s.thai}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{s.english}</p>
                        </div>
                        <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0">
                          {s.type === "driver" ? "นักแข่ง" : s.type === "team" ? "ทีม" : "สนาม"}
                        </span>
                      </button>
                    ))}
                  </>
                )}
                {/* English results */}
                {thaiSuggestions.length === 0 && !query.trim() && (
                  <p className="px-4 pt-3 pb-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-medium">
                    Popular Searches
                  </p>
                )}
                {(thaiSuggestions.length === 0 ? results : []).map((item, i) => (
                  <button
                    key={`${item.type}-${item.name}-${i}`}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors text-left group"
                    onClick={() => navigate(`/search?q=${encodeURIComponent(item.name)}`)}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: item.color ? `${item.color.replace(")", " / 0.15)")}` : "hsl(var(--secondary))" }}
                    >
                      {item.icon === "person" && <User size={16} style={{ color: item.color || "hsl(var(--muted-foreground))" }} />}
                      {item.icon === "groups" && <Users size={16} style={{ color: item.color || "hsl(var(--muted-foreground))" }} />}
                      {item.icon === "location_on" && <MapPin size={16} style={{ color: item.color || "hsl(var(--muted-foreground))" }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                    </div>
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0">
                      {typeLabel(item.type)}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="mt-16 text-center">
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-4 font-medium">Next Race</p>
          <a href={`/search?q=${encodeURIComponent(race.name)}`} className="inline-flex items-center border rounded-xl overflow-hidden hover:border-primary/40 transition-all duration-300" style={{
            background: 'rgba(10, 6, 6, 0.55)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
          }}>
            <div className="p-3 px-4 flex items-center justify-center">
              <RaceFlag flag={race.flag || "🏁"} flagImg={race.flagImg} />
            </div>
            <div className="flex items-center gap-4 px-5 py-3">
              <div className="text-right">
                <span className="text-[10px] font-bold tracking-wider text-primary uppercase">{race.month}</span>
                <p className="text-xl font-bold text-foreground leading-none">{race.days}</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-left">
                <p className="text-[10px] tracking-wider text-muted-foreground uppercase">Round {race.round}</p>
                <p className="text-lg font-bold text-foreground tracking-wide uppercase">{race.name.replace(" Grand Prix", " GP")}</p>
              </div>
            </div>
          </a>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-16 relative z-10 w-full mt-2">
        {/* Removed LiveTimingPanel as requested */}
      </div>
      {/* ===== MUSIC & VOLUME CONTROLS ===== */}
      <div className="fixed bottom-6 left-6 z-[100] flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 pb-[env(safe-area-inset-bottom,0px)]">
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleMusic}
          className="flex items-center gap-2 px-4 py-2 border rounded-full transition-all duration-300"
          style={{
            background: isMusicPlaying ? 'rgba(229, 70, 70, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            borderColor: isMusicPlaying ? 'rgba(229, 70, 70, 0.4)' : 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {isMusicPlaying ? (
            <Volume2 size={16} className="text-primary animate-pulse" />
          ) : (
            <VolumeX size={16} className="text-muted-foreground" />
          )}
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isMusicPlaying ? 'text-primary' : 'text-muted-foreground'}`}>
            {isMusicPlaying ? 'Music ON' : 'Music OFF'}
          </span>
        </motion.button>

        {/* Volume Slider */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-2 rounded-full border border-white/10 group hover:border-white/20 transition-all"
        >
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
            className="w-20 md:w-24 h-1 bg-white/20 accent-primary cursor-pointer appearance-none rounded-full"
            style={{
              background: `linear-gradient(to right, hsl(var(--racing-red)) ${volume}%, rgba(255,255,255,0.1) ${volume}%)`
            }}
          />
          <span className="text-[9px] font-mono font-bold text-white/50 w-6 text-center tabular-nums">
            {volume}%
          </span>
        </motion.div>
      </div>

      {/* ===== VIDEO CREDIT ATTRIBUTION ===== */}

      <a
        href="https://www.youtube.com/watch?v=GErmjAnP6ug"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 right-5 z-20 flex items-center gap-1.5 group"
        style={{ textDecoration: 'none' }}
      >
        <span style={{
          fontSize: '10px',
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.3)',
          transition: 'color 0.2s',
          fontFamily: 'inherit',
        }} className="group-hover:text-white/60">
          🎬 Video by{' '}
          <span style={{ color: 'rgba(229,70,70,0.6)', fontWeight: 600 }} className="group-hover:opacity-100">
            TimFrogt
          </span>
        </span>
      </a>

    </div>
  );
};

export default Home;
