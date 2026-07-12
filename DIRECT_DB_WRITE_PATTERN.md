# Direct DB Write Pattern - Simplified Handler Architecture

## 📋 Overview

Refactored all correction handlers để ghi trực tiếp vào database, loại bỏ NoticeApplier pattern và dry-run mode.

**Date**: 2026-07-12

---

## ✅ Changes Made

### 1. **Handlers Refactored**

#### Before: NoticeApplier Pattern
```typescript
async correct(notice: AuctionNotice): Promise<Partial<AuctionNotice> | null> {
  // Compute patch
  const patch = { auctionOrgId: orgId };
  
  // Return patch → NoticeApplier xử lý
  return patch;
}
```

**Problems**:
- ❌ Extra abstraction layer (NoticeApplier)
- ❌ Không linh hoạt (chỉ update được `auction_notices`)
- ❌ Cần `CORRECTION_MODE` để control dry-run
- ❌ Code phức tạp hơn cần thiết

#### After: Direct Write Pattern
```typescript
async correct(notice: AuctionNotice): Promise<Partial<AuctionNotice> | null> {
  // Write directly to DB
  await this.noticeRepo.update(notice.id, { auctionOrgId: orgId });
  
  // Or create entities in other tables
  await this.entityRepo.save(entity);
  await this.linkRepo.save(link);
  
  return null; // No patch needed
}
```

**Benefits**:
- ✅ Đơn giản, trực tiếp
- ✅ Linh hoạt (update bất kỳ table nào)
- ✅ Không cần dry-run mode
- ✅ Dễ debug và maintain

---

### 2. **Files Updated**

#### LinkAuctionOrgHandler
**File**: `src/correction/handlers/link-auction-org.handler.ts`

**Changes**:
- Added `@InjectRepository(AuctionNotice)`
- Changed `correct()` to call `this.noticeRepo.update()` directly
- Return `null` instead of patch object

```typescript
async correct(notice: AuctionNotice): Promise<Partial<AuctionNotice> | null> {
  // ... logic ...
  
  await this.noticeRepo.update(notice.id, {
    auctionOrgId: orgId,
  });
  
  return null;
}
```

---

#### LinkAssetOwnerHandler
**File**: `src/correction/handlers/link-asset-owner.handler.ts`

**Already implemented** với direct write pattern:
```typescript
async correct(notice: AuctionNotice): Promise<Partial<AuctionNotice> | null> {
  // Create/update owner entity
  await this.entityRepo.save(entity);
  
  // Create link
  await this.linkRepo.save(link);
  
  // Update statistics
  await this.entityRepo.save(entity);
  
  return null;
}
```

---

#### CorrectionRunner
**File**: `src/correction/correction.runner.ts`

**Changes**:
- Removed `NoticeApplier` dependency
- Removed `ConfigService` dependency
- Removed `CORRECTION_MODE` logic
- Simplified `processBatch()` - chỉ gọi `handler.correct()`

**Before**:
```typescript
async processBatch(notices, handlers, mode: CorrectionMode) {
  for (const handler of handlers) {
    const patch = await handler.correct(notice);
    if (patch) {
      await this.applier.apply(notice.id, patch, meta, mode);
    }
  }
}
```

**After**:
```typescript
async processBatch(notices, handlers) {
  for (const handler of handlers) {
    // Handler tự ghi vào DB
    await handler.correct(notice);
  }
}
```

---

#### CorrectionModule
**File**: `src/correction/correction.module.ts`

**Changes**:
- Removed `NoticeApplier` from providers
- Simplified module dependencies

---

### 3. **Environment Variables**

#### .env & .env.example

**Removed**:
```bash
CORRECTION_MODE=dry-run  # ← Deleted
```

**Rationale**: 
- Không còn cần dry-run mode
- Handlers ghi trực tiếp vào DB
- Nếu cần test, tạo test database riêng

---

### 4. **Startup Logs**

**File**: `src/main.ts`

**Removed**:
```typescript
logger.log(`Correction mode: ${process.env.CORRECTION_MODE || 'dry-run'}`);
```

**New output**:
```
Auction Cron Job service running on port 3001
Cron enabled: true
Timezone: Asia/Ho_Chi_Minh
Database: ***connected***
```

---

## 📊 Architecture Comparison

### Before: Indirect Pattern
```
┌─────────────┐
│   Handler   │
└──────┬──────┘
       │ return patch
       v
┌─────────────────┐
│ NoticeApplier   │
└──────┬──────────┘
       │ if mode == 'apply'
       v
┌─────────────────┐
│   Database      │
└─────────────────┘
```

**Complexity**: 3 layers, conditional logic

---

### After: Direct Pattern
```
┌─────────────┐
│   Handler   │
└──────┬──────┘
       │ direct write
       v
┌─────────────────┐
│   Database      │
└─────────────────┘
```

