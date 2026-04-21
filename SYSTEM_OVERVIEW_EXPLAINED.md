# ภาพรวมทั้งระบบ — SCG AI Market Exploration

> อธิบายการทำงานทั้งหมดตั้งแต่ Frontend → Backend → AI Agents → Database  
> อ่านไฟล์นี้เพื่อเข้าใจว่าทุก component เชื่อมกันอย่างไร

---

## สรุปสั้น

ระบบนี้คือ **Multi-Agent Market Analysis Platform** ที่ user กรอก topic/region/market แล้วได้รับการวิเคราะห์ตลาดจาก AI 4 ตัวทำงานเป็น pipeline ต่อกัน

---

## Architecture รวม

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                               │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Next.js Frontend (port 3000)                                │   │
│  │  src/app/page.tsx — HomePage component                       │   │
│  │                                                              │   │
│  │  [Sidebar]              [Content Area]                       │   │
│  │  • Topic input          • 7 Result Cards                     │   │
│  │  • Region dropdown      • Empty State                        │   │
│  │  • Market chips                                              │   │
│  │  • History list                                              │   │
│  └──────────────────┬────────────────────────────────────────── ┘   │
└─────────────────────┼───────────────────────────────────────────────┘
                      │ HTTP (JSON)
                      │ POST /market/analyze
                      │ GET  /market/history
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│  NestJS Backend (port 3002)                                         │
│                                                                     │
│  main.ts → AppModule → MarketModule                                 │
│                                                                     │
│  MarketController                                                   │
│  ├── POST /market/analyze → MarketService.analyzeMarket()           │
│  └── GET  /market/history → MarketService.getHistory()              │
│                                                                     │
│  MarketService                                                      │
│  ├── fetch(PYTHON_AI_URL/analyze) → AI Agents                       │
│  └── analysisHistoryRepository.save() → SQLite                     │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  SQLite Database (analysis_history.sqlite)                   │   │
│  │  Table: analysis_history                                     │   │
│  │  Columns: id, topic, region, markets, keyMarkets,            │   │
│  │           marketInsights, recentDevelopments, externalSignals│   │
│  │           overallInsight, opportunities, risks, createdAt    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────────┘
                      │ HTTP (JSON)
                      │ POST /analyze
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Python AI Service (port 8000)                                      │
│                                                                     │
│  FastAPI — main.py                                                  │
│  POST /analyze                                                      │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Agent 1: QueryUnderstandingAgent                            │    │
│  │ → วิเคราะห์ intent, สกัด keywords, สร้าง research_brief    │    │
│  └────────────────────────┬────────────────────────────────────┘    │
│                           │ QueryAnalysisResult                     │
│              ┌────────────┴────────────┐                            │
│              ▼                         ▼                            │
│  ┌───────────────────┐   ┌──────────────────────────┐              │
│  │ Agent 2:          │   │ Agent 3:                  │              │
│  │ ResearchAgent     │   │ CompetitorAgent            │              │
│  │ → keyMarkets      │   │ → recentDevelopments       │              │
│  │ → marketInsights  │   │ → externalSignals          │              │
│  └─────────┬─────────┘   └────────────┬─────────────┘              │
│            │ ResearchResult            │ CompetitorResult            │
│            └────────────┬─────────────┘                             │
│                         ▼                                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Agent 4: SummaryAgent                                        │   │
│  │ รับผลจาก Agent 1+2+3 → synthesize                           │   │
│  │ → overallInsight, opportunities, risks                       │   │
│  └────────────────────────────────────────────────────────────── ┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ OpenAI API (external)                                        │   │
│  │ ใช้เฉพาะเมื่อ USE_OPENAI=true                               │   │
│  │ ถ้าปิดหรือ error → Fallback template strings                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Full Request-Response Flow

### สถานการณ์: User กดปุ่ม "Analyze Market"

