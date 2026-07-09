# Common Utilities Documentation

## 📁 Cấu Trúc

```
src/common/
├── logger/
│   ├── app.logger.ts      # Custom logger với VN timezone
│   └── index.ts
├── utils/
│   ├── date.util.ts       # Date/time formatting
│   ├── currency.util.ts   # Currency/number formatting
│   ├── string.util.ts     # String manipulation
│   └── index.ts
└── index.ts
```

---

## 📅 Date Utils (`date.util.ts`)

### `formatDate(date, format)`

Format date theo các pattern phổ biến (VN timezone).

```typescript
import { formatDate } from '@/common/utils';

formatDate(new Date(), 'full');      // '09/07/2026 09:30:45'
formatDate(new Date(), 'date');      // '09/07/2026'
formatDate(new Date(), 'time');      // '09:30:45'
formatDate(new Date(), 'datetime');  // '09/07/2026 09:30'
formatDate(new Date(), 'iso');       // '2026-07-09T02:30:45.123Z'
```

### `formatDateCustom(date, pattern)`

Format date theo custom pattern.

```typescript
formatDateCustom(new Date(), 'dd/MM/yyyy');           // '09/07/2026'
formatDateCustom(new Date(), 'yyyy-MM-dd HH:mm');     // '2026-07-09 09:30'
formatDateCustom(new Date(), 'dd/MM/yyyy HH:mm:ss');  // '09/07/2026 09:30:45'
```

### `nowVN()` / `startOfDayVN()` / `endOfDayVN()`

Get current time / start / end of day trong VN timezone.

```typescript
const now = nowVN();                    // Current time VN
const start = startOfDayVN();           // Hôm nay 00:00:00
const end = endOfDayVN();               // Hôm nay 23:59:59
const startTomorrow = startOfDayVN(new Date('2026-07-10'));
```

### `formatDuration(ms)`

Format milliseconds thành human readable.

```typescript
formatDuration(1000);        // '1s'
formatDuration(65000);       // '1m 5s'
formatDuration(3665000);     // '1h 1m 5s'
```

---

## 💰 Currency Utils (`currency.util.ts`)

### `formatCurrency(amount, options?)`

Format số tiền VND với dấu chấm ngăn cách.

```typescript
import { formatCurrency, formatVND } from '@/common/utils';

formatCurrency(1000000);                    // '1.000.000'
formatCurrency(1234567);                    // '1.234.567'
formatCurrency(1234567, { suffix: ' đ' });  // '1.234.567 đ'
formatCurrency(1234567.89, { decimals: 2 }); // '1.234.567,89'
formatCurrency(1000000, { prefix: 'VND ' }); // 'VND 1.000.000'
```

### `formatVND(amount)`

Shorthand cho format VND với suffix 'đ'.

```typescript
formatVND(1000000);    // '1.000.000 đ'
formatVND(1234567);    // '1.234.567 đ'
```

### `parseCurrency(formatted)`

Parse string về number.

```typescript
parseCurrency('1.000.000');      // 1000000
parseCurrency('1.234.567 đ');    // 1234567
parseCurrency('1.234.567,89');   // 1234567.89
```

### `formatCompact(amount, decimals?)`

Format số với đơn vị rút gọn.

```typescript
formatCompact(1000);       // '1K'
formatCompact(1000000);    // '1M'
formatCompact(1500000);    // '1.5M'
formatCompact(1234567890); // '1.23B'
```

### `formatPercent(value, options?)`

Format percentage.

```typescript
formatPercent(0.1234);           // '12.34%'
formatPercent(0.5);              // '50.00%'
formatPercent(0.5, { decimals: 0 }); // '50%'
```

### `formatNumber(num, options?)`

Format number thông thường (không phải tiền).

```typescript
formatNumber(1234567);    // '1.234.567'
formatNumber(1234.5678, { decimals: 2 }); // '1.234,57'
```

---

## 📝 String Utils (`string.util.ts`)

### `truncate(str, maxLength, ellipsis?)`

Cắt ngắn string.

```typescript
import { truncate, capitalize, slugify } from '@/common/utils';

truncate('Hello World', 8);  // 'Hello...'
truncate('Hi', 10);          // 'Hi'
```

### `capitalize(str)`

Viết hoa chữ cái đầu.

```typescript
capitalize('hello');  // 'Hello'
```

### `slugify(str)`

Chuyển thành URL-friendly slug.

```typescript
slugify('Hello World!');      // 'hello-world'
slugify('Đấu giá tài sản');   // 'dau-gia-tai-san'
```

### `maskString(str, visibleStart, visibleEnd, maskChar?)`

Mask dữ liệu nhạy cảm.

```typescript
maskString('1234567890', 4, 2);  // '1234****90'
maskString('email@example.com', 3, 10); // 'ema**********om'
```

### `sanitizeString(str)`

Remove null bytes và trim.

```typescript
sanitizeString('  Hello\0World\n  ');  // 'Hello World'
sanitizeString(null);                  // null
```

### `pluralize(count, singular, plural?)`

Pluralize word.

```typescript
pluralize(1, 'notice');   // '1 notice'
pluralize(5, 'notice');   // '5 notices'
```

