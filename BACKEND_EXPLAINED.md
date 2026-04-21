# อธิบายการทำงาน Backend แบบละเอียด (พร้อมโค้ด)

> **Stack:** NestJS + TypeScript + SQLite (TypeORM)  
> **Port:** 3002  
> **หน้าที่หลัก:** รับ request จาก Frontend → ส่งต่อ Python AI Service → เก็บผลลง SQLite → ส่งกลับ Frontend

---

## ขั้นตอนที่ 1 — จุดเริ่มต้น: `src/main.ts`

ทุกอย่างเริ่มที่นี่ไฟล์เดียว NestJS จะเรียก `bootstrap()` ตอน server start

```typescript
// src/main.ts

async function bootstrap() {
  // 1. สร้าง NestJS app จาก AppModule (โหลดทุก module)
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 2. ดึงค่าจาก .env
  const frontendUrl =
    configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  const port = configService.get<number>('PORT') || 3002;

  // 3. เปิด CORS — อนุญาตเฉพาะ origin จาก FRONTEND_URL เท่านั้น
  //    credentials: true = อนุญาตส่ง cookie ข้ามโดเมนได้
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // 4. ผูก ValidationPipe ระดับ Global — ตรวจสอบ body ทุก request ก่อนเข้า Controller
  //    whitelist: true            → ตัด field ที่ไม่อยู่ใน DTO ออกเงียบๆ
  //    forbidNonWhitelisted: true → ถ้ามี field แปลกปลอม → throw 400 ทันที
  //    transform: true            → แปลง type อัตโนมัติ (เช่น "3" → 3)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 5. เปิด server
  await app.listen(port);
  console.log(`Backend is running on http://localhost:${port}`);
  console.log(`CORS enabled for ${frontendUrl}`);
}

bootstrap(); // ← เรียก function นี้ตอนไฟล์ถูก run
```

**Flow:** `bootstrap()` → โหลด `AppModule` → เปิด port 3002

---

## ขั้นตอนที่ 2 — Root Module: `src/app.module.ts`

หลังจาก `NestFactory.create(AppModule)` ถูกเรียก NestJS จะอ่านไฟล์นี้เพื่อรู้ว่าต้อง import อะไรบ้าง

```typescript
// src/app.module.ts

@Module({
  imports: [
    // 1. ConfigModule — โหลด .env ทั่วทั้ง app (isGlobal: true = ไม่ต้อง import ซ้ำในทุก module)
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2. TypeOrmModule — เชื่อม SQLite database
    //    database: 'analysis_history.sqlite' → ไฟล์ db อยู่ที่ root ของ project
    //    synchronize: true → TypeORM จะ auto-create table ให้ตาม entity (ใช้ได้ใน dev)
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'analysis_history.sqlite',
      entities: [AnalysisHistory], // ← บอกว่ามี table นี้อยู่
      synchronize: true,
    }),

    // 3. MarketModule — module หลักที่มี business logic ทั้งหมด
    MarketModule,
  ],
})
export class AppModule {}
```

**สิ่งที่เกิดขึ้น:** NestJS โหลด ConfigModule (env), เชื่อม SQLite, แล้วโหลด MarketModule

---

## ขั้นตอนที่ 3 — Root Controller: `src/app.controller.ts`

Route พื้นฐาน 2 เส้น ไม่มี business logic

```typescript
// src/app.controller.ts

@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  // GET / → ตอบ plain text บอกว่า server ทำงานอยู่
  @Get()
  getHello(): string {
    return 'Backend is running';
  }

  // GET /api/health → ตอบ JSON สำหรับ health check (Docker, load balancer ใช้ ping route นี้)
  @Get('api/health')
  getHealth() {
    return {
      status: 'ok',
      service: 'backend',
      version: this.configService.get<string>('APP_VERSION') || '1.0.0',
      timestamp: new Date().toISOString(), // เวลาปัจจุบัน ISO format
    };
  }
}
```

**ตัวอย่าง response** `GET /api/health`:
```json
{
  "status": "ok",
  "service": "backend",
  "version": "1.0.0",
  "timestamp": "2026-04-21T10:00:00.000Z"
}
```

---

## ขั้นตอนที่ 4 — Market Module: `src/market/market.module.ts`

Module ที่รวม Controller + Service + ให้ Service เข้าถึง Database ได้

```typescript
// src/market/market.module.ts

