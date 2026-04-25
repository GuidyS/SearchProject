import React, { useEffect, useState } from "react";
import { getLiveTiming } from "../data/live-api";
import { Clock, Activity } from "lucide-react";

export function LiveTimingPanel() {
  const [timing, setTiming] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const data = await getLiveTiming();
      if (data && data.timingData) {
        setTiming(data.timingData);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="text-blue-500" />
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Live Timing</h2>
      </div>

      {!timing ? (
        <p className="text-sm text-zinc-500">Connecting to timing feed...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3">Pos</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Gap</th>
                <th className="px-4 py-3">Sector 1</th>
                <th className="px-4 py-3">Sector 2</th>
                <th className="px-4 py-3">Sector 3</th>
              </tr>
            </thead>
            <tbody>
              {/* Timing data from RapidAPI is often an object mapping driver numbers to data */}
              {Object.keys(timing).slice(0, 5).map((num, i) => {
                const driver = timing[num];
                return (
                  <tr key={num} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-3 font-semibold">{i + 1}</td>
                    <td className="px-4 py-3 font-bold">{num}</td>
                    <td className="px-4 py-3">{driver.GapToLeader || "-"}</td>
                    <td className="px-4 py-3 text-zinc-500">{driver.Sectors?.[0]?.Value || "-"}</td>
                    <td className="px-4 py-3 text-zinc-500">{driver.Sectors?.[1]?.Value || "-"}</td>
                    <td className="px-4 py-3 text-zinc-500">{driver.Sectors?.[2]?.Value || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-zinc-400 mt-4 text-center">*Top 5 drivers shown</p>
        </div>
      )}
    </div>
  );
}
