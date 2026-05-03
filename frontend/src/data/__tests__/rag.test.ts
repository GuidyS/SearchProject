import { describe, expect, it } from "vitest";
import { buildRagBundle, buildRagSources, retrieveRagSources, type RagLiveData } from "../rag";

const liveData: RagLiveData = {
  year: 2026,
  parsedQuery: "Lando Norris",
  drivers: [
    {
      driverId: "norris",
      givenName: "Lando",
      familyName: "Norris",
      nationality: "British",
      permanentNumber: "4",
    },
  ],
  constructors: [
    {
      constructorId: "mclaren",
      name: "McLaren",
      nationality: "British",
    },
  ],
  circuits: [],
  standings: [
    {
      position: "1",
      points: "88",
      wins: "2",
      Driver: {
        driverId: "norris",
        givenName: "Lando",
        familyName: "Norris",
        nationality: "British",
      },
      Constructors: [
        {
          constructorId: "mclaren",
          name: "McLaren",
          nationality: "British",
        },
      ],
    },
  ],
  lastRace: null,
  driverRaces: [],
};

describe("RAG data helpers", () => {
  it("builds grounded sources from live data", () => {
    const sources = buildRagSources(liveData, []);

    expect(sources.some((source) => source.kind === "driver" && source.title === "Lando Norris")).toBe(true);
    expect(sources.some((source) => source.body.includes("88 points"))).toBe(true);
  });

  it("retrieves the most relevant source for a query", () => {
    const sources = buildRagSources(liveData, []);
    const retrieved = retrieveRagSources("who is lando", sources);

    expect(retrieved[0].title).toBe("Lando Norris");
  });

  it("creates a local answer when the LLM is unavailable", () => {
    const bundle = buildRagBundle("Lando Norris", liveData, []);

    expect(bundle.answer).toContain("Lando Norris");
    expect(bundle.sources.length).toBeGreaterThan(0);
  });

  it("does not use generated media as the strongest source for mixed Thai queries", () => {
    const bundle = buildRagBundle("Maxเริ่มที่เท่าไหร่วันนี้", {
      ...liveData,
      parsedQuery: "Maxเริ่มที่เท่าไหร่วันนี้",
      drivers: [
        {
          driverId: "verstappen",
          givenName: "Max",
          familyName: "Verstappen",
          nationality: "Dutch",
        },
      ],
    }, [
      {
        title: "Latest Update from Maxเริ่มที่เท่าไหร่วันนี้",
        snippet: "A generated social update that should not ground RAG answers.",
        source: "@max",
        url: "https://example.com/social",
        type: "social",
      },
    ]);

    expect(bundle.sources[0].title).toBe("Max Verstappen");
    expect(bundle.answer).toContain("ยังไม่มีเวลาเริ่มแข่งวันนี้");
    expect(bundle.answer).not.toContain("generated social update");
  });
});
