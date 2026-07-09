# Logging System

## Overview

Hệ thống logging sử dụng **Pino** - high-performance logger cho Node.js với các tính năng:

- ⚡ **Performance cao** - nhanh hơn Winston, Bunyan
- 📝 **Structured logging** - JSON format dễ parse/analyze
- 🎨 **Pretty console** - màu sắc cho development
- 📁 **Daily rotation** - logs tự động tách theo ngày
- 🔍 **LOG_LEVEL filtering** - filter logs theo mức độ

---

## Architecture

### Multiple Transports

```
Logger
├─ Console (pino-pretty)
│  └─ Development: màu sắc, dễ đọc
│  └─ Production: JSON format
│
├─ File: logs/app-YYYY-MM-DD.log
│  └─ Tất cả logs (info+)
│
└─ File: logs/error-YYYY-MM-DD.log
   └─ Chỉ errors
```

### Log Levels

```
error  →  warn  →  log  →  debug  →  verbose
 ⬆️                                      ⬆️
 Ít                                    Nhiều
```

---

## Configuration

### Environment Variables

```env
# .env
LOG_LEVEL=info              # error | warn | info | debug | verbose
NODE_ENV=development        # development | production
```

### Log Level Behavior

| LOG_LEVEL | error | warn | log | debug | verbose |
|-----------|-------|------|-----|-------|---------|
| `error`   | ✅    | ❌   | ❌  | ❌    | ❌      |
| `warn`    | ✅    | ✅   | ❌  | ❌    | ❌      |
| `info`    | ✅    | ✅   | ✅  | ❌    | ❌      |
| `debug`   | ✅    | ✅   | ✅  | ✅    | ❌      |
| `verbose` | ✅    | ✅   | ✅  | ✅    | ✅      |

---

## Usage

### Basic Usage

```typescript
import { createLogger } from '@/common/logger';

const logger = createLogger('MyComponent');

// Các log levels
logger.error('Critical error', stack, 'Context');
logger.warn('Warning message');
logger.log('Info message');        // Thường dùng nhất
logger.debug('Debug details');     // Development only
logger.verbose('Trace info');      // Very detailed
```

### Structured Logging

```typescript
// ✅ Tốt: Structured data
logger.log('Processing notice', {
  noticeId: 123,
  status: 'UPCOMING',
  orgId: 45,
});

// Output JSON (trong file):
{
  "level": "info",
  "time": 1720569615245,
  "context": "NoticeScanner",
  "msg": "Processing notice",
  "noticeId": 123,
  "status": "UPCOMING",
  "orgId": 45
}

// ❌ Tránh: String concatenation
logger.log(`Processing notice ${id} with status ${status}`);
```

### With Context

```typescript
// Cách 1: Tạo logger với context cố định
const logger = createLogger('HandlerName');
logger.log('Message');  // [HandlerName] Message

// Cách 2: Override context per call
logger.log('Message', 'OverrideContext');
```

---

## Output Examples

### Development (Console)

```bash
[10/07/2026 00:45:15] INFO (NoticeScanner): Scanning batch: 500 notices
    context: "NoticeScanner"
    batchSize: 500

[10/07/2026 00:45:16] WARN (LinkAuctionOrgHandler): Found 3 duplicate names
    context: "LinkAuctionOrgHandler"
    duplicates: 3

[10/07/2026 00:45:17] ERROR (DatabaseModule): Connection failed
    context: "DatabaseModule"
    stack: "Error: ECONNREFUSED..."
```

### Production (File JSON)

**logs/app-2026-07-10.log:**
```json
{"level":"info","time":1720569915245,"context":"NoticeScanner","msg":"Scanning batch: 500 notices","batchSize":500}
{"level":"info","time":1720569916123,"context":"NoticeScanner","msg":"Found 350 candidates","candidates":350}
{"level":"warn","time":1720569920456,"context":"LinkAuctionOrgHandler","msg":"Found 3 duplicate names","duplicates":3}
```

**logs/error-2026-07-10.log:**
```json
{"level":"error","time":1720569920789,"context":"DatabaseModule","msg":"Connection failed","stack":"Error: ECONNREFUSED..."}
```

---

## File Structure

### Logs Directory

```
logs/
├─ .gitkeep                  ← Tracked by git (folder structure)
├─ app-2026-07-10.log        ← Today's all logs
├─ app-2026-07-09.log        ← Yesterday
├─ app-2026-07-08.log        ← 2 days ago
├─ ...
├─ error-2026-07-10.log      ← Today's errors
├─ error-2026-07-09.log      ← Yesterday's errors
└─ ...
```

### Automatic Cleanup

**Current behavior:**
- Logs được tạo mới mỗi ngày (daily rotation)
- File logs **KHÔNG** tự động xóa (cần manual cleanup)

**Recommended cleanup:**
```bash
# Cron job xóa logs cũ hơn 30 ngày
find logs/ -name "app-*.log" -mtime +30 -delete
find logs/ -name "error-*.log" -mtime +90 -delete
```

