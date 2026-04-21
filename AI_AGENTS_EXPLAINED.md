# อธิบายการทำงาน AI-Agents แบบละเอียด (พร้อมโค้ด)

> **Stack:** Python + FastAPI + OpenAI SDK  
> **Port:** 8000  
> **หน้าที่หลัก:** รับ request จาก NestJS Backend → วิเคราะห์ตลาดผ่าน 4 AI Agents → ส่งผลกลับ

---

## โครงสร้างไฟล์

```
ai-agents/
├── main.py                              ← Entry point (FastAPI app)
├── schemas.py                           ← Pydantic models (type definitions)
├── requirements.txt                     ← dependencies
├── agents/
│   ├── __init__.py
│   ├── query_understanding_agent.py     ← Agent 1: วิเคราะห์ query
│   ├── research_agent.py                ← Agent 2: วิจัยตลาด
│   ├── competitor_agent.py              ← Agent 3: วิเคราะห์คู่แข่ง
│   └── summary_agent.py                 ← Agent 4: สรุปผล
├── orchestrators/
│   └── market_orchestrator.py           ← Orchestrator (simplified, ไม่ได้ใช้ใน main)
└── services/
    └── openai_client.py                 ← OpenAI wrapper
```

---

## ขั้นตอนที่ 1 — Schemas / Type Definitions: `schemas.py`

ก่อนจะเข้าใจ agent แต่ละตัว ต้องรู้ก่อนว่าข้อมูลมีหน้าตาอย่างไร

```python
# schemas.py

# ── INPUT ─────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    topic: str = Field(..., min_length=1)    # เช่น "EV Battery"
    region: str = Field(..., min_length=1)   # เช่น "Southeast Asia"
    markets: List[str] = Field(..., min_length=1)  # เช่น ["Thailand", "Vietnam"]

# ── AGENT 1 OUTPUT ────────────────────────────────────────────────────

class QueryOriginalInput(BaseModel):
    topic: str
    region: str
    markets: List[str]

class QueryNormalizedQuery(BaseModel):
    topic: str    # normalize แล้ว เช่น lowercase
    region: str
    markets: List[str]

class QueryAnalysisResult(BaseModel):
    original_input: QueryOriginalInput     # input ดิบจาก user
    normalized_query: QueryNormalizedQuery  # input ที่ normalize แล้ว
    intent: str                            # เช่น "market_exploration"
    focus_areas: List[str]                 # เช่น ["market overview", "risks"]
    keywords: List[str]                    # keyword ที่สกัดจาก topic
    research_brief: str                    # briefing ส่งต่อให้ agent อื่น

# ── AGENT 2 OUTPUT ────────────────────────────────────────────────────

class ResearchResult(BaseModel):
    keyMarkets: List[str]      # ตลาดที่น่าสนใจ
    marketInsights: List[str]  # insight 3 ข้อ

# ── AGENT 3 OUTPUT ────────────────────────────────────────────────────

class CompetitorResult(BaseModel):
    recentDevelopments: List[str]  # พัฒนาการล่าสุดของคู่แข่ง
    externalSignals: List[str]     # สัญญาณภายนอก

# ── AGENT 4 OUTPUT ────────────────────────────────────────────────────

class SummaryResult(BaseModel):
    overallInsight: str        # สรุปภาพรวม
    opportunities: List[str]   # โอกาส 3 ข้อ
    risks: List[str]           # ความเสี่ยง 3 ข้อ

# ── FINAL RESPONSE ────────────────────────────────────────────────────

class AnalyzeResponse(BaseModel):
    topic: str
    region: str
    markets: List[str]
    query_analysis: QueryAnalysisResult  # ผลจาก Agent 1
    keyMarkets: List[str]                # ผลจาก Agent 2
    marketInsights: List[str]            # ผลจาก Agent 2
    recentDevelopments: List[str]        # ผลจาก Agent 3
    externalSignals: List[str]           # ผลจาก Agent 3
    overallInsight: str                  # ผลจาก Agent 4
    opportunities: List[str]             # ผลจาก Agent 4
    risks: List[str]                     # ผลจาก Agent 4
```

