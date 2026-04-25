import React, { useEffect, useState } from "react";
import { getTrackStatus, getWeatherData } from "../data/live-api";
import { Cloud, CloudRain, Sun, MapPin, Flag } from "lucide-react";

export function CircuitCard({ circuitId }: { circuitId?: string }) {
  const [weather, setWeather] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const wData = await getWeatherData();
      if (wData && wData.weatherData && wData.weatherData.length > 0) {
        // Get the latest weather data point
        setWeather(wData.weatherData[wData.weatherData.length - 1]);
      }
      
      const sData = await getTrackStatus();
      if (sData) setStatus(sData);
    }
    load();
    // Poll every 30 seconds
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <MapPin className="text-red-600" /> Current Circuit Status
          </h2>
          <p className="text-sm text-zinc-500">Live data from OpenF1</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Track Map Placeholder corresponding to Circuit */}
        <div className="bg-zinc-100 dark:bg-zinc-800/50 p-4 rounded-lg flex items-center justify-center min-h-[200px]">
          <img 
            src={
              circuitId && ["bahrain", "jeddah", "albert_park", "suzuka", "shanghai", "miami", "imola", "monaco", "villeneuve", "catalunya", "red_bull_ring", "silverstone", "hungaroring", "spa", "zandvoort", "monza", "baku", "marina_bay", "americas", "rodriguez", "interlagos", "vegas", "losail", "yas_marina"].includes(circuitId)
              ? `https://media.formula1.com/image/upload/f_auto/q_auto/v1677244985/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/${
                  ({
                    bahrain: "Bahrain_Circuit", jeddah: "Jeddah_Street_Circuit", albert_park: "Australia_Circuit",
                    suzuka: "Japan_Circuit", shanghai: "China_Circuit", miami: "Miami_Circuit", imola: "Emilia_Romagna_Circuit",
                    monaco: "Monaco_Circuit", villeneuve: "Canada_Circuit", catalunya: "Spain_Circuit",
                    red_bull_ring: "Austria_Circuit", silverstone: "Great_Britain_Circuit", hungaroring: "Hungary_Circuit",
                    spa: "Belgium_Circuit", zandvoort: "Netherlands_Circuit", monza: "Italy_Circuit", baku: "Baku_Circuit",
                    marina_bay: "Singapore_Circuit", americas: "USA_Circuit", rodriguez: "Mexico_Circuit",
                    interlagos: "Brazil_Circuit", vegas: "Las_Vegas_Circuit", losail: "Qatar_Circuit", yas_marina: "Abu_Dhabi_Circuit"
                  } as Record<string, string>)[circuitId] || "Monaco_Circuit"
              }.png`
              : "https://media.formula1.com/image/upload/f_auto/q_auto/v1677244985/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/Monaco_Circuit.png"
            } 
            alt={`Track Map - ${circuitId || "Demo"}`}
            className="w-full max-w-[300px] h-auto opacity-90 dark:invert-0"
          />
        </div>

        <div className="space-y-4">
          <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
            <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2 mb-2">
              <Sun className="text-amber-500" /> Weather Station
            </h3>
            {weather ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Air Temp: <span className="font-bold">{weather.AirTemp}°C</span></div>
                <div>Track Temp: <span className="font-bold">{weather.TrackTemp}°C</span></div>
                <div>Humidity: <span className="font-bold">{weather.Humidity}%</span></div>
                <div>Wind: <span className="font-bold">{weather.WindSpeed} m/s</span></div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Loading weather data...</p>
            )}
          </div>

          <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
            <h3 className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2 mb-2">
              <Flag className="text-green-500" /> Track Status
            </h3>
            {status && status.trackStatus ? (
              <div className="text-sm">
                <div>Status: <span className="font-bold">{status.trackStatus.Status || "Normal"}</span></div>
                <div>Message: <span className="font-bold">{status.trackStatus.Message || "Track Clear"}</span></div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Loading track status...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
