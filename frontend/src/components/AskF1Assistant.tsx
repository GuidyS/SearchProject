import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { buildRagBundle, type RagLiveData, type RagSource } from "@/data/rag";
import type { WebResult } from "@/data/search-data";

interface AskF1AssistantProps {
  query: string;
  liveData: RagLiveData | null;
  webResults: WebResult[];
}

interface AskApiResponse {
  answer?: string;
  error?: string;
}

const formatKind = (kind: RagSource["kind"]) => {
  switch (kind) {
    case "driver": return "Driver";
    case "team": return "Team";
    case "circuit": return "Circuit";
    case "standing": return "Standing";
    case "race": return "Race";
    case "media": return "Media";
    case "article": return "Article";
  }
};

export function AskF1Assistant({ query, liveData, webResults }: AskF1AssistantProps) {
  const ragBundle = useMemo(() => buildRagBundle(query, liveData, webResults), [query, liveData, webResults]);
  const [answer, setAnswer] = useState(ragBundle.answer);
  const [mode, setMode] = useState<"local" | "llm">("local");
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setAnswer(ragBundle.answer);
    setMode("local");
    setError("");
  }, [ragBundle]);

  const askLlm = async () => {
    setIsAsking(true);
    setError("");

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          sources: ragBundle.sources,
        }),
      });
      const data = await response.json() as AskApiResponse;

      if (!response.ok || !data.answer) {
        throw new Error(data.error || "The LLM endpoint did not return an answer.");
      }

      setAnswer(data.answer);
      setMode("llm");
    } catch (err) {
      setMode("local");
      setError(err instanceof Error ? err.message : "Could not reach the LLM endpoint.");
      setAnswer(ragBundle.answer);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-xl p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <BrainCircuit className="text-primary" size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Ask AI with RAG</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Answers are grounded in retrieved F1 data from this search.
            </p>
          </div>
        </div>
        <button
          onClick={askLlm}
          disabled={isAsking || ragBundle.sources.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/30 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
        >
          {isAsking ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {isAsking ? "Asking..." : "Ask LLM"}
        </button>
      </div>

      <div className="rounded-lg bg-secondary/35 border border-border/70 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            {mode === "llm" ? "LLM answer" : "Local RAG answer"}
          </span>
          {error && <span className="text-[10px] text-muted-foreground">LLM unavailable, using local context</span>}
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{answer}</p>
      </div>

      {error && (
        <p className="text-xs text-muted-foreground mt-3">
          {error}
        </p>
      )}

      <div className="mt-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Retrieved sources
        </p>
        <div className="grid gap-2">
          {ragBundle.sources.slice(0, 5).map((source) => {
            const content = (
              <>
                <span className="min-w-16 text-[10px] font-bold uppercase tracking-wider text-primary">
                  {formatKind(source.kind)}
                </span>
                <span className="text-xs font-medium text-foreground truncate">{source.title}</span>
                {source.url && <ExternalLink size={12} className="text-muted-foreground ml-auto shrink-0" />}
              </>
            );

            return source.url ? (
              <a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/40 px-3 py-2 hover:border-primary/30 transition-colors"
              >
                {content}
              </a>
            ) : (
              <div key={source.id} className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/40 px-3 py-2">
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