---

## ขั้นตอนที่ 2 — OpenAI Service: `services/openai_client.py`

ทุก agent จะเรียกผ่าน wrapper นี้เสมอ ไม่เรียก OpenAI SDK โดยตรง

### โหลด config และสร้าง client

```python
# services/openai_client.py (บรรทัด 1-27)

ROOT_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ROOT_ENV_PATH)  # โหลด .env จาก root ของ project

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL   = os.getenv("OPENAI_MODEL", "gpt-5.2").strip()
USE_OPENAI     = os.getenv("USE_OPENAI", "false").strip().lower() == "true"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("scg-ai-agents")  # ← logger ที่ทุก agent ใช้ร่วมกัน

# สร้าง client เฉพาะถ้ามี API key
_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
```

### `can_use_openai()` — เช็คว่าใช้ OpenAI ได้ไหม

```python
# services/openai_client.py (บรรทัด 26-27)

def can_use_openai() -> bool:
    # ต้องเป็น True ทั้ง 3 เงื่อนไข:
    # 1. USE_OPENAI=true ใน .env
    # 2. มี OPENAI_API_KEY
    # 3. _client ถูกสร้างสำเร็จ
    return USE_OPENAI and bool(OPENAI_API_KEY) and _client is not None
```

**ทุก agent จะเรียก `can_use_openai()` ก่อนเสมอ** ถ้า False → ใช้ fallback logic แทน

### `_strip_json_fence()` — ตัด markdown code fence ออก

```python
# services/openai_client.py (บรรทัด 30-41)

def _strip_json_fence(text: str) -> str:
    cleaned = text.strip()

    # บางครั้ง OpenAI ตอบมาพร้อม ```json หรือ ``` ครอบมา
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]   # ตัด ```json ออก
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]   # ตัด ``` ออก

    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]  # ตัด ``` ปิดท้ายออก

    return cleaned.strip()
```

### `generate_text()` — เรียก OpenAI และรับ text กลับ

```python
# services/openai_client.py (บรรทัด 44-58)

def generate_text(system_prompt: str, user_prompt: str) -> str:
    if not can_use_openai():
        raise RuntimeError("OpenAI is not enabled or API key is missing.")

    # เรียก OpenAI Responses API
    response = _client.responses.create(
        model=OPENAI_MODEL,         # gpt-5.2 หรือค่าจาก .env
        instructions=system_prompt, # บทบาทของ AI (system)
        input=user_prompt,          # คำถาม/ข้อมูล (user)
    )

    output = (response.output_text or "").strip()
    if not output:
        raise RuntimeError("OpenAI returned empty text output.")

    return output
```

### `generate_json()` — เรียก OpenAI และบังคับให้ตอบเป็น JSON

```python
# services/openai_client.py (บรรทัด 61-85)

def generate_json(
    system_prompt: str,
    user_prompt: str,
    json_schema: Dict[str, Any],  # schema ที่บอก OpenAI ว่าต้องตอบโครงสร้างไหน
) -> Dict[str, Any]:
    schema_text = json.dumps(json_schema, ensure_ascii=False, indent=2)

    # ต่อ user_prompt ด้วยคำสั่งให้ตอบ JSON และแนบ schema ไปด้วย
    raw_text = generate_text(
        system_prompt=system_prompt,
        user_prompt=(
            f"{user_prompt}\n\n"
            "Return ONLY valid JSON.\n"
            "Do not include markdown fences.\n"
            "JSON schema:\n"
            f"{schema_text}"
        ),
    )

    # ตัด markdown fence ออก (กรณี OpenAI ใส่มา)
    cleaned = _strip_json_fence(raw_text)

    # parse เป็น dict
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error("Failed to parse OpenAI JSON output: %s", cleaned)
        raise RuntimeError("OpenAI returned invalid JSON.") from exc
```

---

## ขั้นตอนที่ 3 — Entry Point & Orchestration: `main.py`

นี่คือจุดที่รับ HTTP request และเรียก agent ทั้ง 4 ตามลำดับ

### Setup

```python
# main.py (บรรทัด 1-23)

