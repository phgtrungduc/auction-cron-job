# Cấu trúc Project

```
auction-cron-job/
├── src/
│   ├── main.ts                          # Entry point cho service
│   ├── cli.ts                           # Entry point cho CLI commands
│   ├── app.module.ts                    # Root module
│   │
│   ├── common/                          # ⭐ NEW: Shared utilities
│   │   ├── logger/
│   │   │   ├── app.logger.ts            # Custom logger (VN timezone, colors)
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── date.util.ts             # Date/time formatting
│   │   │   ├── currency.util.ts         # Currency/number formatting
│   │   │   ├── string.util.ts           # String manipulation
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── database/
│   │   ├── database.module.ts           # TypeORM configuration
│   │   └── entities/
│   │       └── auction-notice.entity.ts # Entity map bảng auction_notices
│   │
│   └── correction/
│       ├── correction.module.ts         # Module chính cho correction logic
│       ├── correction-handler.interface.ts # Interface cho handlers
│       ├── notice.scanner.ts            # Quét batch từ DB
│       ├── notice.applier.ts            # Ghi thay đổi vào DB (stub)
│       ├── correction.runner.ts         # Orchestrator
│       ├── correction.scheduler.ts      # Cron jobs
│       └── handlers/
│           └── README.md                # Hướng dẫn thêm handler
│
├── .env.example                         # Template môi trường
├── package.json                         # Dependencies & scripts
├── tsconfig.json                        # TypeScript config
├── nest-cli.json                        # NestJS CLI config
├── Dockerfile                           # Docker image
├── docker-compose.yml                   # Docker orchestration
├── auction-cron-job.service            # Systemd service
│
├── README.md                            # Tài liệu chính (thiết kế)
├── QUICKSTART.md                        # Hướng dẫn chạy nhanh
├── COMMON_UTILS.md                      # ⭐ NEW: Hướng dẫn dùng common utilities
├── STRUCTURE.md                         # File này
├── ARCHITECTURE_COMPARISON.md           # So sánh cấu trúc
└── DEPLOYMENT.md                        # Hướng dẫn deploy production
```

## Thành phần chính

### 1. Common Layer (`src/common/`) ⭐ **NEW**

**Logger (`logger/`):**
- **`app.logger.ts`**: Custom logger với VN timezone, color coding, structured format
- Thay thế NestJS Logger mặc định
- Format: `[dd/MM/yyyy HH:mm:ss] [LEVEL] [Context] message`

**Utilities (`utils/`):**
- **`date.util.ts`**: Format date/time (VN timezone), duration, start/end of day
- **`currency.util.ts`**: Format tiền VND (1.000.000 đ), parse currency, compact format
- **`string.util.ts`**: Truncate, capitalize, slugify, mask sensitive data

**Sử dụng:**
```typescript
import { createLogger } from '@/common/logger';
import { formatDate, formatVND, formatNumber } from '@/common/utils';

const logger = createLogger('MyClass');
logger.log(`Price: ${formatVND(1234567)}`); // '1.234.567 đ'
logger.log(`Date: ${formatDate(new Date(), 'full')}`); // '09/07/2026 09:30:45'
```

📚 **Chi tiết:** Xem [COMMON_UTILS.md](COMMON_UTILS.md)

---

### 2. Database Layer (`src/database/`)

### 2. Database Layer (`src/database/`)

- **`auction-notice.entity.ts`**: TypeORM entity map đầy đủ các cột của `auction_notices`
- Schema do Auction-Project (.NET) quản lý, `synchronize: false`

### 3. Correction Core (`src/correction/`)

**Interface & Contract:**
- `correction-handler.interface.ts`: Định nghĩa `CorrectionHandler` interface

**Scanner:**
- `notice.scanner.ts`: 
  - Đọc `auction_notices` theo batch (cursor `id`)
  - Filter `deleted_at IS NULL`
  - Hỗ trợ quét full hoặc 1 notice cụ thể

**Runner:**
- `correction.runner.ts`:
  - Orchestrator chính
  - Quét batch → gọi handlers → gửi patch tới applier
  - Bỏ qua notice protected (`deleted_at`, `status_self_reported`)

**Applier:**
- `notice.applier.ts`:
  - Stub hiện tại, chỉ log
  - Sẽ implement transaction UPDATE + INSERT log khi có handler

