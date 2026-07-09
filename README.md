# Auction Cron Job — Data Correction Service

Service NestJS chạy nền, quét bảng `auction_notices` trong PostgreSQL theo lịch định kỳ.  
**Giai đoạn hiện tại (thiết kế):** chỉ quét và ghi log thống kê — **chưa cập nhật DB**. Logic sửa dữ liệu sẽ bổ sung sau qua các `CorrectionHandler`.

Tài liệu này dùng để **review / verify** trước khi triển khai code.

---

## Vị trí trong hệ thống

```
auction-crawler (Python)     →  crawl nguồn ngoài
        ↓ Kafka
Auction-Project (.NET API)   →  ingest vào PostgreSQL (`auction_notices`, …)
        ↓
auction-cron-job (NestJS)    →  quét & sửa dữ liệu hậu kỳ (service này)
```

| Thành phần | Trách nhiệm |
|------------|-------------|
| `auction-crawler` | Thu thập dữ liệu thô từ nguồn (DGTS, …) |
| `Auction-Project` | API, ingest crawl, nghiệp vụ người dùng |
| **`auction-cron-job`** | Bảo trì / chuẩn hóa dữ liệu `auction_notices` theo logic tùy chỉnh |

---

## Kiến trúc (dự kiến)

```
┌──────────────────────────────────────────────────────────────┐
│  auction-cron-job                                            │
│                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐ │
│  │ Scheduler   │───►│ NoticeScanner │───►│ CorrectionRunner│ │
│  │ (@nestjs/   │    │ (batch read)  │    │ (gọi handlers)  │ │
│  │  schedule)  │    └──────────────┘    └────────┬────────┘ │
│  └─────────────┘                                   │         │
│  ┌─────────────┐                                   ▼         │
│  │ CLI         │──────────────────────────► [Handlers]      │
│  │ (chạy tay)  │         (trống — thêm sau)       │         │
│  └─────────────┘                                   ▼         │
│                                          ┌─────────────────┐ │
│                                          │ NoticeApplier   │ │
│                                          │ (UPDATE + log)  │ │
│                                          └────────┬────────┘ │
└──────────────────────────────────────────────────┼─────────┘
                                                   ▼
                                          PostgreSQL
                                    `auction_notices`
                                    `data_correction_log` (sau)
```

### Luồng xử lý một lần chạy

1. Scheduler (hoặc CLI) kích hoạt `CorrectionRunner`.
2. `NoticeScanner` đọc `auction_notices` theo batch (cursor `id`), bỏ qua bản ghi đã soft-delete.
3. Với mỗi batch, runner gọi lần lượt các `CorrectionHandler` đã đăng ký.
4. **Hiện tại:** không có handler → chỉ log số bản ghi đã quét.
5. **Sau này:** handler trả về patch → `NoticeApplier` ghi `UPDATE` + `data_correction_log`.

---

## Lịch chạy (tạm thời — có thể điều chỉnh sau khi verify)

Tất cả múi giờ: **Asia/Ho_Chi_Minh (UTC+7)**.

| Job | Cron expression | Tần suất | Mô tả |
|-----|-----------------|----------|--------|
| `notice-scan` | `*/15 * * * *` | Mỗi **15 phút** | Quét toàn bộ `auction_notices` (batch), chạy tất cả handler đã bật |
| `notice-scan-daily` | `0 3 * * *` | **03:00** mỗi ngày | Quét full một lần (backfill / đối soát); cùng runner, flag `fullScan=true` |

### Ghi chú vận hành

- **Không chồng lấn:** nếu lần chạy trước chưa xong, lần kích hoạt mới bị bỏ qua (`maxInstances: 1`).
- **Batch size mặc định:** `500` bản ghi / lần đọc, cursor theo `id ASC`.
- **Filter mặc định khi quét:**
  ```sql
  WHERE deleted_at IS NULL
    AND id > :lastId
  ORDER BY id
  LIMIT :batchSize
  ```

### Biến môi trường điều khiển lịch (dự kiến)

| Biến | Mặc định | Mô tả |
|------|----------|--------|
| `CRON_ENABLED` | `true` | Bật/tắt toàn bộ scheduler |
| `NOTICE_SCAN_CRON` | `*/15 * * * *` | Cron job quét định kỳ |
| `NOTICE_SCAN_DAILY_CRON` | `0 3 * * *` | Cron quét daily |
| `SCAN_BATCH_SIZE` | `500` | Số bản ghi mỗi batch |
| `CORRECTION_MODE` | `dry-run` | `dry-run` = chỉ log; `apply` = ghi DB (khi đã có handler) |
| `TZ` | `Asia/Ho_Chi_Minh` | Timezone cho cron |

