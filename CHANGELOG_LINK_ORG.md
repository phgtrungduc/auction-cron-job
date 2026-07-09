# Summary: Link Auction Org Handler

## ✅ Đã Thêm

### 📄 Files mới (3 files)

1. **src/database/entities/auction-organization.entity.ts**
   - TypeORM entity cho bảng `auction_organizations`
   - Map các cột: id, full_name, short_name, tax_code, address, ...

2. **src/correction/handlers/link-auction-org.handler.ts**
   - Handler đầu tiên với logic thật (không phải stub)
   - Link `auction_org_id` cho notices dựa trên `auction_org_name`
   - Cache organizations vào memory
   - Normalize: lowercase + trim + remove extra spaces
   - Safe handling: skip duplicates

3. **HANDLER_LINK_ORG.md**
   - Hướng dẫn chi tiết cách dùng handler
   - Test cases, troubleshooting
   - SQL queries để verify

### 🔄 Files đã update (3 files)

1. **src/database/database.module.ts**
   - Thêm `AuctionOrganization` entity
   - Export qua TypeOrmModule

2. **src/correction/correction.module.ts**
   - Đăng ký `LinkAuctionOrgHandler` trong HANDLERS
   - Enable provider `CORRECTION_HANDLERS`

3. **src/correction/correction.runner.ts**
   - Inject `CORRECTION_HANDLERS` từ DI
   - Log handlers đang chạy
   - Format log với `formatNumber()`

4. **src/correction/handlers/example.handler.ts**
   - Fix lỗi TypeScript (bỏ phần Assets không cần thiết)

---

## 🎯 Handler: link-auction-org

### Logic

```
1. Quét notices có auction_org_id = NULL
2. Lấy auction_org_name
3. Normalize: 
   - lowercase
   - trim
   - multiple spaces → single space
4. Tìm trong auction_organizations.fullname (cũng normalized)
5. Nếu match duy nhất → update auction_org_id
6. Nếu nhiều matches/không tìm thấy → skip + log
```

### Features

✅ **Organization cache**
- Load tất cả orgs vào memory lần đầu
- Tăng tốc độ xử lý (không query lặp lại)

✅ **Safe handling**
- Skip duplicates để tránh link sai
- Log warnings cho duplicates

✅ **Idempotent**
- Chạy nhiều lần → kết quả giống nhau
- Skip notices đã có auction_org_id

✅ **Logger tích hợp**
- Log rõ ràng: match found, no match, duplicates
- Format với truncate(), formatNumber()

---

## 🚀 Cách Chạy

### 1. Dry-run (xem trước)

```bash
npm run correction:run -- --handler=link-auction-org --dry-run
```

**Output:**
```
[11:30:45] [LOG    ] [LinkAuctionOrgHandler] Loading auction organizations cache...
[11:30:46] [LOG    ] [LinkAuctionOrgHandler] Loaded 156 organizations into cache
[11:30:48] [LOG    ] [LinkAuctionOrgHandler] Linking notice 123 (Trung tâm dịch vụ...) → org 45
[11:30:48] [LOG    ] [NoticeApplier] [DRY-RUN] Would update notice 123 via link-auction-org
```

### 2. Apply (ghi DB)

```bash
CORRECTION_MODE=apply npm run correction:run -- --handler=link-auction-org
```

### 3. Test với 1 notice

```bash
npm run correction:scan -- --notice-id=123 --dry-run
```

---

## 📊 Normalization

### Ví dụ

| Original | Normalized |
|----------|------------|
| `  Công ty ABC  ` | `công ty abc` |
| `Trung  Tâm   XYZ` | `trung tâm xyz` |
| `CÔNG TY TNHH ABC` | `công ty tnhh abc` |

### Code

```typescript
private normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
```

---

## ⚠️ Confidence Levels

| Case | Action | Reason |
|------|--------|---------|
| **1 match duy nhất** | ✅ Auto-fix | High confidence |
| **2+ matches** | ⚠️ Skip + log | Duplicate names → unsafe |
| **0 matches** | ⚠️ Skip + log | Org chưa có trong DB |

---

## 🧪 Verify Trước Khi Apply

### 1. Check notices cần fix

