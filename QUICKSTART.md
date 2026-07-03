# Auction Cron Job - Quick Start

Sau khi đã scaffold, làm theo các bước:

## 1. Cài đặt

```bash
cd auction-cron-job
npm install
```

## 2. Cấu hình database

Tạo file `.env`:

```bash
cp .env.example .env
```

Sửa `DATABASE_URL` trong `.env` trỏ tới PostgreSQL của `Auction-Project`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/auction_db
CRON_ENABLED=true
CORRECTION_MODE=dry-run
```

## 3. Chạy development

```bash
npm run start:dev
```

Service sẽ:
- Kết nối PostgreSQL
- Bật cron jobs (mỗi 15 phút + daily 03:00)
- Log: "scanned=X, batches=Y, handlers=0"

**Lưu ý:** Hiện tại chưa có handler nên chỉ quét + log thống kê, không UPDATE DB.

## 4. Test CLI

```bash
# Quét 10 bản ghi đầu tiên
npm run correction:scan -- --batch-size=10

# Quét 1 notice cụ thể
npm run correction:scan -- --notice-id=123
```

## 5. Khi có logic sửa dữ liệu

Xem `src/correction/handlers/README.md` để biết cách thêm handler.

## Troubleshooting

**Lỗi kết nối DB:**
- Kiểm tra `DATABASE_URL` trong `.env`
- Đảm bảo PostgreSQL đang chạy
- Test connection: `psql $DATABASE_URL -c "SELECT 1"`

**Cron không chạy:**
- Set `CRON_ENABLED=true` trong `.env`
- Kiểm tra log: "Cron enabled: true"

**Muốn tắt cron, chỉ chạy CLI:**
```bash
CRON_ENABLED=false npm run start:dev
```