@Module({
  imports: [
    // บอก TypeORM ว่า module นี้จะใช้ AnalysisHistory repository
    // ทำให้ inject Repository<AnalysisHistory> ใน Service ได้
    TypeOrmModule.forFeature([AnalysisHistory]),
  ],
  controllers: [MarketController], // ← รับ HTTP request
  providers: [MarketService],      // ← handle business logic
})
export class MarketModule {}
```

---

## ขั้นตอนที่ 5 — DTO Validation: `src/dto/market-research.dto.ts`

ก่อน request จะเข้าถึง Controller ได้ NestJS จะ validate body ผ่าน class นี้ก่อนเสมอ

```typescript
// src/dto/market-research.dto.ts

export class MarketResearchDto {
  @IsString()      // ต้องเป็น string
  @IsNotEmpty()    // ห้ามว่าง ("" ไม่ได้)
  topic: string;   // เช่น "EV Battery"

  @IsString()
  @IsNotEmpty()
  region: string;  // เช่น "Southeast Asia"

  @IsArray()                       // ต้องเป็น array
  @ArrayMinSize(1)                 // มีอย่างน้อย 1 ตัว
  @IsString({ each: true })        // แต่ละตัวต้องเป็น string
  @IsNotEmpty({ each: true })      // แต่ละตัวห้ามว่าง
  markets: string[];               // เช่น ["Thailand", "Vietnam", "Indonesia"]
}
```

**ถ้าส่งข้อมูลผิด** เช่น `markets: []` หรือ `topic: ""` → ValidationPipe จะตอบ **400 Bad Request** ทันที ไม่ถึง Controller เลย:
```json
{
  "statusCode": 400,
  "message": ["markets must contain at least 1 elements"],
  "error": "Bad Request"
}
```

---

## ขั้นตอนที่ 6 — Controller: `src/market/market.controller.ts`

รับ HTTP request แล้วส่งต่อให้ Service เท่านั้น ไม่มี logic อื่น

```typescript
// src/market/market.controller.ts

@Controller('market') // ← prefix ทุก route ในนี้ด้วย /market
export class MarketController {
  constructor(private readonly marketService: MarketService) {} // ← inject Service

  // POST /market/analyze
  // @Body() input: MarketResearchDto → NestJS ดึง body และ validate ผ่าน DTO ก่อน
  @Post('analyze')
  async analyze(@Body() input: MarketResearchDto) {
    return this.marketService.analyzeMarket(input); // ← โยนไปให้ Service จัดการ
  }

  // GET /market/history
  @Get('history')
  async getHistory() {
    return this.marketService.getHistory(); // ← โยนไปให้ Service จัดการ
  }
}
```

---

## ขั้นตอนที่ 7 — Service (หัวใจหลัก): `src/market/market.service.ts`

### Type Definition ของ response จาก Python

```typescript
// src/market/market.service.ts (บรรทัด 12-23)

type AnalyzeResult = {
  topic: string;
  region: string;
  markets: string[];
  keyMarkets: string[];         // ตลาดหลักที่ AI วิเคราะห์เจอ
  marketInsights: string[];     // insight จาก ResearchAgent
  recentDevelopments: string[]; // พัฒนาการล่าสุด จาก CompetitorAgent
  externalSignals: string[];    // สัญญาณภายนอก จาก CompetitorAgent
  overallInsight: string;       // สรุปภาพรวม จาก SummaryAgent
  opportunities: string[];      // โอกาส จาก SummaryAgent
  risks: string[];              // ความเสี่ยง จาก SummaryAgent
};
```

### ประกาศ Service และ inject Repository

```typescript
// src/market/market.service.ts (บรรทัด 26-32)

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name); // ← logger สำหรับ debug

  constructor(
    @InjectRepository(AnalysisHistory)
    private readonly analysisHistoryRepository: Repository<AnalysisHistory>, // ← inject TypeORM repository
  ) {}