ROOT_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ROOT_ENV_PATH)  # โหลด .env จาก project root

app = FastAPI(title="SCG AI Agents Service")

# สร้าง QueryUnderstandingAgent ครั้งเดียวตอน startup (singleton)
query_understanding_agent = QueryUnderstandingAgent()
```

### Health Check Endpoint

```python
# main.py (บรรทัด 26-34)

@app.get("/health")
def health_check():
    logger.info("[Health] check")
    return {
        "status": "ok",
        "use_openai": USE_OPENAI,       # true/false
        "model": OPENAI_MODEL,          # ชื่อ model
        "has_api_key": bool(OPENAI_API_KEY),  # มี key ไหม
    }
```

### Main Endpoint: `POST /analyze` — ศูนย์กลางทั้งหมด

```python
# main.py (บรรทัด 37-96)

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_market(payload: AnalyzeRequest):
    logger.info(
        "[/analyze] request received | topic=%s | region=%s | markets=%s",
        payload.topic, payload.region, ", ".join(payload.markets),
    )

    # ── Step 1: Validate input ────────────────────────────────────────
    if not payload.topic.strip():
        raise HTTPException(status_code=400, detail="Topic is required.")

    if not payload.region.strip():
        raise HTTPException(status_code=400, detail="Region is required.")

    cleaned_markets = [market.strip() for market in payload.markets if market.strip()]
    if not cleaned_markets:
        raise HTTPException(status_code=400, detail="At least one market is required.")

    # ── Step 2: Normalize payload ─────────────────────────────────────
    # strip whitespace ออกทุก field ก่อนส่งต่อ
    normalized_payload = AnalyzeRequest(
        topic=payload.topic.strip(),
        region=payload.region.strip(),
        markets=cleaned_markets,
    )

    # ── Step 3: Agent 1 — Query Understanding ─────────────────────────
    # วิเคราะห์ intent, keywords, และ normalize query
    query_analysis = query_understanding_agent.analyze(
        normalized_payload.topic,
        normalized_payload.region,
        normalized_payload.markets,
    )
    # ได้: QueryAnalysisResult (intent, keywords, focus_areas, research_brief)

    # ── Step 4: Agent 2 — Research ────────────────────────────────────
    # ได้รับ query_analysis ด้วยเพื่อใช้ context ที่ดีขึ้น
    research = research_agent(normalized_payload, query_analysis)
    # ได้: ResearchResult (keyMarkets, marketInsights)

    # ── Step 5: Agent 3 — Competitor ──────────────────────────────────
    competitor = competitor_agent(normalized_payload, query_analysis)
    # ได้: CompetitorResult (recentDevelopments, externalSignals)

    # ── Step 6: Agent 4 — Summary ─────────────────────────────────────
    # รับผลจากทุก agent มา synthesize
    summary = summary_agent(normalized_payload, research, competitor, query_analysis)
    # ได้: SummaryResult (overallInsight, opportunities, risks)

    logger.info("[/analyze] completed successfully")

    # ── Step 7: Assemble final response ───────────────────────────────
    return AnalyzeResponse(
        topic=normalized_payload.topic,
        region=normalized_payload.region,
        markets=normalized_payload.markets,
        query_analysis=query_analysis,          # จาก Agent 1
        keyMarkets=research.keyMarkets,         # จาก Agent 2
        marketInsights=research.marketInsights, # จาก Agent 2
        recentDevelopments=competitor.recentDevelopments,  # จาก Agent 3
        externalSignals=competitor.externalSignals,        # จาก Agent 3
        overallInsight=summary.overallInsight,  # จาก Agent 4
        opportunities=summary.opportunities,    # จาก Agent 4
        risks=summary.risks,                    # จาก Agent 4
    )
```

---

## ขั้นตอนที่ 4 — Agent 1: `agents/query_understanding_agent.py`

**หน้าที่:** รับ topic/region/markets ดิบ → วิเคราะห์ intent และ normalize → ส่ง brief ให้ agent อื่น

```python
# agents/query_understanding_agent.py