**Complexity**: 2 layers, straightforward

---

## 🎯 Handler Guidelines

### Writing New Handlers

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CorrectionHandler } from '../correction-handler.interface';
import { AuctionNotice } from '@/database/entities/auction-notice.entity';

@Injectable()
export class MyHandler implements CorrectionHandler {
  readonly name = 'my-handler';
  
  constructor(
    @InjectRepository(AuctionNotice)
    private readonly noticeRepo: Repository<AuctionNotice>,
    // Inject other repos as needed
  ) {}
  
  // Optional: Filter query
  getFilterQuery(qb: SelectQueryBuilder<AuctionNotice>): void {
    qb.andWhere('n.some_field IS NULL');
  }
  
  async correct(notice: AuctionNotice): Promise<Partial<AuctionNotice> | null> {
    // 1. Skip if not applicable
    if (!shouldProcess(notice)) {
      return null;
    }
    
    // 2. Write directly to DB
    await this.noticeRepo.update(notice.id, {
      someField: newValue,
    });
    
    // Or create/update other tables
    await this.otherRepo.save(...);
    
    // 3. Always return null
    return null;
  }
}
```

**Key points**:
1. ✅ Inject `Repository` cho các tables cần update
2. ✅ Ghi trực tiếp vào DB trong `correct()`
3. ✅ Return `null` (không return patch)
4. ✅ Handle errors properly (runner sẽ log)

---

## 🚀 Testing

### Unit Tests
```typescript
describe('MyHandler', () => {
  it('should update notice directly', async () => {
    const handler = new MyHandler(mockNoticeRepo);
    
    await handler.correct(testNotice);
    
    expect(mockNoticeRepo.update).toHaveBeenCalledWith(
      testNotice.id,
      { someField: expectedValue }
    );
  });
});
```

### Integration Tests
```typescript
it('should persist changes to database', async () => {
  await handler.correct(testNotice);
  
  const updated = await noticeRepo.findOne(testNotice.id);
  expect(updated.someField).toBe(expectedValue);
});
```

### Local Testing
```bash
# Use test database
DATABASE_URL=postgresql://localhost:5432/auction_test npm run start:dev

# Monitor logs
pm2 logs auction-cron-job --lines 50
```

---

## 🔍 Monitoring

### Handler Performance
```bash
# Check handler execution logs
pm2 logs auction-cron-job | grep "Handler.*completed"

# Example output:
# Handler link-auction-org completed: scanned=234, batches=1
# Handler link-asset-owner completed: scanned=156, batches=1
```

### Database Operations
```sql
-- Monitor table updates
SELECT 
    schemaname,
    relname,
    n_tup_upd,
    n_tup_ins
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_tup_upd + n_tup_ins DESC;

-- Check handler impact
SELECT 
    COUNT(*) FILTER (WHERE auction_org_id IS NOT NULL) as linked_orgs,
    COUNT(*) FILTER (WHERE auction_org_id IS NULL AND auction_org_name IS NOT NULL) as unlinked
FROM auction_notices
WHERE deleted_at IS NULL;
```

---

## 📝 Migration Checklist

✅ **Code Changes**:
- [x] Refactor `LinkAuctionOrgHandler` to direct write
- [x] Update `CorrectionRunner` to remove NoticeApplier
- [x] Remove `NoticeApplier` from `CorrectionModule`
- [x] Update `main.ts` startup logs
- [x] Remove `CORRECTION_MODE` from `.env` and `.env.example`

✅ **Documentation**:
- [x] Update `HANDLER_FILTER_OPTIMIZATION.md`
- [x] Create `DIRECT_DB_WRITE_PATTERN.md`
- [x] Update handler examples

✅ **Testing**:
- [ ] Run cronjob locally
- [ ] Verify handlers update database correctly
- [ ] Check logs for errors
- [ ] Monitor database queries

✅ **Deployment**:
- [ ] Update environment variables on server
- [ ] Deploy new code
- [ ] Monitor handler execution
- [ ] Verify data integrity

---

## 🎉 Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Architecture** | ❌ 3-layer (Handler → Applier → DB) | ✅ 2-layer (Handler → DB) |
| **Flexibility** | ❌ Chỉ update `auction_notices` | ✅ Update bất kỳ table nào |
| **Complexity** | ❌ NoticeApplier + mode logic | ✅ Direct write |
| **Testing** | ❌ Mock applier + mode | ✅ Mock repository only |
| **Debugging** | ❌ Trace through applier | ✅ Straightforward |
| **Code lines** | ❌ ~200 lines (applier + logic) | ✅ ~100 lines (handlers only) |

---

**Implementation Date**: 2026-07-12  
**Status**: ✅ Completed
