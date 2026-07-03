# Cấu trúc Project

```
auction-cron-job/
├── src/
│   ├── main.ts                          # Entry point cho service
│   ├── cli.ts                           # Entry point cho CLI commands
│   ├── app.module.ts                    # Root module
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
└── DEPLOYMENT.md                        # Hướng dẫn deploy production
```

## Thành phần chính

### 1. Database Layer (`src/database/`)

- **`auction-notice.entity.ts`**: TypeORM entity map đầy đủ các cột của `auction_notices`
- Schema do Auction-Project (.NET) quản lý, `synchronize: false`

### 2. Correction Core (`src/correction/`)

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

### 3. CLI (`src/cli.ts`)

Commands:
- `npm run correction:scan` - Quét full/partial
- `npm run correction:run -- --handler=xxx` - Chạy handler cụ thể

### 4. Entry Points

- **Service mode** (`main.ts`): scheduler bật, chạy nền
- **CLI mode** (`cli.ts`): chạy tay, không scheduler

## Luồng xử lý

```
┌──────────────┐
│  Scheduler   │ (mỗi 15 phút hoặc CLI)
└──────┬───────┘
       │
       v
┌──────────────┐
│    Runner    │ orchestrate
└──────┬───────┘
       │
       v
┌──────────────┐
│   Scanner    │ batch read notices WHERE deleted_at IS NULL
└──────┬───────┘
       │
       v
┌──────────────┐
│  Handlers[]  │ correct(notice) → patch | null
└──────┬───────┘
       │
       v
┌──────────────┐
│   Applier    │ UPDATE (khi có handler + mode=apply)
└──────────────┘
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