---

## 📊 Logger (`app.logger.ts`)

Custom logger với format đẹp, VN timezone, color coding.

### Sử dụng trong class

```typescript
import { Injectable } from '@nestjs/common';
import { createLogger } from '@/common/logger';

@Injectable()
export class NoticeScanner {
  private readonly logger = createLogger('NoticeScanner');

  async scan() {
    this.logger.log('Starting scan...');
    this.logger.debug('Debug info', { batchSize: 500 });
    this.logger.warn('Warning message');
    this.logger.error('Error occurred', error.stack);
  }
}
```

### Log levels

```typescript
logger.verbose('Verbose message');  // Cyan - chi tiết nhất
logger.debug('Debug message');      // Blue - debug info
logger.log('Info message');         // Green - info thông thường
logger.warn('Warning message');     // Yellow - cảnh báo
logger.error('Error message', stack); // Red - lỗi
```

### Output format

```
[09/07/2026 09:30:45] [LOG    ] [NoticeScanner] Starting scan...
[09/07/2026 09:30:46] [DEBUG  ] [NoticeScanner] { batchSize: 500 }
[09/07/2026 09:30:47] [WARN   ] [NoticeScanner] Warning message
[09/07/2026 09:30:48] [ERROR  ] [NoticeScanner] Error message
Error stack trace...
```

---

## 🎯 Ví Dụ Thực Tế

### 1. Format log trong handler

```typescript
import { formatDate, formatCurrency, formatDuration } from '@/common/utils';
import { createLogger } from '@/common/logger';

export class FixStatusHandler implements CorrectionHandler {
  private readonly logger = createLogger('FixStatusHandler');

  async correct(notice: AuctionNotice) {
    const auctionDate = formatDate(notice.auctionDatetime, 'datetime');
    const startingPrice = formatVND(notice.startingPrice);
    
    this.logger.log(
      `Processing notice ${notice.id}: ${notice.title} ` +
      `(${auctionDate}, ${startingPrice})`
    );
    
    // ... logic
  }
}
```

### 2. Log thống kê scan

```typescript
import { formatNumber, formatDuration } from '@/common/utils';
import { createLogger } from '@/common/logger';

export class CorrectionRunner {
  private readonly logger = createLogger('CorrectionRunner');

  async runAll() {
    const startTime = Date.now();
    let scanned = 0;
    
    // ... scan logic
    
    const duration = Date.now() - startTime;
    this.logger.log(
      `Scan completed: ${formatNumber(scanned)} notices ` +
      `in ${formatDuration(duration)}`
    );
  }
}
```

### 3. Mask sensitive data trong log

```typescript
import { maskString } from '@/common/utils';
import { createLogger } from '@/common/logger';

const logger = createLogger('DatabaseModule');

const dbUrl = process.env.DATABASE_URL;
const masked = maskString(dbUrl, 10, 10);

logger.log(`Connecting to: ${masked}`);
// Output: postgresql:********************:5432/db
```

---

## 🚀 Import Paths

Đã config alias `@/` trong `tsconfig.json`:

```typescript
// ✅ Cách 1: Import từ common root
import { formatDate, formatVND, createLogger } from '@/common';

// ✅ Cách 2: Import từ file cụ thể
import { formatDate } from '@/common/utils/date.util';
import { formatVND } from '@/common/utils/currency.util';
import { createLogger } from '@/common/logger';
```

---

## 📝 Testing

### Test date formatting

```typescript
import { formatDate, formatDateCustom } from '@/common/utils';

describe('Date Utils', () => {
  it('should format date correctly', () => {
    const date = new Date('2026-07-09T02:30:45Z');
    expect(formatDate(date, 'date')).toBe('09/07/2026');
    expect(formatDateCustom(date, 'yyyy-MM-dd')).toBe('2026-07-09');
  });
});
```

### Test currency formatting

```typescript
import { formatCurrency, parseCurrency } from '@/common/utils';

describe('Currency Utils', () => {
  it('should format and parse currency', () => {
    expect(formatCurrency(1234567)).toBe('1.234.567');
    expect(parseCurrency('1.234.567')).toBe(1234567);
  });
});
```

---

## 📌 Best Practices

1. **Luôn dùng logger thay vì `console.log`:**
   ```typescript
   // ❌ Không
   console.log('Starting...');
   
   // ✅ Nên
   logger.log('Starting...');
   ```

2. **Format date/currency khi log:**
   ```typescript
   // ❌ Không
   logger.log(`Price: ${notice.price}`);
   
   // ✅ Nên
   logger.log(`Price: ${formatVND(notice.price)}`);
   ```

3. **Mask sensitive data:**
   ```typescript
   // ❌ Không
   logger.log(`DB: ${process.env.DATABASE_URL}`);
   
   // ✅ Nên
   logger.log(`DB: ${maskString(process.env.DATABASE_URL, 10, 10)}`);
   ```

4. **Dùng context rõ ràng:**
   ```typescript
   // ✅ Tốt - biết ngay log từ đâu
   const logger = createLogger('NoticeScanner');
   const logger2 = createLogger('FixStatusHandler');
   ```