```
╔══════════════════════════════════════════════════════════════════════╗
║ STEP 1 — Frontend Validation (page.tsx บรรทัด 121-137)              ║
╚══════════════════════════════════════════════════════════════════════╝

handleAnalyze() {
  if (!trimmedTopic) → setError("Please enter a market topic.") → STOP
  if (!region)       → setError("Please select a region.")      → STOP
  if (markets.length === 0) → setError("Please choose at least one market.") → STOP
  setLoading(true)
}

        ↓

╔══════════════════════════════════════════════════════════════════════╗
║ STEP 2 — Frontend ส่ง HTTP Request (page.tsx บรรทัด 143-151)        ║
╚══════════════════════════════════════════════════════════════════════╝

POST http://localhost:3002/market/analyze
Content-Type: application/json
Body: {
  "topic":   "EV Battery",
  "region":  "Southeast Asia",
  "markets": ["Thailand", "Vietnam", "Indonesia"]
}

        ↓

╔══════════════════════════════════════════════════════════════════════╗
║ STEP 3 — NestJS ValidationPipe (main.ts บรรทัด 19-25)               ║
╚══════════════════════════════════════════════════════════════════════╝

ValidationPipe ตรวจสอบ MarketResearchDto:
  ✓ topic: string, not empty
  ✓ region: string, not empty
  ✓ markets: string[], min 1 item
ถ้าไม่ผ่าน → 400 Bad Request ทันที (ไม่ถึง Controller)

        ↓

╔══════════════════════════════════════════════════════════════════════╗
║ STEP 4 — NestJS Controller (market.controller.ts บรรทัด 9-12)       ║
╚══════════════════════════════════════════════════════════════════════╝

MarketController.analyze(input: MarketResearchDto) {
  return this.marketService.analyzeMarket(input)
}
// ไม่มี logic — แค่โยนต่อให้ Service

        ↓

╔══════════════════════════════════════════════════════════════════════╗
║ STEP 5 — NestJS Service เรียก Python (market.service.ts บรรทัด 34)  ║
╚══════════════════════════════════════════════════════════════════════╝

MarketService.analyzeMarket(input) {
  const pythonAiUrl = process.env.PYTHON_AI_URL || "http://ai-agents:8000"

  fetch(`${pythonAiUrl}/analyze`, {
    method: "POST",
    body: JSON.stringify({ topic, region, markets })
  })
}

        ↓

╔══════════════════════════════════════════════════════════════════════╗
║ STEP 6 — Python FastAPI รับ Request (main.py บรรทัด 37)             ║
╚══════════════════════════════════════════════════════════════════════╝

analyze_market(payload: AnalyzeRequest) {
  1. validate: topic/region/markets ไม่ว่าง
  2. normalize: strip whitespace
}

        ↓

╔══════════════════════════════════════════════════════════════════════╗
║ STEP 7 — Agent 1: Query Understanding (query_understanding_agent.py) ║
╚══════════════════════════════════════════════════════════════════════╝

QueryUnderstandingAgent.analyze("EV Battery", "Southeast Asia", [...]) {

  ถ้า USE_OPENAI=true:
    generate_json(
      system: "You are a market research query-understanding agent...",
      user:   "Topic: EV Battery\nRegion: Southeast Asia\n...",
      schema: { original_input, normalized_query, intent, focus_areas, keywords, research_brief }
    )
    → OpenAI API call
    → รับ JSON กลับ
    → QueryAnalysisResult

  ถ้า USE_OPENAI=false (fallback):
    keywords = _extract_keywords("EV Battery") → ["ev", "battery"]
    research_brief = "Analyze the market potential for 'EV Battery' in..."
    → QueryAnalysisResult(
        intent = "market_exploration",
        focus_areas = ["market overview", "customer needs", ...]
      )
}

OUTPUT: QueryAnalysisResult {
  original_input: { topic: "EV Battery", region: "Southeast Asia", markets: [...] }
  normalized_query: { topic: "ev battery", region: "southeast asia", ... }
  intent: "market_exploration"
  focus_areas: ["market overview", "customer needs", ...]
  keywords: ["ev", "battery"]
  research_brief: "Analyze the market potential for 'EV Battery'..."
}

        ↓

╔══════════════════════════════════════════════════════════════════════╗
║ STEP 8 — Agent 2: Research (research_agent.py)                      ║
╚══════════════════════════════════════════════════════════════════════╝

research_agent(payload, query_analysis) {

  ถ้า USE_OPENAI=true:
    generate_json(
      system: "You are a market research agent...",
      user:   "Topic: EV Battery\n...Query analysis: {qa}\n...",
      schema: { keyMarkets, marketInsights }
    )
    → ResearchResult

  Fallback:
    keyMarkets = payload.markets (["Thailand", "Vietnam", "Indonesia"])
    marketInsights = [template strings ใช้ keywords + research_brief]
}

OUTPUT: ResearchResult {
  keyMarkets:    ["Thailand", "Vietnam", "Indonesia"]
  marketInsights: ["Demand for EV Battery is being evaluated...", ...]
}

        ↓ (พร้อมกัน conceptually แต่ run sequentially ใน code)

╔══════════════════════════════════════════════════════════════════════╗
║ STEP 9 — Agent 3: Competitor (competitor_agent.py)                  ║
╚══════════════════════════════════════════════════════════════════════╝

competitor_agent(payload, query_analysis) {

  ถ้า USE_OPENAI=true:
    generate_json(
      system: "You are a competitor intelligence agent...",
      user:   "...Return 3 recent developments and 3 external signals...",
      schema: { recentDevelopments, externalSignals }
    )
    → CompetitorResult

  Fallback:
    recentDevelopments = [template strings เกี่ยวกับ competitor activity]
    externalSignals    = [template strings เกี่ยวกับ keywords/policy monitoring]
}

OUTPUT: CompetitorResult {
  recentDevelopments: ["Competitor activity around EV Battery...", ...]
  externalSignals:    ["Track investment, partnerships...", ...]
}

        ↓

╔══════════════════════════════════════════════════════════════════════╗
║ STEP 10 — Agent 4: Summary (summary_agent.py)                       ║
╚══════════════════════════════════════════════════════════════════════╝

summary_agent(payload, research, competitor, query_analysis) {

  ถ้า USE_OPENAI=true:
    generate_json(
      system: "You are a summary agent...",
      user:   "...Research result: {research.dict()}\nCompetitor result: {competitor.dict()}...",
      schema: { overallInsight, opportunities, risks }
    )
    → SummaryResult
    // Agent นี้ได้ผลจากทุก agent มา synthesize พร้อมกัน!

  Fallback:
    overallInsight = template string รวม topic + markets + intent
    opportunities  = [template strings เกี่ยวกับ expansion + positioning]
    risks          = [template strings เกี่ยวกับ competition + regulation]
}

OUTPUT: SummaryResult {
  overallInsight: "EV Battery shows potential across Thailand, Vietnam... "
  opportunities:  ["Expand into priority markets: Thailand...", ...]
  risks:          ["Competitive pressure may increase in Southeast Asia.", ...]
}

        ↓

╔══════════════════════════════════════════════════════════════════════╗
║ STEP 11 — Python รวมผลและส่งกลับ (main.py บรรทัด 84-96)            ║
╚══════════════════════════════════════════════════════════════════════╝

return AnalyzeResponse(
  topic   = "EV Battery",
  region  = "Southeast Asia",
  markets = ["Thailand", "Vietnam", "Indonesia"],
  query_analysis     = <QueryAnalysisResult>,   // จาก Agent 1
  keyMarkets         = research.keyMarkets,      // จาก Agent 2
  marketInsights     = research.marketInsights,  // จาก Agent 2
  recentDevelopments = competitor.recentDevelopments, // จาก Agent 3
  externalSignals    = competitor.externalSignals,    // จาก Agent 3
  overallInsight     = summary.overallInsight,   // จาก Agent 4
  opportunities      = summary.opportunities,    // จาก Agent 4
  risks              = summary.risks,            // จาก Agent 4
)

        ↓

╔══════════════════════════════════════════════════════════════════════╗
║ STEP 12 — NestJS รับผลและบันทึก DB (market.service.ts บรรทัด 62-93) ║
╚══════════════════════════════════════════════════════════════════════╝

const data = await response.json()  // AnalyzeResult

// บันทึกลง SQLite
await analysisHistoryRepository.save({
  topic, region, markets,
  keyMarkets, marketInsights,
  recentDevelopments, externalSignals,
  overallInsight, opportunities, risks
  // createdAt → TypeORM ใส่ให้อัตโนมัติ
})

return data  // ส่งต่อกลับ Frontend

        ↓

╔══════════════════════════════════════════════════════════════════════╗
║ STEP 13 — Frontend แสดงผล (page.tsx บรรทัด 157-159)                 ║
╚══════════════════════════════════════════════════════════════════════╝

const data: AnalyzeResponse = await response.json()
setResult(data)       // ← trigger re-render แสดง 7 result cards
await loadHistory()   // ← refresh ประวัติใน sidebar
setLoading(false)     // ← ปิด spinner
```

