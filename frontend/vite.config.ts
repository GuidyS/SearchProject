import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

function f1AssistantApi(env: Record<string, string>): Plugin {
  return {
    name: "f1-assistant-api",
    configureServer(server) {
      server.middlewares.use("/api/ask", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        const apiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY;
        if (!apiKey) {
          res.statusCode = 501;
          res.end(JSON.stringify({ error: "OPENAI_API_KEY is not configured." }));
          return;
        }

        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(Buffer.from(chunk));
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        const query = String(body.query || "").slice(0, 500);
        const sources = Array.isArray(body.sources) ? body.sources.slice(0, 8) : [];
        const context = sources
          .map((source: any, index: number) => `[${index + 1}] ${source.title} (${source.kind})\n${source.body}${source.url ? `\nURL: ${source.url}` : ""}`)
          .join("\n\n");

        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: env.OPENAI_MODEL || env.VITE_OPENAI_MODEL || "gpt-5.2",
            instructions: "You are an F1 search assistant. Answer using only the provided retrieved context, and cite source numbers like [1].",
            input: `Question: ${query}\n\nRetrieved context:\n${context}`,
            store: false,
          }),
        });

        const data = await response.json();
        const answer = data.output_text || data.output?.flatMap((item: any) => item.content || []).map((content: any) => content.text).filter(Boolean).join("\n");

        res.setHeader("Content-Type", "application/json");
        res.statusCode = response.ok ? 200 : response.status;
        res.end(JSON.stringify(response.ok ? { answer } : { error: data?.error?.message || "OpenAI request failed." }));
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && f1AssistantApi(env), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