```

### Method 1: `analyzeMarket()` — flow หลัก

```typescript
// src/market/market.service.ts (บรรทัด 34-109)

async analyzeMarket(input: MarketResearchDto) {
  // 1. ดึง URL ของ Python AI Service จาก environment variable
  //    ถ้าไม่มี → ใช้ http://ai-agents:8000 (ชื่อ docker service)
  const pythonAiUrl = process.env.PYTHON_AI_URL || 'http://ai-agents:8000';

  this.logger.log(
    `[analyzeMarket] start | topic=${input.topic} | region=${input.region} | markets=${input.markets.join(', ')}`,
  );

  try {
    this.logger.log(
      `[analyzeMarket] calling Python AI service -> ${pythonAiUrl}/analyze`,
    );

    // 2. ส่ง POST request ไปหา Python FastAPI Service
    const response = await fetch(`${pythonAiUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: input.topic,     // "EV Battery"
        region: input.region,   // "Southeast Asia"
        markets: input.markets, // ["Thailand", "Vietnam"]
      }),
    });

    this.logger.log(
      `[analyzeMarket] Python AI responded | status=${response.status}`,
    );

    // 3. ถ้า Python ตอบ error (4xx, 5xx) → throw BadGatewayException (502)
    if (!response.ok) {
      const errorText = await response.text();

      this.logger.error(
        `[analyzeMarket] Python AI service error | status=${response.status} | body=${errorText}`,
      );

      throw new BadGatewayException(
        `Python AI service error: ${response.status} ${errorText}`,
      );
    }

    // 4. แปลง response เป็น AnalyzeResult object
    const data = (await response.json()) as AnalyzeResult;

    // 5. บันทึกผลลัพธ์ลง SQLite ผ่าน TypeORM
    await this.analysisHistoryRepository.save({
      topic: data.topic,
      region: data.region,
      markets: data.markets,
      keyMarkets: data.keyMarkets,
      marketInsights: data.marketInsights,
      recentDevelopments: data.recentDevelopments,
      externalSignals: data.externalSignals,
      overallInsight: data.overallInsight,
      opportunities: data.opportunities,
      risks: data.risks,
    });

    this.logger.log(
      `[analyzeMarket] success and saved to DB | topic=${data.topic}`,
    );

    // 6. ส่ง data กลับไปที่ Controller → Frontend
    return data;

  } catch (error) {
    // ถ้า error เป็น BadGatewayException ที่เราโยนเอง → re-throw ไปตรงๆ
    if (error instanceof BadGatewayException) {
      throw error;
    }

    // error อื่นๆ (network error, db error) → throw 500
    const message = error instanceof Error ? error.message : 'Unknown error';

    this.logger.error(
      `[analyzeMarket] failed | url=${pythonAiUrl} | error=${message}`,
    );

    throw new InternalServerErrorException(
      `Failed to analyze market or save result to database`,
    );
  }
}
```

### Method 2: `getHistory()` — ดึงประวัติ

```typescript
// src/market/market.service.ts (บรรทัด 111-119)

async getHistory() {
  this.logger.log('[getHistory] fetching analysis history from DB');

  // query ทุก record จาก analysis_history table
  // order: createdAt DESC = ใหม่สุดขึ้นก่อน
  return this.analysisHistoryRepository.find({
    order: {
      createdAt: 'DESC',
    },
  });
}
```

---

## ขั้นตอนที่ 8 — Database Entity: `src/analysis/analysis-history.entity.ts`

TypeORM ใช้ class นี้ map กับ table `analysis_history` ใน SQLite

```typescript
// src/analysis/analysis-history.entity.ts

@Entity('analysis_history') // ← ชื่อ table ใน SQLite
export class AnalysisHistory {
  @PrimaryGeneratedColumn()
  id: number;           // auto-increment primary key

  @Column('text')
  topic: string;        // เก็บเป็น TEXT

  @Column('text')
  region: string;

  @Column('simple-json')
  markets: string[];    // เก็บเป็น JSON string ใน SQLite เช่น '["Thailand","Vietnam"]'
                        // TypeORM จะ JSON.stringify() ตอนบันทึก และ JSON.parse() ตอนอ่านให้อัตโนมัติ

  @Column('simple-json')
  keyMarkets: string[];

  @Column('simple-json')
  marketInsights: string[];

  @Column('simple-json')
  recentDevelopments: string[];

  @Column('simple-json')
  externalSignals: string[];

  @Column('text')
  overallInsight: string;

  @Column('simple-json')
  opportunities: string[];

  @Column('simple-json')
  risks: string[];

  @CreateDateColumn()
  createdAt: Date; // ← TypeORM ใส่ค่าให้อัตโนมัติตอน INSERT ไม่ต้องส่งมาเอง
}
```

---

## สรุป Flow รวม (พร้อมไฟล์และบรรทัด)

```
[Frontend]
POST /market/analyze
Body: { topic, region, markets }
        │
        ▼
[ValidationPipe — main.ts บรรทัด 19-25]
ตรวจสอบ body ผ่าน MarketResearchDto
ถ้าผิด → 400 Bad Request ทันที ไม่เข้า Controller
        │
        ▼ ผ่าน
[MarketController.analyze() — market.controller.ts บรรทัด 9-12]
  return this.marketService.analyzeMarket(input)
        │
        ▼
[MarketService.analyzeMarket() — market.service.ts บรรทัด 34]
  const pythonAiUrl = process.env.PYTHON_AI_URL || 'http://ai-agents:8000'
        │
        ▼
  fetch(`${pythonAiUrl}/analyze`, { method: 'POST', body: JSON.stringify({...}) })
        │
        ▼
[Python AI Service — ai-agents/ directory]
  ResearchAgent + CompetitorAgent + SummaryAgent ทำงาน
        │
        ▼ ส่ง AnalyzeResult กลับ
[MarketService — market.service.ts บรรทัด 76-87]
  analysisHistoryRepository.save({ topic, region, markets, keyMarkets, ... })
        │
        ├─── บันทึก ──→ SQLite (analysis_history.sqlite)
        │
        └─── return data
        │
        ▼
[MarketController] return data
        │
        ▼
[Frontend] ได้รับผลวิเคราะห์

──────────────────────────────────────────────────

[Frontend]
GET /market/history
        │
        ▼
[MarketController.getHistory() — market.controller.ts บรรทัด 14-17]
  return this.marketService.getHistory()
        │
        ▼
[MarketService.getHistory() — market.service.ts บรรทัด 111-119]
  analysisHistoryRepository.find({ order: { createdAt: 'DESC' } })
        │
        ▼
[SQLite] query ทุก record เรียงใหม่สุดก่อน
        │
        ▼
[Frontend] ได้รับ AnalysisHistory[]
```

---

## Environment Variables ที่ใช้

| ตัวแปร | Default | ใช้ที่ไหน |
|--------|---------|----------|
| `FRONTEND_URL` | `http://localhost:3000` | `main.ts` บรรทัด 10-11 (CORS) |
| `PORT` | `3002` | `main.ts` บรรทัด 12 |
| `PYTHON_AI_URL` | `http://ai-agents:8000` | `market.service.ts` บรรทัด 35 |
| `APP_VERSION` | `1.0.0` | `app.controller.ts` บรรทัด 18 |

---

## Error Responses

| สถานการณ์ | HTTP Status | โค้ดที่โยน error |
|-----------|------------|----------------|
| body ไม่ผ่าน DTO | 400 Bad Request | ValidationPipe อัตโนมัติ |
| Python AI ตอบ error | 502 Bad Gateway | `market.service.ts` บรรทัด 69-71 |
| Network / DB error | 500 Internal Server Error | `market.service.ts` บรรทัด 105-107 |