---

## สถานการณ์ที่ 2: User กด History Item

```
User click history item ใน sidebar
        │
        ▼
handleSelectHistory(item: HistoryItem)
  → แปลง HistoryItem → AnalyzeResponse (handle markets string/array)
  → setResult(mappedResult)     ← แสดงผลเก่าใน content area
  → setTopic / setRegion / setMarkets ← sync form ให้ตรงกับ history
  // ไม่มี API call ใดๆ ทั้งสิ้น — ใช้ข้อมูลที่โหลดมาแล้วใน state
```

---

## สถานการณ์ที่ 3: โหลดหน้าครั้งแรก

```
Browser เปิด http://localhost:3000
        │
        ▼
Next.js โหลด layout.tsx → page.tsx
        │
        ▼
React render HomePage component
  → state ทั้งหมดเริ่มต้น (empty)
        │
        ▼
useEffect([], []) รัน loadHistory()
  GET http://localhost:3002/market/history
        │
        ▼
NestJS MarketService.getHistory()
  SELECT * FROM analysis_history ORDER BY createdAt DESC
        │
        ▼
Frontend setHistory(data)
  → แสดงประวัติใน sidebar
        │
        ▼
Content area แสดง empty state
"Your analysis result will appear here"
```

---

## Data Transformation Map