class QueryUnderstandingAgent:
    def analyze(self, topic: str, region: str, markets: List[str]) -> QueryAnalysisResult:

        # ── Clean inputs ──────────────────────────────────────────────
        clean_topic   = (topic or "").strip()
        clean_region  = (region or "").strip()
        clean_markets = [m.strip() for m in (markets or []) if str(m).strip()]

        # ── Path A: ใช้ OpenAI ────────────────────────────────────────
        if can_use_openai():
            try:
                result = generate_json(
                    system_prompt=(
                        "You are a market research query-understanding agent. "
                        "Analyze the user's market exploration request and return structured JSON only."
                    ),
                    user_prompt=(
                        f"Topic: {clean_topic}\n"
                        f"Region: {clean_region}\n"
                        f"Markets: {', '.join(clean_markets)}\n\n"
                        "Infer the likely intent, useful focus areas, normalized values, "
                        "keywords, and a concise research brief for downstream agents."
                    ),
                    json_schema={
                        "type": "object",
                        "properties": {
                            "original_input": {
                                "type": "object",
                                "properties": {
                                    "topic": {"type": "string"},
                                    "region": {"type": "string"},
                                    "markets": {"type": "array", "items": {"type": "string"}},
                                },
                                "required": ["topic", "region", "markets"],
                            },
                            "normalized_query": {
                                "type": "object",
                                "properties": {
                                    "topic": {"type": "string"},
                                    "region": {"type": "string"},
                                    "markets": {"type": "array", "items": {"type": "string"}},
                                },
                                "required": ["topic", "region", "markets"],
                            },
                            "intent":        {"type": "string"},
                            "focus_areas":   {"type": "array", "items": {"type": "string"}},
                            "keywords":      {"type": "array", "items": {"type": "string"}},
                            "research_brief":{"type": "string"},
                        },
                        "required": ["original_input","normalized_query","intent",
                                     "focus_areas","keywords","research_brief"],
                    },
                )
                return QueryAnalysisResult(**result)  # แปลง dict → Pydantic model
            except Exception as exc:
                logger.warning("QueryUnderstandingAgent fallback to local logic: %s", exc)

        # ── Path B: Fallback (ไม่มี OpenAI หรือ error) ───────────────
        keywords = self._extract_keywords(clean_topic)

        return QueryAnalysisResult(
            original_input=QueryOriginalInput(
                topic=clean_topic, region=clean_region, markets=clean_markets,
            ),
            normalized_query=QueryNormalizedQuery(
                topic=clean_topic.lower(),
                region=clean_region.lower(),
                markets=[m.lower() for m in clean_markets],
            ),
            intent="market_exploration",  # hardcoded
            focus_areas=[
                "market overview", "customer needs", "competitor landscape",
                "opportunities", "risks", "go-to-market considerations",
            ],
            keywords=keywords,
            research_brief=self._build_research_brief(clean_topic, clean_region, clean_markets),
        )

    def _extract_keywords(self, topic: str) -> List[str]:
        # ตัดด้วย / และ - แล้วเอาแต่ละคำ lowercase
        # เช่น "EV-Battery/Charging" → ["ev", "battery", "charging"]
        if not topic:
            return []
        raw_parts = topic.replace("/", " ").replace("-", " ").split()
        keywords: List[str] = []
        for part in raw_parts:
            word = part.strip().lower()
            if word and word not in keywords:
                keywords.append(word)
        return keywords[:10]  # เอาแค่ 10 คำแรก

    def _build_research_brief(self, topic: str, region: str, markets: List[str]) -> str:
        markets_text = ", ".join(markets) if markets else "not specified"
        # สร้าง text briefing สำหรับส่งต่อให้ agent อื่น
        return (
            f"Analyze the market potential for '{topic}' "
            f"in the region '{region}' "
            f"with focus on these target markets: {markets_text}. "
            f"Cover market size or demand signals, customer pain points, "
            f"competitors, risks, and business opportunities."
        )
