# Ví dụ handler stub - chưa có logic sửa thật

Khi bạn có logic sửa thật, tạo file mới trong thư mục này:

## 📝 Tạo Handler Mới

### 1. Tạo file handler

```bash
# Tạo file: src/correction/handlers/fix-xxx.handler.ts
```

### 2. Template handler với logger & utils

```typescript
import { Injectable } from '@nestjs/common';
import { CorrectionHandler } from '../correction-handler.interface';
import { AuctionNotice } from '@/database/entities/auction-notice.entity';
import { createLogger } from '@/common/logger';
import { formatDate, formatVND, truncate } from '@/common/utils';

/**
 * Handler mô tả: Fix xxx trong auction notices.
 */
@Injectable()
export class FixXxxHandler implements CorrectionHandler {
  readonly name = 'fix-xxx';
  private readonly logger = createLogger('FixXxxHandler');

  async correct(notice: AuctionNotice): Promise<Partial<AuctionNotice> | null> {
    // 1. Log bắt đầu xử lý
    this.logger.log(`Processing notice ${notice.id}: ${truncate(notice.title, 50)}`);

    // 2. Log thông tin chi tiết (optional)
    if (notice.auctionDatetime) {
      this.logger.debug(`Auction date: ${formatDate(notice.auctionDatetime, 'datetime')}`);
    }

    // 3. Logic của bạn
    if (/* điều kiện */) {
      this.logger.log(`Applying fix for notice ${notice.id}`);
      return { fieldName: newValue };
    }

    // 4. Không sửa
    return null;
  }
}
```

### 3. Đăng ký trong module

```typescript
// src/correction/correction.module.ts
import { FixXxxHandler } from './handlers/fix-xxx.handler';

const HANDLERS = [
  FixXxxHandler,  // ← Thêm vào đây
];
```

### 4. Test với CLI

```bash
# Dry-run (không ghi DB)
npm run correction:run -- --handler=fix-xxx --dry-run

# Apply thật (ghi DB)
npm run correction:run -- --handler=fix-xxx
```

---

## 🔧 Best Practices

### ✅ Nên làm

```typescript
// 1. Luôn dùng logger thay vì console.log
private readonly logger = createLogger('YourHandler');
this.logger.log('Processing...');

// 2. Format date/currency khi log
logger.log(`Date: ${formatDate(date, 'datetime')}`);
logger.log(`Price: ${formatVND(price)}`);

// 3. Truncate long text
logger.log(`Title: ${truncate(notice.title, 50)}`);

// 4. Log với level phù hợp
logger.debug('Debug info');      // Chi tiết, development
logger.log('Info message');      // Thông tin thông thường
logger.warn('Warning');          // Cảnh báo
logger.error('Error', stack);    // Lỗi với stack trace

// 5. Return null nếu không sửa
if (noChangeNeeded) {
  return null;
}
```

### ❌ Không nên

```typescript
// 1. Không dùng console.log
console.log('Processing...');  // ❌

// 2. Không log password/token
logger.log(`Token: ${token}`);  // ❌
// Dùng maskString nếu cần log
logger.log(`Token: ${maskString(token, 4, 4)}`);  // ✅

// 3. Không throw error ra ngoài trừ khi nghiêm trọng
throw new Error('...');  // ❌ Runner sẽ catch và skip notice này
// Nên log error và return null
logger.error('Failed to process', error.stack);
return null;  // ✅
```

---

## 📚 Common Utilities

Import từ `@/common/utils`:

### Date formatting
```typescript
formatDate(date, 'full')       // '09/07/2026 09:30:45'
formatDate(date, 'date')       // '09/07/2026'
formatDate(date, 'datetime')   // '09/07/2026 09:30'
formatDuration(65000)          // '1m 5s'
nowVN()                        // Current time VN timezone
```

### Currency formatting
```typescript
formatVND(1234567)             // '1.234.567 đ'
formatCurrency(1234567)        // '1.234.567'
formatNumber(1234)             // '1.234'
parseCurrency('1.234.567')     // 1234567
```

### String utilities
```typescript
truncate('Long text...', 20)   // 'Long text...'
slugify('Đấu giá')             // 'dau-gia'
maskString('secret', 2, 2)     // 'se****et'
capitalize('hello')            // 'Hello'
```

📖 **Chi tiết:** Xem [COMMON_UTILS.md](../../COMMON_UTILS.md)

---

## 🎯 Example Handler

Xem `example.handler.ts` trong folder này để biết cách dùng đầy đủ logger và utilities.

---

## 🔗 Tham khảo

- **correction-handler.interface.ts** - Interface definition
- **COMMON_UTILS.md** - API reference cho logger & utils
- **STRUCTURE.md** - Cấu trúc project
- **README.md** - Tài liệu tổng quan