ข้อมูลเปลี่ยนรูปแบบหลายครั้งตลอด pipeline:

```
[Frontend Input]
{ topic: "EV Battery", region: "Southeast Asia", markets: ["Thailand", "Vietnam"] }

    ↓ POST body (JSON string)

[NestJS MarketResearchDto]
{ topic: string, region: string, markets: string[] }    ← validated by class-validator

    ↓ JSON.stringify → fetch body

[Python AnalyzeRequest (Pydantic)]
{ topic: str, region: str, markets: List[str] }         ← validated by Pydantic

    ↓ passed to agents

[QueryAnalysisResult (Pydantic)]
{ original_input, normalized_query, intent, focus_areas, keywords, research_brief }

[ResearchResult (Pydantic)]
{ keyMarkets: List[str], marketInsights: List[str] }

[CompetitorResult (Pydantic)]
{ recentDevelopments: List[str], externalSignals: List[str] }

[SummaryResult (Pydantic)]
{ overallInsight: str, opportunities: List[str], risks: List[str] }

    ↓ assembled into

[AnalyzeResponse (Pydantic → JSON)]
{ topic, region, markets, query_analysis, keyMarkets, marketInsights,
  recentDevelopments, externalSignals, overallInsight, opportunities, risks }

    ↓ response.json() in NestJS

[NestJS AnalyzeResult (TypeScript type)]
{ same fields }

    ↓ analysisHistoryRepository.save()

[SQLite analysis_history table]
{ id, topic, region, markets(JSON), keyMarkets(JSON), ..., createdAt }

    ↓ GET /market/history → response.json()

[Frontend HistoryItem]
{ id, topic, region, markets: string[]|string, ..., createdAt: string }

    ↓ handleSelectHistory()

[Frontend AnalyzeResponse]
{ same as result type — markets normalized to string[] }
```

