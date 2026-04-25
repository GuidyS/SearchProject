import React, { useEffect, useState } from "react";
import { getF1News } from "../data/live-api";
import { Newspaper } from "lucide-react";

export function NewsCarousel() {
  const [news, setNews] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const data = await getF1News();
      if (data && data.length > 0) {
        setNews(data);
      }
    }
    load();
  }, []);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="text-purple-500" />
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Latest F1 News</h2>
      </div>

      {news.length === 0 ? (
        <p className="text-sm text-zinc-500">Loading latest news...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {news.slice(0, 4).map((item, idx) => (
            <a 
              key={idx} 
              href={item.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block p-4 border border-zinc-100 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 mb-2">
                {item.title}
              </h3>
              <p className="text-xs text-zinc-500">
                {new Date(item.pubDate).toLocaleDateString()}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
