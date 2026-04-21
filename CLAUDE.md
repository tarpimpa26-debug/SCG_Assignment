# SCG AI Market Exploration — Project Context

## Project Summary
Multi-Agent Market Analysis Platform ที่ user กรอก topic/region/market แล้วได้รับการวิเคราะห์ตลาดจาก AI 4 ตัวทำงานเป็น pipeline

---

## Stack & Ports

| Service | Stack | Port |
|---------|-------|------|
| Frontend | Next.js 15 + React 19 + TypeScript + CSS Modules | 3000 |
| Backend | NestJS + TypeScript + TypeORM + SQLite | 3002 |
| AI Agents | Python + FastAPI + OpenAI SDK | 8000 |

---

## Project Structure

```
SCG_Assignment/
├── frontend/          Next.js app (src/app/page.tsx คือทั้งหมด)
├── backend/           NestJS app (src/market/ คือ business logic หลัก)
├── ai-agents/         Python FastAPI + 4 AI Agents
├── docker-compose.yml
├── .env               env ทุกตัวอยู่ที่นี่ไฟล์เดียว
│
├── BACKEND_EXPLAINED.md      อธิบาย backend พร้อมโค้ด
├── AI_AGENTS_EXPLAINED.md    อธิบาย AI agents พร้อมโค้ด
├── FRONTEND_EXPLAINED.md     อธิบาย frontend พร้อมโค้ด
└── SYSTEM_OVERVIEW_EXPLAINED.md  ภาพรวมทั้งระบบ + full flow
```

---

## Key Files

### Backend
- `backend/src/main.ts` — entry point, CORS, ValidationPipe
- `backend/src/app.module.ts` — ConfigModule, TypeORM (SQLite), MarketModule
- `backend/src/market/market.controller.ts` — POST /market/analyze, GET /market/history
- `backend/src/market/market.service.ts` — เรียก Python AI, บันทึก SQLite
- `backend/src/analysis/analysis-history.entity.ts` — TypeORM entity
- `backend/src/dto/market-research.dto.ts` — input validation

### AI Agents
- `ai-agents/main.py` — FastAPI entry point, POST /analyze orchestration
- `ai-agents/schemas.py` — Pydantic models ทั้งหมด
- `ai-agents/services/openai_client.py` — OpenAI wrapper (generate_text, generate_json)
- `ai-agents/agents/query_understanding_agent.py` — Agent 1
- `ai-agents/agents/research_agent.py` — Agent 2
- `ai-agents/agents/competitor_agent.py` — Agent 3
- `ai-agents/agents/summary_agent.py` — Agent 4

### Frontend
- `frontend/src/app/page.tsx` — ทั้งหมดอยู่ที่นี่ (single component)
- `frontend/src/app/layout.tsx` — HTML wrapper, Geist fonts

---

## Environment Variables

| Service | Variable | Default |
|---------|----------|---------|
| Frontend | `NEXT_PUBLIC_API_URL` | `http://localhost:3002` |
| Backend | `FRONTEND_URL` | `http://localhost:3000` |
| Backend | `PORT` | `3002` |
| Backend | `PYTHON_AI_URL` | `http://ai-agents:8000` |
| Backend | `APP_VERSION` | `1.0.0` |
| AI Agents | `OPENAI_API_KEY` | `""` |
| AI Agents | `OPENAI_MODEL` | `"gpt-5.2"` |
| AI Agents | `USE_OPENAI` | `"false"` |

---

## Request Flow (สรุปสั้น)

```
Frontend (POST /market/analyze)
  → NestJS ValidationPipe (MarketResearchDto)
  → MarketService.analyzeMarket()
  → fetch(PYTHON_AI_URL/analyze)
  → Python: Agent1 → Agent2 → Agent3 → Agent4
  → AnalyzeResponse
  → SQLite save (analysis_history)
  → return to Frontend
```

---

## Changes Made

- `backend/src/analysis/analysis-history.entity.ts` — เพิ่ม `!` ทุก property (TypeScript strict mode fix)
- `backend/tsconfig.json` — เพิ่ม `"ignoreDeprecations": "6.0"` (suppress baseUrl deprecation warning)

---

## AI Agent Pattern

ทุก agent มี 2 path:
1. **OpenAI path** — ถ้า `USE_OPENAI=true` และมี API key → เรียก `generate_json()` → OpenAI API
2. **Fallback path** — ถ้าปิดหรือ error → ใช้ template strings (ระบบยังทำงานได้ ผลเป็น generic text)