```sql
SELECT COUNT(*) 
FROM auction_notices 
WHERE auction_org_id IS NULL 
  AND auction_org_name IS NOT NULL
  AND deleted_at IS NULL;
```

### 2. Preview sample

```sql
SELECT id, auction_org_name 
FROM auction_notices 
WHERE auction_org_id IS NULL 
LIMIT 10;
```

### 3. Check orgs available

```sql
SELECT COUNT(*) FROM auction_organizations WHERE deleted_at IS NULL;
```

### 4. Find duplicates

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

## 📈 Expected Results

Giả sử có:
- 1000 notices với `auction_org_id = NULL`
- 156 organizations trong DB
- 10 duplicate org names

**After running:**
- ~800-900 notices linked thành công
- ~50-100 notices không tìm thấy match (org chưa có trong DB)
- ~10-50 notices bị skip (do duplicates)

---

## 🔧 Troubleshooting

### Issue: Handler không link gì

**Check:**
1. Có notices `auction_org_id = NULL`?
2. Có orgs trong DB?
3. Tên có khớp sau normalize?

```sql
-- Test match manually
SELECT 
  n.id,
  LOWER(TRIM(n.auction_org_name)) as notice_name,
  o.id as org_id,
  LOWER(TRIM(o.full_name)) as org_name
FROM auction_notices n
LEFT JOIN auction_organizations o 
  ON LOWER(TRIM(REGEXP_REPLACE(n.auction_org_name, '\s+', ' ', 'g'))) = 
     LOWER(TRIM(REGEXP_REPLACE(o.full_name, '\s+', ' ', 'g')))
WHERE n.auction_org_id IS NULL
LIMIT 10;
```

### Issue: Nhiều duplicates

**Fix duplicates:**

```sql
-- Option 1: Delete duplicates (giữ ID nhỏ nhất)
DELETE FROM auction_organizations 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM auction_organizations 
  GROUP BY LOWER(TRIM(REGEXP_REPLACE(full_name, '\s+', ' ', 'g')))
);

-- Option 2: Rename để unique
UPDATE auction_organizations 
SET full_name = full_name || ' (' || province_code || ')'
WHERE id IN (/* duplicate IDs */);
```

---

## 🎉 Benefits

### Before

```sql
-- Nhiều notices thiếu auction_org_id
SELECT * FROM auction_notices WHERE auction_org_id IS NULL;
-- 1000+ rows

-- Không query được theo org
SELECT * FROM auction_notices WHERE auction_org_id = 45;
-- Miss nhiều notices vì chỉ có auction_org_name
```

### After

```sql
-- Notices đã có auction_org_id
SELECT * FROM auction_notices WHERE auction_org_id IS NULL;
-- ~100 rows (chỉ còn những org chưa có trong DB)

-- Query theo org chính xác
SELECT * FROM auction_notices WHERE auction_org_id = 45;
-- Include cả notices đã được link tự động

-- Join với org
SELECT n.*, o.full_name, o.address
FROM auction_notices n
JOIN auction_organizations o ON n.auction_org_id = o.id;
-- Performance tốt hơn
```

---

## 📚 Documentation

- **HANDLER_LINK_ORG.md** - Hướng dẫn chi tiết
- **link-auction-org.handler.ts** - Source code
- **COMMON_UTILS.md** - Logger & utils
- **STRUCTURE.md** - Project structure

---

## 🔮 Next Steps

1. **Chạy dry-run** để xem trước kết quả
2. **Review log** - check số lượng matches
3. **Fix duplicates** nếu có warning
4. **Apply** - chạy với `CORRECTION_MODE=apply`
5. **Verify** - check số notices đã linked
6. **Schedule** - bật cron nếu cần chạy định kỳ

---

## ✨ Highlights

✅ **Handler đầu tiên với logic thật** - Không còn stub  
✅ **Safe & smart** - Skip duplicates, cache organizations  
✅ **Idempotent** - Chạy nhiều lần an toàn  
✅ **Well documented** - README chi tiết + troubleshooting  
✅ **Logger tích hợp** - Log rõ ràng mọi action  
✅ **Build success** - TypeScript compile OK  

Bây giờ có handler thật đầu tiên để link auction organizations! 🚀