---

## Port Map & Network

```
Docker / Local:

Frontend   → localhost:3000
Backend    → localhost:3002
AI Agents  → localhost:8000 (local) / ai-agents:8000 (docker)
OpenAI API → https://api.openai.com (external)

Communication:
Browser ←→ Frontend  : Same origin (Next.js SSR + Client)
Frontend ←→ Backend  : HTTP (NEXT_PUBLIC_API_URL)
Backend  ←→ AI Agent : HTTP (PYTHON_AI_URL)
AI Agent ←→ OpenAI   : HTTPS (OPENAI_API_KEY)
Backend  ←→ SQLite   : File I/O (analysis_history.sqlite)
```

---

## Environment Variables ทั้งระบบ

| Service | ตัวแปร | Default | หน้าที่ |
|---------|--------|---------|--------|
| Frontend | `NEXT_PUBLIC_API_URL` | `http://localhost:3002` | URL ของ NestJS Backend |
| Backend | `FRONTEND_URL` | `http://localhost:3000` | CORS origin whitelist |
| Backend | `PORT` | `3002` | port ของ server |
| Backend | `PYTHON_AI_URL` | `http://ai-agents:8000` | URL ของ Python AI service |
| Backend | `APP_VERSION` | `1.0.0` | version ใน health check |
| AI Agents | `OPENAI_API_KEY` | `""` | auth token สำหรับ OpenAI |
| AI Agents | `OPENAI_MODEL` | `"gpt-5.2"` | model ที่ใช้ |
| AI Agents | `USE_OPENAI` | `"false"` | เปิด/ปิด OpenAI |

> ทุก env อยู่ในไฟล์ `.env` เดียวที่ root ของ project (`d:/2026/SCG_Assignment/.env`)

---

## Error Handling ทั้งระบบ

| จุดที่ error | สาเหตุ | ผลที่เกิด |
|-------------|--------|----------|
| Frontend validation | topic/region/markets ว่าง | แสดง error message ใต้ form |
| NestJS ValidationPipe | body ไม่ตรง DTO | 400 Bad Request → Frontend catch → setError() |
| NestJS → Python timeout/error | Python service ล่ม | 502 Bad Gateway → Frontend catch → setError() |
| Python validation | topic/region ว่าง | 400 → NestJS → Frontend |
| OpenAI API error | key ผิด/quota หมด | fallback template → ผลยังมา แต่เป็น generic text |
| SQLite write error | disk เต็ม/permission | 500 Internal Server Error → Frontend setError() |
| History load error | backend ล่มขณะโหลด | silent fail (console.error เท่านั้น ไม่แสดง user) |

---

## ไฟล์อธิบายแต่ละส่วน

| ไฟล์ | อธิบายส่วนไหน |
|------|--------------|
| [BACKEND_EXPLAINED.md](BACKEND_EXPLAINED.md) | NestJS Backend ทั้งหมด พร้อมโค้ด |
| [AI_AGENTS_EXPLAINED.md](AI_AGENTS_EXPLAINED.md) | Python AI Agents ทั้งหมด พร้อมโค้ด |
| [FRONTEND_EXPLAINED.md](FRONTEND_EXPLAINED.md) | Next.js Frontend ทั้งหมด พร้อมโค้ด |
| [SYSTEM_OVERVIEW_EXPLAINED.md](SYSTEM_OVERVIEW_EXPLAINED.md) | ไฟล์นี้ — ภาพรวมทั้งระบบ |