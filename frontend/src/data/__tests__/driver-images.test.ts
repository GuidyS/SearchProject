import { describe, expect, it } from "vitest";
import { getDriverPortrait } from "../driver-images";

describe("driver portraits", () => {
  it("matches accented surnames to OpenF1 acronyms", () => {
    expect(getDriverPortrait(
      { driverId: "hulkenberg", familyName: "Hülkenberg" },
      { HUL: "https://example.com/hul.webp" },
      2025,
    )).toBe("https://example.com/hul.webp");
  });

  it("uses a verified portrait when the latest session has no photo", () => {
    expect(getDriverPortrait(
      { driverId: "tsunoda", familyName: "Tsunoda", permanentNumber: "22" },
      {},
      2026,
    )).toContain("2025racingbullsyuktsu01right.webp");
  });
});
