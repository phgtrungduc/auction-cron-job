# Cronjob TypeScript Errors Fix

## Lỗi gặp phải

### 1. `mode` does not exist in type 'RunOptions' (2 lỗi)
**File**: `src/cli.ts` (lines 58, 80)

**Nguyên nhân**: Sau khi remove dry-run mode và `CORRECTION_MODE`, các tham chiếu đến `mode` trong CLI vẫn còn.

**Fix**:
- Xóa `mode` variable và logic
- Xóa `mode` parameter khỏi `runner.runAll()` calls
- Update usage documentation (xóa `--dry-run` flag)

```typescript
// OLD
const mode = getArg(args, '--dry-run') !== null ? 'dry-run' : 'apply';
const result = await runner.runAll({
  mode: mode as any,
  ...
});

// NEW
const result = await runner.runAll({
  ...
});
```

### 2. Type incompatibility in parent-detector.service.ts (line 85)
**File**: `src/correction/asset-owner/parent-detector.service.ts`

**Nguyên nhân**: TypeORM's `FindOptionsWhere` không chấp nhận `null` trực tiếp cho properties. Khi `entity.orgType` là `null`, TypeScript báo lỗi type mismatch.

**Fix**: Build where clause conditionally, chỉ add `orgType` filter nếu giá trị không phải `null`.

```typescript
// OLD
const parent = await this.entityRepo.findOne({
  where: {
    normalizedName: normalizedParentName,
    orgType: entity.orgType, // ❌ Type error khi orgType = null
    parentId: null,
  },
});

// NEW
const whereClause: any = {
  normalizedName: normalizedParentName,
  parentId: null,
};

if (entity.orgType !== null) {
  whereClause.orgType = entity.orgType;
}

const parent = await this.entityRepo.findOne({
  where: whereClause,
  select: ['id', 'displayName'],
});
```

## Files đã sửa

1. **`src/cli.ts`**:
   - Removed `mode` logic from `handleScan()`
   - Removed `mode` logic from `handleRun()`
   - Updated usage documentation

2. **`src/correction/asset-owner/parent-detector.service.ts`**:
   - Changed `where` clause to conditional build
   - Only add `orgType` filter when value is not null

## Build Status
✅ **Build succeeded** - No TypeScript errors

## Impact
- CLI commands không còn `--dry-run` flag (đã remove theo user request)
- Parent detection hoạt động đúng với entities có `orgType = null`
- Cronjob sẵn sàng để test và deploy

## Testing Commands
```bash
# Test scan full
npm run correction:scan

# Test scan specific notice
npm run correction:scan -- --notice-id=123

# Test specific handler
npm run correction:run -- --handler=link-asset-owner
```
