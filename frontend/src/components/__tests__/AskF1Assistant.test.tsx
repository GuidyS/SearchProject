import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AskF1Assistant } from "../AskF1Assistant";
import type { RagLiveData } from "@/data/rag";

const liveData: RagLiveData = {
  year: 2026,
  parsedQuery: "today race time",
  drivers: [],
  constructors: [],
  circuits: [],
  standings: [],
  previousRace: null,
  lastRace: null,
  nextRace: {
    round: "6",
    raceName: "Miami Grand Prix",
    Circuit: {
      circuitId: "miami",
      circuitName: "Miami International Autodrome",
      Location: {
        locality: "Miami",
        country: "USA",
      },
    },
    date: new Date().toISOString().slice(0, 10),
    time: "20:00:00Z",
  },
  driverRaces: [],
};

describe("AskF1Assistant LLM/RAG behavior", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a local RAG search summary and source list before calling the LLM", () => {
    render(
      <AskF1Assistant
        query="วันนี้แข่งกี่โมง"
        liveData={liveData}
        webResults={[]}
      />
    );

    expect(screen.getByText("AI Overview")).toBeInTheDocument();
    expect(screen.getByText("Search summary")).toBeInTheDocument();
    expect(screen.getByText("Sources")).toBeInTheDocument();
    expect(screen.getByText("Next race: Miami Grand Prix")).toBeInTheDocument();
    expect(screen.getByText(/Race เริ่มเวลา/)).toBeInTheDocument();
    expect(screen.getByText(/Miami International Autodrome/)).toBeInTheDocument();
  });

  it("sends the retrieved RAG sources to the LLM endpoint and renders the LLM answer", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        answer: "AI says Miami starts at 03:00 น. ไทย [1]",
      }),
    } as Response);

    render(
      <AskF1Assistant
        query="วันนี้แข่งกี่โมง"
        liveData={liveData}
        webResults={[]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /search with ai/i }));

    await waitFor(() => {
      expect(screen.getByText("AI answer")).toBeInTheDocument();
    });

    expect(screen.getByText("AI says Miami starts at 03:00 น. ไทย [1]")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ask",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      }),
    );

    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse((init as RequestInit).body as string);
    expect(payload.query).toBe("วันนี้แข่งกี่โมง");
    expect(payload.sources[0].title).toBe("Next race: Miami Grand Prix");
    expect(payload.sources[0].body).toContain("Race start");
  });

  it("falls back to local RAG output when the LLM endpoint fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "LLM unavailable",
      }),
    } as Response);

    render(
      <AskF1Assistant
        query="วันนี้แข่งกี่โมง"
        liveData={liveData}
        webResults={[]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /search with ai/i }));

    await waitFor(() => {
      expect(screen.getByText("Search summary")).toBeInTheDocument();
      expect(screen.getByText("Using indexed results")).toBeInTheDocument();
    });

    expect(screen.getByText("LLM unavailable")).toBeInTheDocument();
    expect(screen.getByText(/Race เริ่มเวลา/)).toBeInTheDocument();
  });
});
