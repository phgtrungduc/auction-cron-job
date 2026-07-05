# Configuration Guide

## Cách config service

Service này hỗ trợ 3 cách cấu hình, theo thứ tự ưu tiên:

### 1. File .env (Khuyến nghị cho local dev)

```bash
cp .env.example .env
# Chỉnh sửa .env
npm run start:dev
```

**Ưu điểm:**
- Dễ quản lý
- Không lộ ra command history
- Git ignore tự động

### 2. Environment Variables (Khuyến nghị cho production)

#### Linux/Mac:
```bash
export DATABASE_URL="postgresql://user:pass@host:5432/db"
export CRON_ENABLED=true
export CORRECTION_MODE=dry-run
npm run start:prod
```

#### Windows PowerShell:
```powershell
$env:DATABASE_URL="postgresql://user:pass@host:5432/db"
$env:CRON_ENABLED="true"
$env:CORRECTION_MODE="dry-run"
npm run start:prod
```

#### Inline (Linux/Mac):
```bash
DATABASE_URL="..." CRON_ENABLED=true npm start
```

**Ưu điểm:**
- An toàn cho production
- Tích hợp tốt với Docker/Kubernetes
- Không cần file

### 3. Docker/Docker Compose

```yaml
# docker-compose.yml
services:
  auction-cron-job:
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - CRON_ENABLED=true
      - CORRECTION_MODE=dry-run
    env_file:
      - .env  # Optional
```

Chạy:
```bash
docker-compose up
```

---

## Biến môi trường

| Biến | Bắt buộc | Mặc định | Mô tả |
|------|----------|----------|-------|
| `DATABASE_URL` | ✅ **Có** | _none_ | PostgreSQL connection string |
| `CRON_ENABLED` | Không | `true` | Bật/tắt scheduler |
| `CORRECTION_MODE` | Không | `dry-run` | `dry-run` hoặc `apply` |
| `SCAN_BATCH_SIZE` | Không | `500` | Số bản ghi mỗi batch |
| `NOTICE_SCAN_CRON` | Không | `*/15 * * * *` | Cron expression |
| `NOTICE_SCAN_DAILY_CRON` | Không | `0 3 * * *` | Daily cron |
| `TZ` | Không | `Asia/Ho_Chi_Minh` | Timezone |
| `NODE_ENV` | Không | _none_ | `development`/`production` |
| `PORT` | Không | `3000` | HTTP port |
| `LOG_LEVEL` | Không | `info` | Log level |

---

## Ví dụ DATABASE_URL

### Local development:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/auction_db
```

### Production với SSL:
```
DATABASE_URL=postgresql://user:pass@db.example.com:5432/auction_db?sslmode=require
DATABASE_SSL=true
```

### Từ appsettings.json của .NET:
Nếu bạn có connection string trong `Auction-Project/AuctionPlatform/Web/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=auction_db;Username=postgres;Password=..."
  }
}
```

Convert sang format PostgreSQL URL:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/auction_db
```

---

## Kiểm tra config hiện tại

### Xem giá trị đang dùng:

```bash
# Linux/Mac
echo $DATABASE_URL

# Windows PowerShell
echo $env:DATABASE_URL

# Hoặc xem log khi start service (không show password)
npm run start:dev
# [Bootstrap] Correction mode: dry-run
# [Bootstrap] Cron enabled: true
```

### Test kết nối DB:

```bash
# Với psql
psql $DATABASE_URL -c "SELECT 1"

# Hoặc chạy service - sẽ báo lỗi ngay nếu DB không kết nối được
npm run start:dev
```

---

## Troubleshooting

### Lỗi: "DATABASE_URL is required"

**Nguyên nhân:** Không có file `.env` và không set environment variable.

**Giải pháp:**
1. Tạo file `.env`: `cp .env.example .env`
2. Hoặc set env: `export DATABASE_URL="..."`

### Service không đọc .env

**Nguyên nhân:** File `.env` không ở root project hoặc sai tên.

**Kiểm tra:**
```bash
ls -la .env  # Phải thấy file
cat .env     # Xem nội dung
```

### Config bị override

**Thứ tự ưu tiên:**
1. Environment variable của system (cao nhất)
2. File `.env`
3. Default values trong code

Nếu set cả system env và `.env`, system env sẽ thắng.

---

## Production deployment

### Systemd:

```bash
# /etc/systemd/system/auction-cron-job.service
[Service]
Environment="DATABASE_URL=postgresql://..."
Environment="CRON_ENABLED=true"
Environment="CORRECTION_MODE=apply"
EnvironmentFile=/opt/auction-cron-job/.env  # Optional
```

### Docker:

```dockerfile
# Dockerfile
ENV CRON_ENABLED=true
ENV CORRECTION_MODE=dry-run
# DATABASE_URL pass qua docker run -e
```

```bash
docker run -e DATABASE_URL="..." auction-cron-job
```

### Kubernetes:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: auction-cron-job-secrets
data:
  database-url: <base64-encoded>
---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: auction-cron-job
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: auction-cron-job-secrets
              key: database-url
        - name: CRON_ENABLED
          value: "true"
```

---

## Best Practices

### ✅ Nên:

- Dùng `.env` cho local development
- Dùng system env hoặc secrets manager cho production
- Không commit file `.env` vào git
- Set `CORRECTION_MODE=dry-run` khi lần đầu deploy
- Dùng SSL cho DB connection (`?sslmode=require`)

### ❌ Không nên:

- Hard-code credentials trong code
- Commit `.env` vào git
- Dùng `apply` mode trước khi test
- Share `.env` file qua chat/email (dùng secrets manager)
