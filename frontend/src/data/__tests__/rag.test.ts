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
  lastRace: {
    round: "3",
    raceName: "Japanese Grand Prix",
    Circuit: {
      circuitId: "suzuka",
      circuitName: "Suzuka Circuit",
      Location: {
        locality: "Suzuka",
        country: "Japan",
      },
    },
    date: "2026-04-05",
    Results: [],
  },
  previousRace: {
    round: "2",
    raceName: "Chinese Grand Prix",
    Circuit: {
      circuitId: "shanghai",
      circuitName: "Shanghai International Circuit",
      Location: {
        locality: "Shanghai",
        country: "China",
      },
    },
    date: "2026-03-22",
    Results: [],
  },
  nextRace: {
    round: "4",
    raceName: "Bahrain Grand Prix",
    Circuit: {
      circuitId: "bahrain",
      circuitName: "Bahrain International Circuit",
      Location: {
        locality: "Sakhir",
        country: "Bahrain",
      },
    },
    date: "2026-04-12",
    time: "12:00:00Z",
    Results: [],
  },
  driverRaces: [],
};

const todayDate = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
})();

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

  it("does not use generated media as the strongest source for mixed Thai driver queries", () => {
    const bundle = buildRagBundle("Max ล่าสุด", {
      ...liveData,
      parsedQuery: "Max ล่าสุด",
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
        title: "Latest Update from Max ล่าสุด",
        snippet: "A generated social update that should not ground RAG answers.",
        source: "@max",
        url: "https://example.com/social",
        type: "social",
      },
    ]);

    expect(bundle.sources[0].title).toBe("Max Verstappen");
    expect(bundle.answer).not.toContain("generated social update");
  });

  it("answers latest circuit questions from the latest race context", () => {
    const bundle = buildRagBundle("สนามล่าสุเ", liveData, []);

    expect(bundle.sources[0].title).toBe("Latest race: Japanese Grand Prix");
    expect(bundle.answer).toContain("สนามล่าสุด");
    expect(bundle.answer).toContain("Suzuka Circuit");
    expect(bundle.answer).toContain("Japan");
  });

  it("answers previous circuit questions from previous race context", () => {
    const bundle = buildRagBundle("สนามก่อนหน้านี้", liveData, []);

    expect(bundle.sources[0].title).toBe("Previous race: Chinese Grand Prix");
    expect(bundle.answer).toContain("สนามก่อนหน้านี้");
    expect(bundle.answer).toContain("Shanghai International Circuit");
    expect(bundle.answer).toContain("China");
  });

  it("answers next circuit questions from next race context", () => {
    const bundle = buildRagBundle("สนามถัดไป", liveData, []);

    expect(bundle.sources[0].title).toBe("Next race: Bahrain Grand Prix");
    expect(bundle.answer).toContain("สนามถัดไป");
    expect(bundle.answer).toContain("Bahrain International Circuit");
    expect(bundle.answer).toContain("Bahrain");
  });

  it("answers standings leader questions from P1 standings", () => {
    const bundle = buildRagBundle("ใครนำตารางคะแนน", liveData, []);

    expect(bundle.sources[0].title).toBe("2026 standing: Lando Norris");
    expect(bundle.answer).toContain("ผู้นำตาราง");
    expect(bundle.answer).toContain("Lando Norris");
  });

  it("answers today venue questions from a race dated today", () => {
    const bundle = buildRagBundle("วันนี้แข่งที่ไหน", {
      ...liveData,
      nextRace: {
        ...liveData.nextRace!,
        date: todayDate,
      },
    }, []);

    expect(bundle.sources[0].title).toBe("Next race: Bahrain Grand Prix");
    expect(bundle.answer).toContain("วันนี้มีแข่ง");
    expect(bundle.answer).toContain("Bahrain International Circuit");
  });

  it("answers today venue questions with the next race when there is no race today", () => {
    const bundle = buildRagBundle("วันนี้แข่งที่ไหน", liveData, []);

    expect(bundle.sources[0].title).toBe("Next race: Bahrain Grand Prix");
    expect(bundle.answer).toContain("สนามถัดไป");
    expect(bundle.answer).toContain("Bahrain International Circuit");
  });

  it("answers today race time questions with race start time when available", () => {
    const bundle = buildRagBundle("วันนี้แข่งกี่โมง", {
      ...liveData,
      nextRace: {
        ...liveData.nextRace!,
        date: todayDate,
        time: "12:00:00Z",
      },
    }, []);

    expect(bundle.sources[0].title).toBe("Next race: Bahrain Grand Prix");
    expect(bundle.answer).toContain("Race เริ่มเวลา 19:00 น");
    expect(bundle.answer).toContain("สนาม: Bahrain International Circuit");
    expect(bundle.answer).toContain("ตารางเวลา:");
    expect(bundle.answer).toContain("- Race:");
    expect(bundle.answer).not.toContain("สนามถัดไป");
  });
});