**Scheduler:**
- `correction.scheduler.ts`:
  - Cron mỗi 15 phút
  - Cron daily 03:00
  - Overlap guard

### 4. CLI (`src/cli.ts`)

Commands:
- `npm run correction:scan` - Quét full/partial
- `npm run correction:run -- --handler=xxx` - Chạy handler cụ thể

### 5. Entry Points

- **Service mode** (`main.ts`): scheduler bật, chạy nền
- **CLI mode** (`cli.ts`): chạy tay, không scheduler

---

## Luồng Chạy Hệ Thống

### 1. Khởi động Service (Service Mode)

```
┌─────────────────────────────────────────────────────────┐
│  npm run start:dev / start:prod                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│  main.ts                                                │
│  - NestFactory.create(AppModule)                        │
│  - Load ConfigModule (đọc .env hoặc env vars)           │
│  - Khởi tạo TypeORM connection (DATABASE_URL)           │
│  - Mount ScheduleModule                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│  app.module.ts                                          │
│  - ConfigModule.forRoot() → đọc config                  │
│  - DatabaseModule → kết nối PostgreSQL                  │
│  - CorrectionModule → đăng ký handlers & scheduler      │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│  correction.scheduler.ts (nếu CRON_ENABLED=true)        │
│                                                         │
│  ⏰ Job 1: @Cron('*/15 * * * *')                        │
│     → handlePeriodicScan() mỗi 15 phút                  │
│                                                         │
│  ⏰ Job 2: @Cron('0 3 * * *')                           │
│     → handleDailyScan() lúc 03:00                       │
│                                                         │
│  [Service chạy nền, chờ cron trigger...]               │
└─────────────────────────────────────────────────────────┘
```

---

### 2. Luồng Chạy CLI (Manual Mode)

```
┌─────────────────────────────────────────────────────────┐
│  npm run correction:scan -- --notice-id=123             │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│  cli.ts                                                 │
│  - Parse arguments (command, --notice-id, --handler)    │
│  - Create ApplicationContext (không start HTTP server)  │
│  - Get CorrectionRunner từ DI container                │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│  Gọi runner.runAll() với options                        │
│  - mode: 'dry-run' hoặc 'apply'                        │
│  - scanOptions: { noticeId, batchSize, ... }            │
│  - handlers: ['fix-xxx'] (nếu --handler)                │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
            [Vào luồng Runner →]
```

---

### 3. Luồng Core: CorrectionRunner.runAll()

```
┌─────────────────────────────────────────────────────────┐
│  CorrectionRunner.runAll(options)                       │
│                                                         │
│  1. Đọc config:                                         │
│     - mode = options.mode ?? CORRECTION_MODE            │
│     - handlers = getActiveHandlers(options.handlers)    │
│                                                         │
│  2. Log bắt đầu:                                        │
│     "Starting correction run: mode=..., handlers=..."   │
└────────────────────┬────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│  NoticeScanner.scanBatches(scanOptions)                 │
│                                                         │
│  Vòng lặp: for await (batch of scanner) {              │
│    ↓                                                    │
└────┬────────────────────────────────────────────────────┘
     │
     │  [Yield batch notices, mỗi batch ~500 bản ghi]
     │
     v
┌─────────────────────────────────────────────────────────┐
│  processBatch(notices[], handlers[], mode)              │
│                                                         │
│  For each notice in batch:                              │
│    ├─ isProtected(notice)?                             │
│    │   ├─ YES (deleted_at/self_reported) → skip        │
│    │   └─ NO → tiếp tục                                │
│    │                                                    │
│    └─ For each handler:                                │
│        ├─ handler.correct(notice) → patch | null       │
│        ├─ If patch có data:                            │
│        │   └─ applier.apply(id, patch, meta, mode)     │
│        └─ Catch error → log, tiếp tục handler tiếp     │
└────────────────────┬────────────────────────────────────┘
                     │
                     │  [Xử lý hết tất cả batches]
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│  Return ScanResult                                      │
│  {                                                      │
│    scanned: 1234,                                       │
│    batches: 3,                                          │
│    durationMs: 5670                                     │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
```

---

### 4. Chi Tiết: NoticeScanner.scanBatches()