---

## Bảng dữ liệu: `auction_notices`

Map từ entity `AuctionNotice` trong `Auction-Project` — service đọc (và sau này ghi) trực tiếp PostgreSQL, **không** qua HTTP API.

| Cột DB | Kiểu (tóm tắt) | Ghi chú |
|--------|----------------|---------|
| `id` | bigint PK | Cursor batch scan |
| `source_id` | varchar(50) | Nguồn crawl, vd `dgts_moj` |
| `source_notice_id` | varchar(100) | ID gốc tại nguồn |
| `title`, `description` | text | |
| `auction_org_id`, `auction_org_name`, `auction_org_address` | | |
| `asset_owner_name`, `asset_owner_address` | | |
| `doc_sale_start`, `doc_sale_end` | timestamptz | |
| `viewing_start`, `viewing_end` | timestamptz | |
| `auction_datetime`, `publish_date` | timestamptz | Index `(status, auction_datetime)` |
| `status` | varchar(50) | `UPCOMING`, `ONGOING`, `COMPLETED`, `CANCELLED` |
| `status_self_reported` | boolean | Handler sau này nên **bỏ qua** nếu `true` |
| `auction_method`, `auction_formality`, … | | |
| `created_at`, `updated_at`, `deleted_at` | timestamptz | Soft delete: `deleted_at IS NULL` |

Unique: `(source_id, source_notice_id)`.

---

## Giai đoạn hiện tại vs sau này

### Hiện tại (scope verify)

- [x] Thiết kế scheduler + batch scan `auction_notices`
- [x] Định nghĩa lịch chạy tạm thời (bảng trên)
- [ ] Triển khai code NestJS
- [ ] Kết nối PostgreSQL (read-only lúc đầu)
- [ ] Log mỗi lần chạy: `scanned`, `batches`, `duration_ms`, `handler=none`

**Không làm ở giai đoạn này:**

- Không `UPDATE` / `INSERT` bất kỳ bảng nào
- Không handler sửa dữ liệu cụ thể
- Không migration `data_correction_log` (đến khi có handler + mode `apply`)

### Sau này (bạn bổ sung logic)

1. Tạo file handler trong `src/correction/handlers/`, ví dụ `fix-xxx.handler.ts`.
2. Implement interface:

   ```typescript
   interface CorrectionHandler {
     readonly name: string;
     correct(notice: AuctionNoticeRow): Promise<Partial<AuctionNoticeRow> | null>;
   }
   ```

3. Đăng ký handler trong module.
4. Chạy dry-run → review log → chuyển `CORRECTION_MODE=apply`.
5. (Khuyến nghị) Thêm bảng `data_correction_log` qua migration .NET.

---

## CLI dự kiến (chạy tay / debug)

```bash
# Quét dry-run (mặc định) — không ghi DB
npm run correction:scan

# Quét với batch size tùy chỉnh
npm run correction:scan -- --batch-size=200

# Quét một notice cụ thể (debug handler sau này)
npm run correction:scan -- --notice-id=12345

# Chạy một handler cụ thể (khi đã có)
npm run correction:run -- --handler=fix-xxx --dry-run
```

---

## Cấu trúc thư mục dự kiến

```
auction-cron-job/
├── README.md                          ← tài liệu này
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── database/
│   │   ├── database.module.ts
│   │   └── entities/
│   │       └── auction-notice.entity.ts
│   └── correction/
│       ├── correction.module.ts
│       ├── correction.runner.ts
│       ├── correction.scheduler.ts
│       ├── notice.scanner.ts
│       ├── notice.applier.ts          # stub — dùng khi có handler
│       ├── correction-handler.interface.ts
│       └── handlers/                  # trống — logic bạn thêm sau
├── .env.example
└── package.json
```

---

## Kết nối & triển khai (dự kiến)

```env
DATABASE_URL=postgresql://user:pass@host:5432/auction_db
CRON_ENABLED=true
CORRECTION_MODE=dry-run
SCAN_BATCH_SIZE=500
TZ=Asia/Ho_Chi_Minh
```

- **Runtime:** Node.js 20+, NestJS 10+
- **ORM:** TypeORM (`synchronize: false` — schema do `Auction-Project` quản lý)
- **Deploy:** systemd unit hoặc Docker, pattern tương tự `auction-crawler`

---

## Checklist verify trước khi code

