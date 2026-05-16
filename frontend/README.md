# F1 Search

F1 Search เป็นเว็บค้นหาและถามตอบข้อมูลเกี่ยวกับ Formula 1 เช่น นักแข่ง ทีม สนาม ตารางแข่ง ผลการแข่งขัน และข่าวที่เกี่ยวข้อง ระบบรองรับทั้งภาษาอังกฤษและภาษาไทย พร้อม AI Overview แบบ RAG ที่แสดงแหล่งข้อมูลและ relevance score

## Features

- ค้นหาข้อมูล F1 จากชื่อ driver, team, circuit, standings และ race results
- รองรับ fuzzy search ด้วย Fuse.js เช่นพิมพ์ `verstapen` แล้วยังเจอ `Max Verstappen`
- รองรับ query ภาษาไทยและ query ผสมไทย-อังกฤษ เช่น `สนามถัดไป`, `ใครนำตารางคะแนน`, `Max ล่าสุด`
- แสดง AI Overview จาก retrieved sources
- แสดง Sources พร้อม relevance score เป็นเปอร์เซ็นต์
- Highlight keyword ที่ match กับ query
- มี Backend endpoint สำหรับเรียก LLM ผ่าน `POST /api/ask`
- Cache ข้อมูล F1 API ด้วย memory cache และ localStorage เพื่อลดการโหลดซ้ำ

## Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- TanStack React Query
- Fuse.js
- OpenAI Responses API สำหรับ LLM answer

## System Flow

```text
User -> Query -> Frontend -> F1 API + Local Data
-> Retrieval -> Ranking -> Result List + AI Overview
-> Backend /api/ask -> LLM Answer
```

ระบบใช้แนวคิด RAG หรือ Retrieval-Augmented Generation โดยดึง sources ที่เกี่ยวข้องกับคำถามมาก่อน จากนั้นจึงส่ง context ที่คัดเลือกแล้วไปให้ LLM สรุปคำตอบ

## Search and Ranking

ระบบจัดอันดับ sources ด้วยหลายคะแนนรวมกัน:

- Semantic similarity จาก local embedding
- Fuzzy score จาก Fuse.js
- Source type เช่น race, driver, team, standing
- Freshness หรือความสดของข้อมูลจากวันที่แข่งขัน
- Exact keyword match

คะแนนรวมจะถูกแสดงเป็น relevance score ในหน้า Sources เช่น `83%` หมายถึง source นั้นเกี่ยวข้องกับ query มากกว่ารายการที่คะแนนต่ำกว่า ไม่ได้หมายความว่าข้อมูลถูกต้อง 83%

## Fuse.js

Fuse.js ถูกใช้สำหรับ fuzzy search หรือการค้นหาที่ยืดหยุ่น ไม่จำเป็นต้องพิมพ์คำให้ตรง 100%

ตัวอย่าง:

```text
verstapen -> Max Verstappen
ferari -> Ferrari
lando -> Lando Norris
```

ในโปรเจ็คนี้ Fuse.js ใช้หลัก ๆ 2 จุด:

- หน้า Home สำหรับ autocomplete suggestion
- RAG retrieval/ranking เพื่อเพิ่ม fuzzy score ให้ sources ที่ข้อความใกล้เคียงกับ query

## Backend API

Endpoint หลัก:

```text
POST /api/ask
```

Request body:

```json
{
  "query": "Lando Norris",
  "sources": [
    {
      "title": "Lando Norris",
      "kind": "driver",
      "body": "Lando Norris is an F1 driver..."
    }
  ]
}
```

Backend จะรวม sources เป็น retrieved context แล้วส่งไปที่ OpenAI Responses API โดยกำหนดให้ LLM ตอบจาก context ที่ให้มาเท่านั้น

## Environment Variables

ถ้าต้องการใช้ LLM answer จริง ให้ตั้งค่า environment บน server:

```bash
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=gpt-5.2
```

ถ้าไม่ได้ตั้งค่า API key ระบบยังใช้งาน local AI Overview / local RAG summary ได้ และปุ่ม Search with AI จะแสดง fallback message

## Getting Started

ติดตั้ง dependencies:

```bash
npm install
```

รัน development server:

```bash
npm run dev
```

เปิดเว็บ:

```text
http://localhost:8080/
```

หรือถ้าระบบเลือก port อื่น ให้ดู URL จาก terminal ของ Vite

## Scripts

```bash
npm run dev      # start development server
npm run build    # production build
npm run preview  # preview production build
npm test         # run unit tests
npm run lint     # run eslint
```

## Demo Queries

Query ปกติ:

```text
Max Verstappen
McLaren
Lando Norris
```

Query เขียนผิด:

```text
verstapen
ferari
```

Query พิมพ์ไม่ครบ:

```text
lando
mclaren driver
```

Query แบบ semantic:

```text
who is leading the championship
who has the most points
next race venue
```

Query ภาษาไทย:

```text
สนามถัดไป
ใครนำตารางคะแนน
วันนี้แข่งที่ไหน
```

Query ผสมไทย-อังกฤษ:

```text
Max ล่าสุด
McLaren นักแข่ง
```

## Important Files

- `src/pages/Home.tsx` หน้าแรกและ search input
- `src/pages/SearchResults.tsx` หน้า result list และการดึงข้อมูล F1
- `src/components/AskF1Assistant.tsx` AI Overview, Sources, relevance score และปุ่ม Search with AI
- `src/data/search-data.ts` local search data และ Fuse.js autocomplete
- `src/data/rag.ts` retrieval, local embedding, ranking และ local RAG answer
- `src/data/f1-api.ts` ดึงข้อมูลจาก Jolpica F1 API
- `src/data/f1-cache.ts` cache สำหรับ API response
- `api/ask.ts` backend endpoint สำหรับ LLM answer
- `vite.config.ts` dev middleware สำหรับ `/api/ask` ตอนรัน local

## Testing

รัน test:

```bash
npm test
```

รัน build:

```bash
npm run build
```

สถานะล่าสุด:

- Unit tests ผ่าน 57 tests
- Production build ผ่าน
- Browser smoke test ผ่าน route หลัก เช่น `/`, `/search`, `/drivers`, `/teams`, `/calendar`, `/results`, `/driver/:driverId`

## Limitations

- ข้อมูลสดบางส่วนต้องพึ่ง external API ถ้า API ล่มหรือ network ถูกบล็อก ข้อมูลบางหน้าอาจแสดง fallback
- Local embedding ยังไม่แม่นเท่า embedding model จริง
- LLM answer ต้องใช้ `OPENAI_API_KEY`
- ยังไม่ได้ใช้ Vector DB ภายนอก เช่น Pinecone หรือ Supabase Vector

## Future Improvements

- ใช้ OpenAI Embeddings หรือ embedding model จริง
- เพิ่ม Vector DB เช่น Pinecone หรือ Supabase Vector
- ปรับ ranking ด้วย click feedback หรือ user behavior
- เพิ่มคำอธิบายว่า relevance score ได้คะแนนจากปัจจัยใด
- ปรับ UI/UX ให้แสดงข้อมูล source และ retrieval ได้ละเอียดขึ้น
