import { useState, useRef, useEffect, useMemo } from "react";
import { Link, NavLink, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Search, X, User, Users, MapPin, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { searchF1, type SearchItem } from "@/data/search-data";
import { containsThai, getThaiSuggestions } from "@/data/thai-mappings";

const navItems = [
  { to: "/results", label: "Results" },
  { to: "/calendar", label: "Calendar" },
  { to: "/drivers", label: "Drivers" },
  { to: "/teams", label: "Teams" },
];

interface SiteHeaderProps {
  showSearch?: boolean;
}

const SiteHeader = ({ showSearch = true }: SiteHeaderProps) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialQuery = location.pathname === "/search" ? (searchParams.get("q") || "") : "";
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [displayQuery, setDisplayQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = searchTerm.trim() ? searchF1(searchTerm) : [];
  const thaiSuggestions = useMemo(() => containsThai(searchTerm) ? getThaiSuggestions(searchTerm) : [], [searchTerm]);
  const showDropdown = isFocused && (thaiSuggestions.length > 0 || results.length > 0);

  const currentSuggestions = thaiSuggestions.length > 0 
    ? thaiSuggestions.slice(0, 5) 
    : results.slice(0, 5);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchTerm, isFocused]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (location.pathname === "/search") {
      const q = searchParams.get("q") || "";
      setSearchTerm(q);
      setDisplayQuery(q);
    }
  }, [location.pathname, searchParams]);

  const typeIcon = (type: string) => {
    if (type === "driver" || type === "person") return <User size={14} className="text-primary" />;
    if (type === "team" || type === "groups") return <Users size={14} className="text-primary" />;
    return <MapPin size={14} className="text-primary" />;
  };

  const handleSelect = (selectedTerm: string) => {
    if (location.pathname !== "/search") {
      setSearchTerm("");
      setDisplayQuery("");
    }
    setIsFocused(false);
    navigate(`/search?q=${encodeURIComponent(selectedTerm)}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3 md:gap-6">
        {/* Logo (Left) */}
        <div className="flex items-center shrink-0">
          <Link to="/">
            <span className="text-2xl md:text-3xl font-extrabold italic tracking-tighter transition-all">
              <span className="text-primary">F1</span>
              <span className="text-foreground">Search</span>
            </span>
          </Link>
        </div>

        {/* Search bar */}
        {showSearch ? (
        <div ref={containerRef} className="flex-1 max-w-2xl relative">
          <div className={cn(
            "flex items-center gap-2 bg-secondary border rounded-full px-4 py-2 transition-all",
            isFocused ? "border-primary/40 shadow-sm shadow-primary/20" : "border-border"
          )}>
            <Search className="text-muted-foreground shrink-0" size={18} />
            <input
              ref={inputRef}
              type="text"
              value={displayQuery}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setDisplayQuery(e.target.value);
                setSelectedIndex(-1);
              }}
              onFocus={() => setIsFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSelectedIndex(prev => {
                    const next = prev < currentSuggestions.length - 1 ? prev + 1 : prev;
                    if (next >= 0 && currentSuggestions[next]) {
                      const selected = currentSuggestions[next];
                      setDisplayQuery('thai' in selected ? (selected as any).thai : (selected as any).name);
                    }
                    return next;
                  });
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSelectedIndex(prev => {
                    const next = prev > -1 ? prev - 1 : prev;
                    if (next >= 0 && currentSuggestions[next]) {
                      const selected = currentSuggestions[next];
                      setDisplayQuery('thai' in selected ? (selected as any).thai : (selected as any).name);
                    } else if (next === -1) {
                      setDisplayQuery(searchTerm);
                    }
                    return next;
                  });
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (displayQuery.trim()) {
                    handleSelect(displayQuery);
                    setMobileMenuOpen(false);
                  }
                } else if (e.key === "Escape") {
                  setIsFocused(false);
                }
              }}
              placeholder="ค้นหานักแข่ง ทีม สนาม... (e.g. 'แวร์สแตปเพน 2023')"
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
            />
            {displayQuery && (
              <button onClick={() => { setSearchTerm(""); setDisplayQuery(""); inputRef.current?.focus(); }} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            )}
          </div>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full mt-1.5 bg-card border border-border rounded-xl overflow-hidden shadow-2xl shadow-black/40 z-50"
              >
                {thaiSuggestions.length > 0 && (
                  <>
                    <p className="px-3 pt-2.5 pb-1 text-[9px] tracking-[0.2em] uppercase text-muted-foreground font-medium">
                      🇹🇭 คำแนะนำภาษาไทย
                    </p>
                    {thaiSuggestions.slice(0, 5).map((s, i) => (
                      <button
                        key={`thai-${s.english}-${i}`}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left group",
                          selectedIndex === i ? "bg-secondary/60" : "hover:bg-secondary/60"
                        )}
                        onClick={() => handleSelect(s.thai)}
                        onMouseEnter={() => setSelectedIndex(i)}
                      >
                        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-primary/10">
                          {typeIcon(s.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">{s.thai}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{s.english}</p>
                        </div>
                        <span className="text-[9px] font-semibold tracking-wider uppercase text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full shrink-0">
                          {s.type === "driver" ? "นักแข่ง" : s.type === "team" ? "ทีม" : "สนาม"}
                        </span>
                      </button>
                    ))}
                  </>
                )}
                {thaiSuggestions.length === 0 && results.slice(0, 5).map((item, i) => (
                  <button
                    key={`${item.type}-${item.name}-${i}`}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left group",
                      selectedIndex === i ? "bg-secondary/60" : "hover:bg-secondary/60"
                    )}
                    onClick={() => handleSelect(item.name)}
                    onMouseEnter={() => setSelectedIndex(i)}
                  >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-primary/10">
                      {typeIcon(item.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{item.detail}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center shrink-0">
          <nav className="flex items-center gap-5 text-xs font-semibold tracking-wider uppercase">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden shrink-0">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1.5 text-foreground hover:text-primary transition-colors">
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-card overflow-hidden shadow-xl"
          >
            <nav className="flex flex-col p-2 gap-1 text-xs font-semibold tracking-wider uppercase">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "transition-colors px-4 py-3 rounded-md",
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default SiteHeader;
