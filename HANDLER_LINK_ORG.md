# Link Auction Org Handler - Guide

## 📋 Mô tả

Handler `link-auction-org` tự động liên kết `auction_org_id` cho các notices chưa có thông tin này.

**Logic:**
1. Quét `auction_notices` có `auction_org_id = NULL`
2. Lấy `auction_org_name` từ notice
3. Normalize (lowercase + trim + remove extra spaces)
4. Tìm kiếm trong `auction_organizations` theo `fullname` (cũng normalized)
5. Nếu tìm thấy **1 match duy nhất** → update `auction_org_id`
6. Nếu nhiều matches hoặc không tìm thấy → skip + log

---

## 🎯 Confidence Level

| Trường hợp | Action | Lý do |
|------------|--------|-------|
| **1 match duy nhất** | ✅ Auto-fix | High confidence - tên khớp chính xác |
| **Nhiều matches** | ⚠️ Skip + log | Low confidence - tên trùng lặp, không an toàn |
| **Không tìm thấy** | ⚠️ Skip + log | Org chưa có trong DB |

---

## 🔧 Cách Sử dụng

### 1. Dry-run (xem trước không ghi DB)

```bash
npm run correction:run -- --handler=link-auction-org --dry-run
```

**Output:**
```
[09/07/2026 11:30:45] [LOG    ] [LinkAuctionOrgHandler] Loading auction organizations cache...
[09/07/2026 11:30:46] [LOG    ] [LinkAuctionOrgHandler] Loaded 156 organizations into cache
[09/07/2026 11:30:47] [LOG    ] [NoticeScanner] Starting batch scan: batchSize=500
[09/07/2026 11:30:48] [LOG    ] [LinkAuctionOrgHandler] Linking notice 123 (Trung tâm dịch vụ đấu giá...) → org 45
[09/07/2026 11:30:48] [LOG    ] [NoticeApplier] [DRY-RUN] Would update notice 123 via link-auction-org: auctionOrgId
[09/07/2026 11:30:49] [DEBUG  ] [LinkAuctionOrgHandler] No match found for notice 456: "Công ty ABC không tồn tại"
```

### 2. Apply (ghi DB thật)

```bash
# Chạy với apply mode
CORRECTION_MODE=apply npm run correction:run -- --handler=link-auction-org
```

**Hoặc inline:**

```bash
npm run correction:run -- --handler=link-auction-org
# Rồi set CORRECTION_MODE=apply trong .env trước khi chạy
```

### 3. Quét một notice cụ thể (debug)

```bash
npm run correction:scan -- --notice-id=123 --dry-run
```

---

## 📊 Output Mẫu

### Case 1: Tìm thấy match

```
[LOG] Linking notice 123 (Trung tâm dịch vụ đấu giá tài sản Hà Nội) → org 45
[LOG] [DRY-RUN] Would update notice 123 via link-auction-org: auctionOrgId
```

### Case 2: Không tìm thấy

```
[DEBUG] No match found for notice 456: "Công ty XYZ chưa có trong hệ thống"
```

### Case 3: Duplicate (warning)

```
[WARN] Found 3 duplicate organization names (skipped for safety)
[DEBUG] Duplicate: "trung tâm dịch vụ đấu giá"
```

---

## 🔍 Normalization Logic

### Ví dụ normalize

| Original | Normalized |
|----------|------------|
| `  Công ty ABC  ` | `công ty abc` |
| `Trung  Tâm   XYZ` | `trung tâm xyz` |
| `CÔNG TY TNHH ABC` | `công ty tnhh abc` |

**Code:**
```typescript
private normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Multiple spaces → single space
}
```

---

## 🧪 Test Trước Khi Apply

### 1. Check số lượng notices cần fix

```sql
SELECT COUNT(*) 
FROM auction_notices 
WHERE auction_org_id IS NULL 
  AND auction_org_name IS NOT NULL
  AND deleted_at IS NULL;
```

### 2. Preview một vài cases

```sql
SELECT id, auction_org_name 
FROM auction_notices 
WHERE auction_org_id IS NULL 
  AND auction_org_name IS NOT NULL
  AND deleted_at IS NULL
LIMIT 10;
```

### 3. Check organizations có sẵn

```sql
SELECT id, full_name 
FROM auction_organizations 
WHERE deleted_at IS NULL
ORDER BY full_name;
```

### 4. Tìm duplicate names

