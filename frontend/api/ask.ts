interface RagSource {
  title: string;
  kind: string;
  body: string;
  url?: string;
}

const model = process.env.OPENAI_MODEL || process.env.VITE_OPENAI_MODEL || "gpt-5.2";

function getOutputText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;

  const textParts = payload?.output
    ?.flatMap((item: any) => item?.content || [])
    ?.map((content: any) => content?.text)
    ?.filter(Boolean);

  return textParts?.join("\n").trim() || "";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(501).json({ error: "OPENAI_API_KEY is not configured on the server." });
  }

  const query = String(req.body?.query || "").slice(0, 500);
  const sources = Array.isArray(req.body?.sources) ? req.body.sources.slice(0, 8) as RagSource[] : [];
  if (!query || !sources.length) {
    return res.status(400).json({ error: "A query and at least one retrieved source are required." });
  }

  const context = sources
    .map((source, index) => `[${index + 1}] ${source.title} (${source.kind})\n${source.body}${source.url ? `\nURL: ${source.url}` : ""}`)
    .join("\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: [
        "You are the AI overview layer for an F1 web search experience in a Thai and English React app.",
        "Answer using only the provided retrieved context.",
        "If the context is insufficient, say what is missing.",
        "Write like a search result summary, not like a chatbot debugging retrieval.",
        "Keep the answer concise, helpful, and cite source numbers like [1].",
      ].join(" "),
      input: `Question: ${query}\n\nRetrieved context:\n${context}`,
      store: false,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return res.status(response.status).json({ error: data?.error?.message || "OpenAI request failed." });
  }

  const answer = getOutputText(data);
  return res.status(200).json({ answer });
}
