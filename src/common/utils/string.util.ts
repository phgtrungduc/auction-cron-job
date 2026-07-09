/**
 * String manipulation utilities
 */

/**
 * Truncate string với ellipsis.
 *
 * @example
 * truncate('Hello World', 8)  // 'Hello...'
 * truncate('Hi', 10)          // 'Hi'
 */
export function truncate(str: string, maxLength: number, ellipsis: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Capitalize first letter.
 *
 * @example
 * capitalize('hello')  // 'Hello'
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Slugify string (URL-friendly).
 *
 * @example
 * slugify('Hello World!')  // 'hello-world'
 * slugify('Đấu giá tài sản')  // 'dau-gia-tai-san'
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Mask sensitive data.
 *
 * @example
 * maskString('1234567890', 4, 2)  // '1234****90'
 * maskString('email@example.com', 3, 10) // 'ema**********om'
 */
export function maskString(
  str: string,
  visibleStart: number = 4,
  visibleEnd: number = 4,
  maskChar: string = '*',
): string {
  if (str.length <= visibleStart + visibleEnd) {
    return str;
  }

  const start = str.slice(0, visibleStart);
  const end = str.slice(-visibleEnd);
  const maskLength = str.length - visibleStart - visibleEnd;
  const mask = maskChar.repeat(maskLength);

  return `${start}${mask}${end}`;
}

/**
 * Remove null bytes and trim.
 */
export function sanitizeString(str: string | null | undefined): string | null {
  if (!str) return null;
  const cleaned = str.replace(/\0/g, '').replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Pluralize word based on count.
 *
 * @example
 * pluralize(1, 'notice')   // '1 notice'
 * pluralize(5, 'notice')   // '5 notices'
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : plural || `${singular}s`;
  return `${count} ${word}`;
}