```

---

## ขั้นตอนที่ 5 — Agent 2: `agents/research_agent.py`

**หน้าที่:** วิเคราะห์ตลาด → ระบุ keyMarkets และ marketInsights

```python
# agents/research_agent.py

def research_agent(
    payload: AnalyzeRequest,
    query_analysis: QueryAnalysisResult | None = None,  # รับ output จาก Agent 1
) -> ResearchResult:

    # ── Path A: ใช้ OpenAI ────────────────────────────────────────────
    if can_use_openai():
        try:
            qa = query_analysis.dict() if query_analysis else {}  # แปลงเป็น dict เพื่อส่ง

            result = generate_json(
                system_prompt=(
                    "You are a market research agent. "
                    "Produce structured market insights for a B2B exploration use case. "
                    "Return concise, practical JSON only."
                ),
                user_prompt=(
                    f"Topic: {payload.topic}\n"
                    f"Region: {payload.region}\n"
                    f"Markets: {', '.join(payload.markets)}\n"
                    f"Query analysis: {qa}\n\n"   # ← ใช้ context จาก Agent 1
                    "Return the most relevant target markets and 3 concise market insights."
                ),
                json_schema={
                    "type": "object",
                    "properties": {
                        "keyMarkets":     {"type": "array", "items": {"type": "string"}},
                        "marketInsights": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["keyMarkets", "marketInsights"],
                },
            )
            return ResearchResult(**result)
        except Exception as exc:
            logger.warning("research_agent fallback to local logic: %s", exc)

    # ── Path B: Fallback ───────────────────────────────────────────────
    keywords       = query_analysis.keywords       if query_analysis else []
    research_brief = query_analysis.research_brief if query_analysis else ""

    return ResearchResult(
        keyMarkets=payload.markets,  # ใช้ markets จาก input เลย
        marketInsights=[
            f"Demand for {payload.topic} is being evaluated across "
            f"{', '.join(payload.markets)} in the {payload.region} region.",

            f"Priority research keywords: "
            f"{', '.join(keywords) if keywords else payload.topic}.",

            f"Research brief: "
            f"{research_brief if research_brief else f'Assess market potential for {payload.topic} in {payload.region}.'}",
        ],
    )
```

---

## ขั้นตอนที่ 6 — Agent 3: `agents/competitor_agent.py`

**หน้าที่:** วิเคราะห์คู่แข่งและ external signals → ระบุ recentDevelopments และ externalSignals

```python
# agents/competitor_agent.py

def competitor_agent(
    payload: AnalyzeRequest,
    query_analysis: QueryAnalysisResult | None = None,
) -> CompetitorResult:

    # ── Path A: ใช้ OpenAI ────────────────────────────────────────────
    if can_use_openai():
        try:
            qa = query_analysis.dict() if query_analysis else {}

            result = generate_json(
                system_prompt=(
                    "You are a competitor intelligence agent. "
                    "Return concise structured competitor observations and external signals in JSON only."
                ),
                user_prompt=(
                    f"Topic: {payload.topic}\n"
                    f"Region: {payload.region}\n"
                    f"Markets: {', '.join(payload.markets)}\n"
                    f"Query analysis: {qa}\n\n"
                    "Return 3 recent developments and 3 external signals relevant to competitor tracking."
                ),
                json_schema={
                    "type": "object",
                    "properties": {
                        "recentDevelopments": {"type": "array", "items": {"type": "string"}},
                        "externalSignals":    {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["recentDevelopments", "externalSignals"],
                },
            )
            return CompetitorResult(**result)
        except Exception as exc:
            logger.warning("competitor_agent fallback to local logic: %s", exc)

    # ── Path B: Fallback ───────────────────────────────────────────────
    keywords          = query_analysis.keywords                    if query_analysis else []
    normalized_markets = query_analysis.normalized_query.markets   if query_analysis else []

    return CompetitorResult(
        recentDevelopments=[
            f"Competitor activity around {payload.topic} should be monitored in "
            f"{', '.join(payload.markets)}.",

            f"Regional players in {payload.region} may already be expanding related offerings.",

            f"Normalized market focus for tracking: "
            f"{', '.join(normalized_markets) if normalized_markets else ', '.join(payload.markets)}.",
        ],
        externalSignals=[
            f"Track investment, partnerships, and product launches related to {payload.topic}.",

            f"Watch keywords such as: {', '.join(keywords) if keywords else payload.topic}.",

            f"Monitor policy, construction, infrastructure, and sustainability signals "
            f"across {payload.region}.",
        ],
    )
```

---

## ขั้นตอนที่ 7 — Agent 4: `agents/summary_agent.py`

**หน้าที่:** รับผลจาก Agent 1+2+3 ทั้งหมด → synthesize เป็น executive summary

```python
# agents/summary_agent.py

def summary_agent(
    payload: AnalyzeRequest,
    research: ResearchResult,       # ← output จาก Agent 2
    competitor: CompetitorResult,   # ← output จาก Agent 3
    query_analysis: QueryAnalysisResult | None = None,  # ← output จาก Agent 1
) -> SummaryResult:

    # ── Path A: ใช้ OpenAI ────────────────────────────────────────────
    if can_use_openai():
        try:
            qa = query_analysis.dict() if query_analysis else {}

            result = generate_json(
                system_prompt=(
                    "You are a summary agent for a market exploration system. "
                    "Synthesize the outputs into a concise executive summary. "
                    "Return JSON only."
                ),
                user_prompt=(
                    f"Topic: {payload.topic}\n"
                    f"Region: {payload.region}\n"
                    f"Markets: {', '.join(payload.markets)}\n"
                    f"Query analysis: {qa}\n"
                    f"Research result: {research.dict()}\n"       # ← ส่งผล Agent 2 ให้ AI ด้วย
                    f"Competitor result: {competitor.dict()}\n\n" # ← ส่งผล Agent 3 ให้ AI ด้วย
                    "Return one overall insight, 3 opportunities, and 3 risks."
                ),
                json_schema={
                    "type": "object",
                    "properties": {
                        "overallInsight":  {"type": "string"},
                        "opportunities":   {"type": "array", "items": {"type": "string"}},
                        "risks":           {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["overallInsight", "opportunities", "risks"],
                },
            )
            return SummaryResult(**result)
        except Exception as exc:
            logger.warning("summary_agent fallback to local logic: %s", exc)

    # ── Path B: Fallback ───────────────────────────────────────────────
    focus_areas = query_analysis.focus_areas if query_analysis else []
    intent      = query_analysis.intent      if query_analysis else "market exploration"

    return SummaryResult(
        overallInsight=(
            f"{payload.topic} shows potential across {', '.join(payload.markets)} "
            f"in {payload.region}. "
            f"This analysis is framed under the intent '{intent}'"
            f"{' with focus on ' + ', '.join(focus_areas) if focus_areas else ''}."
        ),
        opportunities=[
            f"Expand into priority markets: {', '.join(research.keyMarkets)}.",
            f"Use market signals to position {payload.topic} around unmet customer needs.",
            "Differentiate against regional competitors through localized go-to-market strategy.",
        ],
        risks=[
            f"Competitive pressure may increase in {payload.region}.",
            "Market demand may vary by country and segment.",
            "External factors such as regulation, pricing, and supply chain shifts may affect growth.",
        ],
    )
```

---

## Orchestrator (สำรอง): `orchestrators/market_orchestrator.py`

> **หมายเหตุ:** ไฟล์นี้มีอยู่แต่ **ไม่ได้ถูกใช้ใน main.py** — `main.py` เรียก agent โดยตรงและมี logic ที่สมบูรณ์กว่า (ส่ง `query_analysis` ให้ agent ด้วย)

```python
# orchestrators/market_orchestrator.py

def run_market_analysis(payload: AnalyzeRequest) -> AnalyzeResponse:
    logger.info(
        "[MarketOrchestrator] start | topic=%s | region=%s | markets=%s",
        payload.topic, payload.region, ", ".join(payload.markets),
    )

    # เรียก agent ตามลำดับ — แต่ไม่ส่ง query_analysis ไปด้วย (simplified)
    research   = research_agent(payload)
    competitor = competitor_agent(payload)
    summary    = summary_agent(payload, research, competitor)

    logger.info("[MarketOrchestrator] assembled final response")

    # ไม่มี query_analysis ใน response เพราะไม่ได้เรียก QueryUnderstandingAgent
    return AnalyzeResponse(
        topic=payload.topic,
        region=payload.region,
        markets=payload.markets,
        keyMarkets=research.keyMarkets,
        marketInsights=research.marketInsights,
        recentDevelopments=competitor.recentDevelopments,
        externalSignals=competitor.externalSignals,
        overallInsight=summary.overallInsight,
        opportunities=summary.opportunities,
        risks=summary.risks,
    )
```

---

## Flow รวม (ภาพใหญ่พร้อมไฟล์)

```
POST /analyze (main.py บรรทัด 37)
  { topic, region, markets }
        │
        ▼
[main.py บรรทัด 46-63]
  validate → normalize → AnalyzeRequest
        │
        ▼
[Agent 1: query_understanding_agent.py]
  QueryUnderstandingAgent.analyze(topic, region, markets)
  │
  ├── can_use_openai() == True?
  │     → generate_json(system_prompt, user_prompt, json_schema)
  │         → generate_text() → _client.responses.create()
  │         → _strip_json_fence() → json.loads()
  │         → QueryAnalysisResult(**result)
  │
  └── Fallback?
        → _extract_keywords() + _build_research_brief()
        → QueryAnalysisResult(hardcoded intent + focus_areas)
        │
        ▼ QueryAnalysisResult
[Agent 2: research_agent.py]
  research_agent(payload, query_analysis)
  │
  ├── OpenAI: generate_json() → ResearchResult
  └── Fallback: template strings → ResearchResult
        │
        ▼ ResearchResult
[Agent 3: competitor_agent.py]
  competitor_agent(payload, query_analysis)
  │
  ├── OpenAI: generate_json() → CompetitorResult
  └── Fallback: template strings → CompetitorResult
        │
        ▼ CompetitorResult
[Agent 4: summary_agent.py]
  summary_agent(payload, research, competitor, query_analysis)
  │
  ├── OpenAI: generate_json() with ALL previous results → SummaryResult
  └── Fallback: template strings → SummaryResult
        │
        ▼ SummaryResult
[main.py บรรทัด 84-96]
  AnalyzeResponse(รวมผลทุก agent)
        │
        ▼
  Return JSON → NestJS Backend → Frontend
```

---

## Environment Variables

| ตัวแปร | Default | ใช้ที่ไหน |
|--------|---------|----------|
| `OPENAI_API_KEY` | `""` | `openai_client.py` บรรทัด 13 — auth token |
| `OPENAI_MODEL` | `"gpt-5.2"` | `openai_client.py` บรรทัด 14 — ชื่อ model |
| `USE_OPENAI` | `"false"` | `openai_client.py` บรรทัด 15 — เปิด/ปิด OpenAI |

> ไฟล์ `.env` อยู่ที่ **root ของ project** (`d:/2026/SCG_Assignment/.env`)  
> ทั้ง `main.py` และ `openai_client.py` ใช้ `load_dotenv(dotenv_path=ROOT_ENV_PATH)` โหลดไฟล์เดียวกัน

---

## Graceful Degradation (Fallback Pattern)

ทุก agent ถูกออกแบบให้ทำงานได้แม้ไม่มี OpenAI:

```
USE_OPENAI=false   →  ทุก agent ใช้ fallback template ทันที
USE_OPENAI=true แต่ error  →  try/except → fallback อัตโนมัติ
USE_OPENAI=true ปกติ  →  ใช้ OpenAI สร้าง insight จริง
```

ระบบจะไม่ crash ในทุกกรณี เพียงแต่ผลลัพธ์จะเป็น template แทน AI-generated content