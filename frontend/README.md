# F1 Search

React + Vite F1 search experience with live F1 data, fuzzy search, Thai query support, and an LLM/RAG assistant.

## LLM and RAG

The search page builds a retrieval bundle from live F1 API results, local search results, standings, race data, and media links. The assistant always shows a local grounded answer first.

For LLM answers, configure the server environment:

```bash
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=gpt-5.2
```

The browser calls `POST /api/ask`, which uses the OpenAI Responses API and only sends the retrieved context plus the current question. Keep API keys on the server for production deploys.

During local Vite development, `vite.config.ts` provides the same `/api/ask` route as a dev middleware so the assistant can be tested with `npm run dev`.
