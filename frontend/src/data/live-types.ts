export interface LiveDriver {
  number: number;
  position: number | null;
  name: string;
  acronym: string;
  team: string;
  colour: string;
  gap: string | number | null;
  interval: string | number | null;
}

export interface LiveSnapshot {
  session: {
    name: string;
    meeting: string;
    location: string;
    start: string;
    end: string | null;
    active: boolean;
  };
  drivers: LiveDriver[];
  weather: {
    air: number | null;
    track: number | null;
    humidity: number | null;
    rain: number | null;
  } | null;
  trackStatus: { flag: string | null; message: string; date: string } | null;
  dataAsOf: string | null;
  fetchedAt: string;
}
