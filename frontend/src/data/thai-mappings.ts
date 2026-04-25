// Thai name mappings for F1 search
// Maps Thai text → English search terms
import Fuse from "fuse.js";

export const thaiDriverNames: Record<string, string[]> = {
  // Current grid 2025
  "แวร์สแตปเพน": ["verstappen"], "แม็กซ์": ["max"], "แม็กซ์ แวร์สแตปเพน": ["max verstappen"],
  "นอร์ริส": ["norris"], "แลนโด": ["lando"], "แลนโด นอร์ริส": ["lando norris"],
  "เลอแคลร์": ["leclerc"], "ชาร์ล": ["charles"], "ชาร์ล เลอแคลร์": ["charles leclerc"],
  "แฮมิลตัน": ["hamilton"], "ลิวอิส": ["lewis"], "ลิวอิส แฮมิลตัน": ["lewis hamilton"],
  "เปียสตรี": ["piastri"], "ออสการ์": ["oscar"], "ออสการ์ เปียสตรี": ["oscar piastri"],
  "รัสเซลล์": ["russell"], "จอร์จ": ["george"], "จอร์จ รัสเซลล์": ["george russell"],
  "อลอนโซ": ["alonso"], "เฟอร์นันโด": ["fernando"], "เฟอร์นันโด อลอนโซ": ["fernando alonso"],
  "ไซนซ์": ["sainz"], "คาร์ลอส": ["carlos"], "คาร์ลอส ไซนซ์": ["carlos sainz"],
  "เปเรซ": ["perez"], "เชโก": ["perez"], "เชโก เปเรซ": ["sergio perez"],
  "สตรอลล์": ["stroll"], "แลนซ์": ["lance"], "แลนซ์ สตรอลล์": ["lance stroll"],
  "กาสลี": ["gasly"], "ปิแอร์": ["pierre"], "ปิแอร์ กาสลี": ["pierre gasly"],
  "โอคอน": ["ocon"], "เอสเตบัน": ["esteban"], "เอสเตบัน โอคอน": ["esteban ocon"],
  "อัลบอน": ["albon"], "อเล็กซ์": ["alex"], "อเล็กซ์ อัลบอน": ["alexander albon"],
  "สึโนดะ": ["tsunoda"], "ยูกิ": ["yuki"], "ยูกิ สึโนดะ": ["yuki tsunoda"],
  "โจว": ["zhou"], "กวนยู": ["guanyu"], "โจว กวนยู": ["guanyu zhou"],
  "แมกนัสเซน": ["magnussen"], "เควิน": ["kevin"], "เควิน แมกนัสเซน": ["kevin magnussen"],
  "ฮัลเคนเบิร์ก": ["hulkenberg"], "นิโค": ["nico"], "นิโค ฮัลเคนเบิร์ก": ["nico hulkenberg"],
  "ริคคาร์โด": ["ricciardo"], "แดเนียล": ["daniel"], "แดเนียล ริคคาร์โด": ["daniel ricciardo"],
  "ลอว์สัน": ["lawson"], "เลียม": ["liam"], "เลียม ลอว์สัน": ["liam lawson"],
  "โบทัส": ["bottas"], "วาลเทอร์รี": ["valtteri"], "วาลเทอร์รี โบทัส": ["valtteri bottas"],
  "เบียร์แมน": ["bearman"], "โอลิเวอร์": ["oliver"], "โอลิเวอร์ เบียร์แมน": ["oliver bearman"],
  "แอนโทเนลลี": ["antonelli"], "คิมิ": ["kimi"], "คิมิ แอนโทเนลลี": ["kimi antonelli"],
  "ฮาดจาร์": ["hadjar"], "อิซัค": ["isack"], "อิซัค ฮาดจาร์": ["isack hadjar"],
  "ดูฮาน": ["doohan"], "แจ็ค": ["jack"], "แจ็ค ดูฮาน": ["jack doohan"],
  "บอร์โตเลโต": ["bortoleto"], "กาเบรียล": ["gabriel"], "กาเบรียล บอร์โตเลโต": ["gabriel bortoleto"],
};

export const thaiTeamNames: Record<string, string[]> = {
  "แมคลาเรน": ["mclaren"],
  "เฟอร์รารี": ["ferrari"], "สคูเดอเรีย เฟอร์รารี": ["ferrari"],
  "เรดบูล": ["red bull"], "เรดบูลเรซซิ่ง": ["red bull"],
  "เมอร์เซเดส": ["mercedes"],
  "แอสตัน มาร์ติน": ["aston martin"], "แอสตันมาร์ติน": ["aston martin"],
  "อัลไพน์": ["alpine"],
  "วิลเลียมส์": ["williams"],
  "ฮาส": ["haas"],
  "เคาเบอร์": ["sauber"], "ซาวเบอร์": ["sauber"],
  "อาร์บี": ["rb"], "วีซ่าแคชแอป อาร์บี": ["rb"],
  "ออดี้": ["audi"],
  "แคดิลแลค": ["cadillac"],
};