```
┌─────────────────────────────────────────────────────────┐
│  scanBatches(options)                                   │
│                                                         │
│  IF options.noticeId:                                   │
│    └─ Quét 1 notice duy nhất → yield [notice]          │
│                                                         │
│  ELSE:                                                  │
│    ├─ lastId = options.startFromId ?? 0                │
│    │                                                    │
│    └─ WHILE true:                                       │
│        ├─ Query DB:                                     │
│        │   SELECT * FROM auction_notices                │
│        │   WHERE id > :lastId                           │
│        │     AND deleted_at IS NULL                     │
│        │   ORDER BY id ASC                              │
│        │   LIMIT :batchSize                             │
│        │                                                 │
│        ├─ IF batch.length === 0: BREAK                  │
│        │                                                 │
│        ├─ yield batch                                   │
│        │                                                 │
│        └─ lastId = batch[last].id                       │
│           [Tiếp tục batch tiếp theo...]                 │
└─────────────────────────────────────────────────────────┘
```

**Cursor pagination** (dùng `id > lastId`) → hiệu quả với bảng lớn, không bị OFFSET chậm.

---

### 5. Chi Tiết: Handler.correct(notice)

```
┌─────────────────────────────────────────────────────────┐
│  Handler: fix-status (ví dụ logic bạn viết)            │
│                                                         │
│  async correct(notice: AuctionNotice) {                 │
│    // Logic của bạn                                     │
│    const now = new Date();                              │
│                                                         │
│    IF notice.auctionDatetime < now                      │
│       AND notice.status === 'UPCOMING':                 │
│                                                         │
│      RETURN { status: 'COMPLETED' }  // Patch           │
│                                                         │
│    RETURN null  // Không sửa                            │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
                     │
                     │ [Return patch hoặc null]
                     │
                     v
┌─────────────────────────────────────────────────────────┐
│  IF patch === null → skip                               │
│  IF patch !== null → gửi tới Applier                    │
└─────────────────────────────────────────────────────────┘
```

---

### 6. Chi Tiết: NoticeApplier.apply()

```
┌─────────────────────────────────────────────────────────┐
│  apply(noticeId, patch, meta, mode)                     │
│                                                         │
│  IF mode === 'dry-run':                                 │
│    └─ LOG: "[DRY-RUN] Would update notice 123..."       │
│        → Không ghi DB, chỉ log                          │
│        → RETURN                                         │
│                                                         │
│  IF mode === 'apply':                                   │
│    └─ BEGIN TRANSACTION                                 │
│        ├─ UPDATE auction_notices                        │
│        │   SET ...patch,                                │
│        │       updated_at = NOW(),                      │
│        │       updated_by = 'cron:handler-name'         │
│        │   WHERE id = :noticeId                         │
│        │                                                 │
│        ├─ INSERT INTO data_correction_log               │
│        │   (notice_id, handler, field_name,             │
│        │    old_value, new_value, ...)                  │
│        │                                                 │
│        └─ COMMIT                                        │
│                                                         │
│    └─ LOG: "[APPLY] Updated notice 123"                │
└─────────────────────────────────────────────────────────┘
```

**Ghi chú:** Bảng `data_correction_log` cần tạo qua migration .NET trước khi dùng `apply` mode.

---

### 7. Luồng Error Handling

```
┌─────────────────────────────────────────────────────────┐
│  Error ở handler.correct(notice)                        │
│    ↓                                                    │
│  CATCH trong processBatch()                             │
│    ├─ LOG error: "Handler X failed for notice Y"       │
│    └─ TIẾP TỤC handler tiếp theo                       │
│        (không crash toàn bộ batch)                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Error ở DB connection (scanner)                        │
│    ↓                                                    │
│  THROW lên runner                                       │
│    ↓                                                    │
│  CATCH trong scheduler/CLI                              │
│    ├─ LOG error stack                                   │
│    └─ Scheduler: isRunning = false (unlock cho lần sau)│
│    └─ CLI: process.exit(1)                              │
└─────────────────────────────────────────────────────────┘
```

---

### 8. Timeline Ví Dụ (Service Mode)

