import { useEffect, useState } from "react";
import { Flag, MapPin, Sun } from "lucide-react";
import { getCircuitLiveSnapshot, scheduledSessionIsActive, type CircuitLiveSnapshot } from "@/data/calendar-live";
import type { CalendarSession } from "@/data/calendar-time";

const circuitMaps: Record<string, string> = {
  bahrain: "Bahrain_Circuit", jeddah: "Jeddah_Street_Circuit", albert_park: "Australia_Circuit",
  suzuka: "Japan_Circuit", shanghai: "China_Circuit", miami: "Miami_Circuit",
  imola: "Emilia_Romagna_Circuit", monaco: "Monaco_Circuit", villeneuve: "Canada_Circuit",
  catalunya: "Spain_Circuit", red_bull_ring: "Austria_Circuit", silverstone: "Great_Britain_Circuit",
  hungaroring: "Hungary_Circuit", spa: "Belgium_Circuit", zandvoort: "Netherlands_Circuit",
  monza: "Italy_Circuit", baku: "Baku_Circuit", marina_bay: "Singapore_Circuit",
  americas: "USA_Circuit", rodriguez: "Mexico_Circuit", interlagos: "Brazil_Circuit",
  vegas: "Las_Vegas_Circuit", losail: "Qatar_Circuit", yas_marina: "Abu_Dhabi_Circuit",
};

export function CircuitCard({ circuitId, sessions }: { circuitId?: string; sessions: CalendarSession[] }) {
  const [snapshot, setSnapshot] = useState<CircuitLiveSnapshot | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const active = scheduledSessionIsActive(sessions);
      if (!cancelled) {
        setIsActive(active);
        if (!active) {
          setSnapshot(null);
          setHasError(false);
          return;
        }
        setIsLoading(true);
      }
      try {
        const data = await getCircuitLiveSnapshot(sessions);
        if (!cancelled) {
          setSnapshot(data);
          setHasError(false);
        }
      } catch {
        if (!cancelled) {
          setSnapshot(null);
          setHasError(true);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    const interval = window.setInterval(load, 30_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [sessions]);

  const mapName = circuitId ? circuitMaps[circuitId] : undefined;
  const weather = snapshot?.weather;
  const trackStatus = snapshot?.trackStatus;
  const liveLabel = !isActive
    ? "Live conditions become available during this race weekend's sessions."
    : hasError ? "Live data is temporarily unavailable."
      : isLoading && !snapshot ? "Checking the current session..."
        : snapshot && (weather || trackStatus) ? "Live data from OpenF1 for this session" : "No live data for this circuit yet.";

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <MapPin className="text-red-600" /> Circuit & session conditions
        </h2>
        <p className="text-sm text-zinc-500">{liveLabel}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-zinc-100 dark:bg-zinc-800/50 p-4 rounded-lg flex items-center justify-center min-h-[200px]">
          {mapName ? (
            <img
              src={`https://media.formula1.com/image/upload/f_auto/q_auto/v1677244985/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/${mapName}.png`}
              alt={`Track map for ${circuitId}`}
              className="w-full max-w-[300px] h-auto opacity-90"
            />
          ) : <p className="text-sm text-zinc-500">Circuit map unavailable</p>}
        </div>

        <div className="space-y-4">
          <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
            <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2 mb-2">
              <Sun className="text-amber-500" /> Weather station
            </h3>
            {weather ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Air temp: <span className="font-bold">{weather.air_temperature}°C</span></div>
                  <div>Track temp: <span className="font-bold">{weather.track_temperature}°C</span></div>
                  <div>Humidity: <span className="font-bold">{weather.humidity}%</span></div>
                  <div>Wind: <span className="font-bold">{weather.wind_speed} m/s</span></div>
                </div>
                <p className="text-xs text-zinc-500 mt-2">Updated {new Date(weather.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              </>
            ) : <p className="text-sm text-zinc-500">No current weather reading</p>}
          </div>

          <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
            <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2 mb-2">
              <Flag className="text-green-500" /> Track status
            </h3>
            {trackStatus ? (
              <div className="text-sm">
                <div>Flag: <span className="font-bold">{trackStatus.flag || "—"}</span></div>
                <div>Message: <span className="font-bold">{trackStatus.message || "—"}</span></div>
                <p className="text-xs text-zinc-500 mt-2">Last report {new Date(trackStatus.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            ) : <p className="text-sm text-zinc-500">No track report for this session</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