```sql
SELECT 
  LOWER(TRIM(REGEXP_REPLACE(full_name, '\s+', ' ', 'g'))) as normalized,
  COUNT(*) as count
FROM auction_organizations
WHERE deleted_at IS NULL
GROUP BY normalized
HAVING COUNT(*) > 1;
```

---

## ⚠️ Lưu Ý Quan Trọng

### 1. Cache organizations

Handler load **tất cả organizations vào memory** lần đầu chạy để tăng tốc.

- ✅ **Ưu điểm:** Nhanh, không query lặp lại
- ⚠️ **Nhược điểm:** Nếu thêm org mới trong khi chạy → cache cũ

**Solution:** Service tự động reload cache mỗi lần restart. Hoặc thêm clear cache API sau.

### 2. Duplicate organizations

Nếu có 2+ orgs cùng tên (sau normalize) → handler **bỏ qua** để an toàn.

**Giải pháp:**
```sql
-- Tìm và merge duplicates trong DB trước
-- Hoặc đổi tên để unique
UPDATE auction_organizations 
SET full_name = 'Trung tâm dịch vụ đấu giá - Chi nhánh HN'
WHERE id = 123;
```

### 3. Protected notices

Handler **không** sửa notices:
- `deleted_at IS NOT NULL` (soft deleted)
- `status_self_reported = true` (tổ chức tự báo cáo)

### 4. Idempotent

Chạy nhiều lần → kết quả giống nhau. Notice đã có `auction_org_id` sẽ bị skip.

---

## 📈 Monitoring

### Log levels

```typescript
logger.log()    // Match found → linking
logger.debug()  // No match found (nhiều)
logger.warn()   // Duplicates detected
logger.error()  // Handler error (hiếm)
```

### Metrics đề xuất

- Số notices processed
- Số notices linked thành công
- Số notices không tìm thấy match
- Số duplicates skipped
- Duration

---

## 🔧 Troubleshooting

### Issue: Handler không link gì cả

**Check:**
1. Có notices nào `auction_org_id = NULL` không?
   ```sql
   SELECT COUNT(*) FROM auction_notices 
   WHERE auction_org_id IS NULL AND auction_org_name IS NOT NULL;
   ```

2. Có organizations nào trong DB không?
   ```sql
   SELECT COUNT(*) FROM auction_organizations WHERE deleted_at IS NULL;
   ```

3. Tên có khớp không? (check sau normalize)
   ```sql
   SELECT 
     LOWER(TRIM(n.auction_org_name)) as notice_name,
     LOWER(TRIM(o.full_name)) as org_name
   FROM auction_notices n
   LEFT JOIN auction_organizations o 
     ON LOWER(TRIM(n.auction_org_name)) = LOWER(TRIM(o.full_name))
   WHERE n.auction_org_id IS NULL
   LIMIT 10;
   ```

### Issue: Nhiều duplicates warning

**Giải pháp:**

1. Merge duplicates trong `auction_organizations`:
   ```sql
   -- Xóa duplicate (giữ ID nhỏ nhất)
   DELETE FROM auction_organizations 
   WHERE id NOT IN (
     SELECT MIN(id) 
     FROM auction_organizations 
     GROUP BY LOWER(TRIM(full_name))
   );
   ```

2. Hoặc rename để unique:
   ```sql
   UPDATE auction_organizations 
   SET full_name = full_name || ' - ' || id::text
   WHERE id IN (/* duplicate IDs */);
   ```

### Issue: Cache cũ

**Clear cache:**
- Restart service
- Hoặc implement `/api/correction/cache/clear` endpoint (sau này)

---

## 📝 Next Steps

Sau khi handler chạy thành công, có thể:

1. **Add audit log table** (khuyến nghị):
   ```sql
   CREATE TABLE data_correction_log (
     id BIGSERIAL PRIMARY KEY,
     notice_id BIGINT REFERENCES auction_notices(id),
     handler VARCHAR(100) NOT NULL,
     field_name VARCHAR(100) NOT NULL,
     old_value TEXT,
     new_value TEXT,
     applied_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Schedule cron** (nếu dữ liệu liên tục):
   - Để handler chạy tự động mỗi ngày
   - Hoặc sau mỗi lần crawl mới

3. **Add metrics**:
   - Log số lượng linked
   - Alert nếu linking rate thấp

---

## 📚 Tham Khảo

- **link-auction-org.handler.ts** - Implementation
- **COMMON_UTILS.md** - Logger & utils API
- **STRUCTURE.md** - Cấu trúc project
- **README.md** - Tài liệu tổng quan