---

## Log Management

### View Logs

```bash
# Xem logs hôm nay
cat logs/app-2026-07-10.log

# Xem errors
cat logs/error-2026-07-10.log

# Follow live logs (console)
npm start

# Tail file logs
tail -f logs/app-$(date +%Y-%m-%d).log
```

### Search Logs

```bash
# Search trong logs hôm nay
grep "ERROR" logs/app-2026-07-10.log

# Search trong tất cả logs tuần này
grep -r "Database connection" logs/app-2026-07-0*.log

# Count errors per day
for f in logs/error-2026-07-*.log; do
  echo "$f: $(wc -l < $f) errors"
done

# Parse JSON logs
cat logs/app-2026-07-10.log | jq 'select(.level == "error")'
```

### Backup & Archive

```bash
# Backup logs tuần trước
tar -czf logs-backup-week28.tar.gz logs/app-2026-07-0*.log

# Archive logs tháng 6
mkdir -p archive/2026-06
mv logs/app-2026-06-*.log archive/2026-06/
```

---

## Performance

### Benchmarks

```
console.log:      ~10,000 ops/s
Winston:          ~8,000 ops/s
Pino:            ~30,000 ops/s  ← Current
```

### Production Impact

- Multiple transports: ~5-10% overhead
- File writes: asynchronous, không block
- JSON serialization: optimized bởi Pino

---

## Migration Notes

### Từ Custom Logger

**Không cần thay đổi code:**
```typescript
// Usage code GIỐNG HỆT
const logger = createLogger('MyHandler');
logger.log('Message');      // ✅ Không đổi
logger.error('Error');      // ✅ Không đổi
```

**Thay đổi:**
- ✅ Logs giờ vào file
- ✅ LOG_LEVEL giờ hoạt động
- ✅ JSON structured trong file
- ✅ Daily rotation tự động

---

## Troubleshooting

### Logs không xuất hiện

```bash
# Check LOG_LEVEL
echo $LOG_LEVEL  # Hoặc xem .env

# Set debug level
LOG_LEVEL=debug npm start
```

### File logs không tạo

```bash
# Check folder permissions
ls -la logs/

# Ensure logs directory exists
mkdir -p logs
```

### Console output bị garbled

```bash
# Development: should use pino-pretty
NODE_ENV=development npm start

# Production: JSON output là normal
NODE_ENV=production npm start
```

---

## Best Practices

### ✅ DO

```typescript
// Structured data
logger.log('User login', { userId: 123, ip: '1.2.3.4' });

// Meaningful context
const logger = createLogger('UserAuthHandler');

// Appropriate levels
logger.error('Critical failure', stack);
logger.warn('Degraded performance');
logger.log('Normal operation');
logger.debug('Detailed info');
```

### ❌ DON'T

```typescript
// String concatenation
logger.log(`User ${id} logged in from ${ip}`);  // ❌

// Generic context
const logger = createLogger('Handler');  // ❌ Không rõ

// Wrong levels
logger.error('Info message');  // ❌ Sai level
logger.log('Critical error');  // ❌ Nên dùng error
```

---

## Environment-Specific Config

### Development

```env
NODE_ENV=development
LOG_LEVEL=debug
```

**Output:**
- Console: Pretty print, có màu
- File: JSON logs

### Production

```env
NODE_ENV=production
LOG_LEVEL=info
```

**Output:**
- Console: JSON (cho Docker logs)
- File: JSON logs

### Testing

```env
NODE_ENV=test
LOG_LEVEL=error
```

**Output:**
- Console: Chỉ errors (giảm noise)
- File: Vẫn ghi đầy đủ

---

## Monitoring Integration

### Với Docker

```yaml
# docker-compose.yml
services:
  auction-cron:
    volumes:
      - ./logs:/app/logs  # Mount logs ra host
```

```bash
# View Docker logs (console output)
docker logs auction-cron

# View file logs
cat logs/app-$(date +%Y-%m-%d).log
```

### Với PM2

```bash
# Start with PM2
pm2 start npm --name auction-cron -- start

# View logs
pm2 logs auction-cron

# View file logs
tail -f logs/app-$(date +%Y-%m-%d).log
```

---

## Future Enhancements

### Potential Additions

1. **Log Compression**
   ```bash
   npm install rotating-file-stream
   # Auto gzip old logs
   ```

2. **Remote Logging**
   ```bash
   # Send logs to Datadog, Elasticsearch, etc.
   npm install pino-datadog
   ```

3. **Custom Retention**
   ```typescript
   // Auto cleanup old logs
   maxFiles: 30,  // Keep 30 days
   ```

4. **Separate Debug File**
   ```typescript
   // Debug logs to separate file
   logs/debug-YYYY-MM-DD.log
   ```

---

## References

- [Pino Documentation](https://getpino.io/)
- [pino-pretty](https://github.com/pinojs/pino-pretty)
- [Best Practices](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/)
