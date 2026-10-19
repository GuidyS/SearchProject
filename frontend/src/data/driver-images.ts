interface DriverIdentity {
  driverId: string;
  familyName: string;
  permanentNumber?: string;
}

// Official Formula 1 portraits. Crop to the upper body to match the OpenF1
// headshots used by the other driver cards.
const officialPortraits2026: Record<string, string> = {
  arvid_lindblad: "https://media.formula1.com/image/upload/c_fill,w_840,h_630,g_north/q_auto/v1740000001/common/f1/2026/racingbulls/arvlin01/2026racingbullsarvlin01right.webp",
  hulkenberg: "https://media.formula1.com/image/upload/c_fill,w_840,h_630,g_north/q_auto/v1740000001/common/f1/2026/audi/nichul01/2026audinichul01right.webp",
  perez: "https://media.formula1.com/image/upload/c_fill,w_840,h_630,g_north/q_auto/v1740000001/common/f1/2026/cadillac/serper01/2026cadillacserper01right.webp",
  // Tsunoda does not currently have a 2026 driver profile; use his 2025 portrait.
  tsunoda: "https://media.formula1.com/image/upload/c_fill,w_840,h_630,g_north/q_auto/v1740000001/common/f1/2025/racingbulls/yuktsu01/2025racingbullsyuktsu01right.webp",
};

export function getDriverPortrait(
  driver: DriverIdentity,
  headshots: Record<string, string> | undefined,
  year: number,
): string | null {
  if (year === 2026 && officialPortraits2026[driver.driverId]) {
    return officialPortraits2026[driver.driverId];
  }
  const acronym = driver.familyName.normalize("NFD").replace(/\p{M}/gu, "").slice(0, 3).toUpperCase();
  return headshots?.[driver.permanentNumber || ""] || headshots?.[acronym] || null;
}
