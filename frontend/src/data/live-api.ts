import { cachedJson } from "./f1-cache";

export async function getLiveTiming() {
  try {
    const intData = await cachedJson<any[]>('https://api.openf1.org/v1/intervals?session_key=latest', 1000 * 30);
    const timingObj: Record<string, any> = {};
    for (let i = intData.length - 1; i >= 0; i--) {
        const d = intData[i];
        if (!timingObj[d.driver_number]) {
            timingObj[d.driver_number] = {
                GapToLeader: d.gap_to_leader || "-",
                Sectors: [{ Value: "N/A" }, { Value: "N/A" }, { Value: "N/A" }]
            };
        }
    }
    return { timingData: timingObj };
  } catch (e) {
    return null;
  }
}

export async function getTrackStatus() {
  try {
    const rcData = await cachedJson<any[]>('https://api.openf1.org/v1/race_control?session_key=latest', 1000 * 30);
    if (rcData.length > 0) {
        const latestFlag = rcData.reverse().find((r: any) => r.category === "Flag" || r.flag);
        return {
            trackStatus: {
                Status: latestFlag ? latestFlag.flag : "Normal",
                Message: latestFlag ? latestFlag.message : "Track Clear"
            }
        };
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function getWeatherData() {
  try {
    const wData = await cachedJson<any[]>('https://api.openf1.org/v1/weather?session_key=latest', 1000 * 30);
    if (wData.length > 0) {
        const latestW = wData[wData.length - 1];
        return { 
            weatherData: [{
                AirTemp: latestW.air_temperature,
                TrackTemp: latestW.track_temperature,
                Humidity: latestW.humidity,
                WindSpeed: latestW.wind_speed
            }] 
        };
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function getF1News() {
  try {
    const data = await cachedJson<any>('https://api.rss2json.com/v1/api.json?rss_url=https://www.motorsport.com/rss/f1/news/');
    return data.items || [];
  } catch (e) {
    return [];
  }
}

export async function getDriverHeadshots() {
  try {
    const data = await cachedJson<any[]>('https://api.openf1.org/v1/drivers?session_key=latest', 1000 * 60 * 60);
    const headshots: Record<string, string> = {};
    for (const d of data) {
      if (d.name_acronym && d.headshot_url) {
        // Remove the thumbnail transform suffix to fetch the original high-resolution F1 image
        headshots[d.name_acronym] = d.headshot_url.replace(/\.transform\/.*$/, '');
      }
    }
    return headshots;
  } catch (e) {
    return {};
  }
}