export const thaiCircuitNames: Record<string, string[]> = {
  "ซิลเวอร์สโตน": ["silverstone"],
  "โมนาโค": ["monaco"],
  "มอนซ่า": ["monza"],
  "สปา": ["spa"],
  "ซูซูกะ": ["suzuka"],
  "อินเตอร์ลากอส": ["interlagos"],
  "เซปัง": ["sepang"],
  "บาห์เรน": ["bahrain"],
  "ซาคีร์": ["sakhir"],
  "เจดดาห์": ["jeddah"],
  "อัลเบิร์ตพาร์ค": ["albert_park", "albert park", "melbourne"],
  "เมลเบิร์น": ["melbourne", "albert park"],
  "เซี่ยงไฮ้": ["shanghai"],
  "ไมอามี": ["miami"],
  "บาร์เซโลนา": ["barcelona", "catalunya"],
  "มอนทรีออล": ["montreal"],
  "ซานเปาโล": ["sao paulo", "interlagos"],
  "สิงคโปร์": ["singapore", "marina bay"],
  "ออสติน": ["austin", "americas"],
  "ลาสเวกัส": ["las vegas"],
  "อาบูดาบี": ["abu dhabi", "yas marina"],
  "อิโมลา": ["imola"],
  "ฮังการอริง": ["hungaroring"],
  "แซนด์วอร์ต": ["zandvoort"],
};

export const thaiGenericTerms: Record<string, string> = {
  "นักแข่ง": "driver",
  "ทีม": "team",
  "สนาม": "circuit",
  "แชมป์": "champion",
  "แชมเปี้ยน": "champion",
  "ผลการแข่ง": "results",
  "ตารางแข่ง": "calendar",
  "คะแนน": "standings",
  "กรังด์ปรีซ์": "grand prix",
  "กรังปรีซ์": "grand prix",
};

export interface ThaiSuggestion {
  thai: string;
  english: string;
  type: "driver" | "team" | "circuit";
}

const allThaiMappings: ThaiSuggestion[] = [];
for (const [thai, engArray] of Object.entries(thaiDriverNames)) {
  allThaiMappings.push({ thai, english: engArray[0], type: "driver" });
}
for (const [thai, engArray] of Object.entries(thaiTeamNames)) {
  allThaiMappings.push({ thai, english: engArray[0], type: "team" });
}
for (const [thai, engArray] of Object.entries(thaiCircuitNames)) {
  allThaiMappings.push({ thai, english: engArray[0], type: "circuit" });
}

const thaiFuse = new Fuse(allThaiMappings, {
  keys: ["thai"],
  threshold: 0.4,
  includeScore: true
});

/**
 * Translate Thai search query to English search terms using fuzzy matching.
 */
export function translateThaiQuery(query: string): string {
  const q = query.trim();
  let translated = q;

  const thaiWords = q.match(/[\u0E00-\u0E7F]+/g);
  if (thaiWords) {
    for (const tWord of thaiWords) {
      // Direct dictionary check for exact matches
      const allDirect = { ...thaiDriverNames, ...thaiTeamNames, ...thaiCircuitNames };
      if (allDirect[tWord]) {
        translated = translated.replace(tWord, allDirect[tWord][0]);
        continue;
      }
      
      // Fuzzy check for typos
      const wordRes = thaiFuse.search(tWord);
      if (wordRes.length > 0 && wordRes[0].score! < 0.4) {
        translated = translated.replace(tWord, wordRes[0].item.english);
      }
    }
  }

  // Also replace generic terms
  for (const [thai, english] of Object.entries(thaiGenericTerms)) {
    if (translated.includes(thai)) {
      translated = translated.replace(thai, english);
    }
  }

  return translated;
}

/**
 * Check if a string contains Thai characters.
 */
export function containsThai(text: string): boolean {
  return /[\u0E00-\u0E7F]/.test(text);
}

/**
 * Get Thai autocomplete suggestions based on partial Thai input with fuzzy tolerance.
 */
export function getThaiSuggestions(query: string): ThaiSuggestion[] {
  if (!query.trim() || !containsThai(query)) return [];
  const q = query.trim();
  
  const thaiPartMatch = q.match(/[\u0E00-\u0E7F\s]+/g);
  if (!thaiPartMatch) return [];
  const thaiQuery = thaiPartMatch.join("").trim();

  const results = thaiFuse.search(thaiQuery);
  
  const seen = new Map<string, ThaiSuggestion>();
  for (const s of results) {
    // Ignore overly broad fuzzy matches for suggestions
    if (s.score! > 0.45) continue;
    
    const key = `${s.item.english}-${s.item.type}`;
    if (!seen.has(key)) {
      seen.set(key, s.item);
    }
  }

  return Array.from(seen.values()).slice(0, 8);
}
