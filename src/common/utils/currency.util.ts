/**
 * Currency formatting utilities - VND format
 */

/**
 * Format số tiền VND với dấu chấm ngăn cách mỗi 3 chữ số.
 *
 * @param amount - Số tiền (number hoặc string)
 * @param options - Tùy chọn format
 * @returns Formatted string
 *
 * @example
 * formatCurrency(1000000)                    // '1.000.000'
 * formatCurrency(1234567)                    // '1.234.567'
 * formatCurrency(1234567, { suffix: ' đ' })  // '1.234.567 đ'
 * formatCurrency(1234567.89, { decimals: 2 }) // '1.234.567,89'
 */
export function formatCurrency(
  amount: number | string,
  options: {
    decimals?: number;
    suffix?: string;
    prefix?: string;
  } = {},
): string {
  const { decimals = 0, suffix = '', prefix = '' } = options;

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) {
    return 'Invalid Number';
  }

  // Làm tròn theo số chữ số thập phân
  const rounded = decimals > 0 ? num.toFixed(decimals) : Math.round(num).toString();

  // Tách phần nguyên và phần thập phân
  const [integerPart, decimalPart] = rounded.split('.');

  // Format phần nguyên: ngăn cách mỗi 3 chữ số bằng dấu chấm
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // Ghép lại với dấu phẩy cho phần thập phân (nếu có)
  let result = formattedInteger;
  if (decimalPart) {
    result += ',' + decimalPart;
  }

  return `${prefix}${result}${suffix}`;
}

/**
 * Format VND với suffix 'đ' mặc định.
 *
 * @example
 * formatVND(1000000)    // '1.000.000 đ'
 * formatVND(1234567)    // '1.234.567 đ'
 */
export function formatVND(amount: number | string): string {
  return formatCurrency(amount, { suffix: ' đ' });
}

/**
 * Parse string formatted currency về number.
 *
 * @example
 * parseCurrency('1.000.000')      // 1000000
 * parseCurrency('1.234.567 đ')    // 1234567
 * parseCurrency('1.234.567,89')   // 1234567.89
 */
export function parseCurrency(formatted: string): number {
  // Loại bỏ suffix, prefix, spaces
  let cleaned = formatted.trim().replace(/[^\d,.-]/g, '');

  // Chuyển dấu phẩy thành dấu chấm (decimal separator)
  cleaned = cleaned.replace(/\./g, '').replace(',', '.');

  return parseFloat(cleaned) || 0;
}

/**
 * Format số với đơn vị rút gọn (K, M, B).
 *
 * @example
 * formatCompact(1000)       // '1K'
 * formatCompact(1000000)    // '1M'
 * formatCompact(1500000)    // '1.5M'
 * formatCompact(1234567890) // '1.23B'
 */
export function formatCompact(amount: number, decimals: number = 2): string {
  if (amount < 1000) return amount.toString();

  const units = [
    { value: 1e9, symbol: 'B' }, // Billion
    { value: 1e6, symbol: 'M' }, // Million
    { value: 1e3, symbol: 'K' }, // Thousand
  ];

  for (const unit of units) {
    if (amount >= unit.value) {
      const formatted = (amount / unit.value).toFixed(decimals);
      return `${formatted}${unit.symbol}`;
    }
  }

  return amount.toString();
}

/**
 * Format percentage.
 *
 * @example
 * formatPercent(0.1234)           // '12.34%'
 * formatPercent(0.5)              // '50.00%'
 * formatPercent(0.5, { decimals: 0 }) // '50%'
 */
export function formatPercent(value: number, options: { decimals?: number } = {}): string {
  const { decimals = 2 } = options;
  const percent = (value * 100).toFixed(decimals);
  return `${percent}%`;
}

/**
 * Format number thông thường (không phải tiền).
 *
 * @example
 * formatNumber(1234567)    // '1.234.567'
 * formatNumber(1234.5678, { decimals: 2 }) // '1.234,57'
 */
export function formatNumber(num: number | string, options: { decimals?: number } = {}): string {
  return formatCurrency(num, options);
}