```
00:00:00  [Bootstrap] Service starting...
00:00:01  [DatabaseModule] Connected to PostgreSQL
00:00:01  [CorrectionScheduler] Cron enabled: true
00:00:01  [Bootstrap] Service running on port 3000

... [Chờ đến 00:15:00] ...

00:15:00  [CronTrigger] notice-scan job triggered
00:15:00  [CorrectionScheduler] Starting periodic scan
00:15:01  [NoticeScanner] Starting batch scan: batchSize=500
00:15:01  [NoticeScanner] Batch 1: 500 notices (id 1 - 500)
00:15:02  [CorrectionRunner] No handlers registered - skipping
00:15:02  [NoticeScanner] Batch 2: 500 notices (id 501 - 1000)
00:15:03  [NoticeScanner] Batch 3: 234 notices (id 1001 - 1234)
00:15:03  [NoticeScanner] Scan completed: 3 batches
00:15:03  [CorrectionRunner] scanned=1234, batches=3, duration=2500ms
00:15:03  [CorrectionScheduler] Periodic scan completed

... [Chờ đến 00:30:00 cho lần scan tiếp] ...
```

---

### 9. Timeline Ví Dụ (CLI Mode với Handler)

```
$ npm run correction:run -- --handler=fix-status --dry-run

00:00:00  [CLI] Starting handler: fix-status, mode=dry-run
00:00:01  [NoticeScanner] Starting batch scan: batchSize=500
00:00:01  [NoticeScanner] Batch 1: 500 notices
00:00:02  [FixStatusHandler] Processing notice 45...
00:00:02  [NoticeApplier] [DRY-RUN] Would update notice 45 
           via fix-status: status
00:00:02  [NoticeApplier] Patch: { status: 'COMPLETED' }
00:00:03  [FixStatusHandler] Processing notice 123...
00:00:03  [NoticeApplier] [DRY-RUN] Would update notice 123
00:00:05  [NoticeScanner] Batch 2: 234 notices
00:00:06  [CorrectionRunner] scanned=734, batches=2, duration=6000ms
00:00:06  [CLI] Run result: {"scanned":734,"batches":2,...}
```

---

### 10. Sơ Đồ Tổng Quan

```
┌──────────────────────────────────────────────────────────────┐
│                     AUCTION CRON JOB                         │
│                                                              │
│  ┌────────────┐          ┌────────────┐                     │
│  │ Service    │          │    CLI     │                     │
│  │ Mode       │          │   Mode     │                     │
│  │ (cron auto)│          │ (manual)   │                     │
│  └─────┬──────┘          └─────┬──────┘                     │
│        │                       │                            │
│        └───────────┬───────────┘                            │
│                    ↓                                         │
│         ┌──────────────────┐                                │
│         │ CorrectionRunner │                                │
│         └────────┬─────────┘                                │
│                  ↓                                           │
│         ┌──────────────────┐                                │
│         │  NoticeScanner   │ ← Batch read từ PostgreSQL     │
│         └────────┬─────────┘   (cursor pagination)          │
│                  ↓                                           │
│         ┌──────────────────┐                                │
│         │   Handlers[]     │ ← Logic của bạn                │
│         │  (0 hoặc nhiều)  │   correct() → patch | null     │
│         └────────┬─────────┘                                │
│                  ↓                                           │
│         ┌──────────────────┐                                │
│         │  NoticeApplier   │ ← UPDATE + audit log           │
│         │  (dry-run/apply) │   (khi có handler)             │
│         └────────┬─────────┘                                │
│                  ↓                                           │
│            PostgreSQL                                        │
│       `auction_notices` table                                │
│       `data_correction_log` table (sau này)                  │
└──────────────────────────────────────────────────────────────┘
```

## Mở rộng

Thêm handler mới:

1. Tạo file `src/correction/handlers/fix-xxx.handler.ts`
2. Implement `CorrectionHandler`
3. Đăng ký trong `correction.module.ts`
4. Test với CLI dry-run
5. Apply khi OK

## Ghi chú

- **Giai đoạn hiện tại**: chưa có handler → chỉ quét + log
- **Không ghi DB** cho đến khi có logic sửa cụ thể
- **Mode mặc định**: `dry-run` để an toàn
- **Logger**: Dùng `createLogger()` từ `@/common/logger` thay vì NestJS Logger
- **Utils**: Import từ `@/common/utils` cho date, currency, string formatting

## Tài liệu liên quan

- [COMMON_UTILS.md](COMMON_UTILS.md) - Hướng dẫn sử dụng logger & utilities
- [ARCHITECTURE_COMPARISON.md](ARCHITECTURE_COMPARISON.md) - So sánh cấu trúc với standard pattern
- [README.md](README.md) - Tài liệu chính
- [QUICKSTART.md](QUICKSTART.md) - Hướng dẫn chạy nhanh