- [ ] Lịch chạy 15 phút + daily 03:00 có phù hợp tải DB / nhu cầu nghiệp vụ?
- [ ] Chỉ quét `auction_notices`, `deleted_at IS NULL` — đủ cho logic ban đầu?
- [ ] Batch 500 + cursor `id` — chấp nhận được?
- [ ] `dry-run` mặc định cho đến khi có handler — OK?
- [ ] Kết nối trực tiếp PostgreSQL (không qua .NET API) — OK?
- [ ] Repo `auction-cron-job` tách riêng — OK?

Sau khi bạn xác nhận, bước tiếp theo là scaffold NestJS theo cấu trúc trên.

---

## Cài đặt & Chạy

### 1. Cài đặt dependencies

```bash
cd auction-cron-job
npm install
```

### 2. Cấu hình môi trường

**Cách 1: Dùng file .env (khuyến nghị cho local)**

```bash
cp .env.example .env
# Chỉnh DATABASE_URL trong .env
```

**Cách 2: Dùng environment variables (không cần .env)**

```bash
# Linux/Mac
export DATABASE_URL="postgresql://user:pass@localhost:5432/auction_db"
export CRON_ENABLED=true

# Windows PowerShell
$env:DATABASE_URL="postgresql://user:pass@localhost:5432/auction_db"
$env:CRON_ENABLED="true"
```

> **Chi tiết:** Xem [CONFIG.md](CONFIG.md) để biết tất cả cách config và troubleshooting.

### 3. Chạy development

```bash
# Chạy service với scheduler
npm run start:dev

# Chỉ chạy CLI (không bật cron)
CRON_ENABLED=false npm run start:dev
```

### 4. Chạy CLI commands

```bash
# Quét toàn bộ (dry-run)
npm run correction:scan

# Quét 1 notice cụ thể
npm run correction:scan -- --notice-id=12345

# Quét với batch size khác
npm run correction:scan -- --batch-size=100
```

### 5. Build production

```bash
npm run build
NODE_ENV=production npm run start:prod
```

---

## Thêm handler mới

Khi bạn có logic sửa dữ liệu, làm theo các bước:

1. **Tạo handler file:**

   ```typescript
   // src/correction/handlers/fix-xxx.handler.ts
   import { Injectable } from '@nestjs/common';
   import { CorrectionHandler } from '../correction-handler.interface';
   import { AuctionNotice } from '@/database/entities/auction-notice.entity';

   @Injectable()
   export class FixXxxHandler implements CorrectionHandler {
     readonly name = 'fix-xxx';

     async correct(notice: AuctionNotice): Promise<Partial<AuctionNotice> | null> {
       // Logic của bạn
       if (/* điều kiện */) {
         return { fieldName: newValue };
       }
       return null;
     }
   }
   ```

2. **Đăng ký trong module:**

   ```typescript
   // src/correction/correction.module.ts
   import { FixXxxHandler } from './handlers/fix-xxx.handler';

   const HANDLERS = [
     FixXxxHandler,
   ];
   ```

3. **Test dry-run:**

   ```bash
   npm run correction:run -- --handler=fix-xxx --dry-run
   ```

4. **Chạy apply khi đã OK:**

   ```bash
   CORRECTION_MODE=apply npm run correction:run -- --handler=fix-xxx
   ```

---

## Tham chiếu codebase

| Tài nguyên | Đường dẫn |
|------------|-----------|
| Entity `AuctionNotice` | `Auction-Project/AuctionPlatform/Domain/Entities/AuctionNotice.cs` |
| EF configuration | `Auction-Project/AuctionPlatform/Infrastructure/Data/Configurations/AuctionNoticeConfiguration.cs` |
| Crawl ingest | `Auction-Project/.../IngestNormalizedNoticeFromCrawlCommand.cs` |
| Crawler service (pattern scheduler) | `auction-crawler/scripts/run.py` |

---

## Documentation

| Document | Description |
|----------|-------------|
| [README.md](./README.md) | Overview và quick start |
| [STRUCTURE.md](./STRUCTURE.md) | Chi tiết cấu trúc project và luồng chạy |
| [QUICKSTART.md](./QUICKSTART.md) | Hướng dẫn setup và chạy nhanh |
| [CONFIG.md](./CONFIG.md) | Chi tiết về configuration |
| [LOGGING.md](./LOGGING.md) | **Hệ thống logging (Pino)** |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Hướng dẫn deploy production |
| [ARCHITECTURE_COMPARISON.md](./ARCHITECTURE_COMPARISON.md) | So sánh cấu trúc cron job vs API |
| [COMMON_UTILS.md](./COMMON_UTILS.md) | Common utilities (date, currency, string) |
| [HANDLER_LINK_ORG.md](./HANDLER_LINK_ORG.md) | Handler link auction_org_id |
