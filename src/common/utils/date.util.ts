/**
 * Date/Time utilities - Vietnam timezone aware
 */

const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Format date theo các pattern phổ biến.
 *
 * @param date - Date object hoặc ISO string
 * @param format - 'full' | 'date' | 'time' | 'datetime' | 'iso'
 * @returns Formatted string
 *
 * @example
 * formatDate(new Date(), 'full')      // '09/07/2026 09:30:45'
 * formatDate(new Date(), 'date')      // '09/07/2026'
 * formatDate(new Date(), 'time')      // '09:30:45'
 * formatDate(new Date(), 'datetime')  // '09/07/2026 09:30'
 */
export function formatDate(
  date: Date | string,
  format: 'full' | 'date' | 'time' | 'datetime' | 'iso' = 'full',
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  // Convert to Vietnam timezone
  const vnDate = new Date(d.toLocaleString('en-US', { timeZone: VN_TIMEZONE }));

  const day = String(vnDate.getDate()).padStart(2, '0');
  const month = String(vnDate.getMonth() + 1).padStart(2, '0');
  const year = vnDate.getFullYear();
  const hours = String(vnDate.getHours()).padStart(2, '0');
  const minutes = String(vnDate.getMinutes()).padStart(2, '0');
  const seconds = String(vnDate.getSeconds()).padStart(2, '0');

  switch (format) {
    case 'date':
      return `${day}/${month}/${year}`;
    case 'time':
      return `${hours}:${minutes}:${seconds}`;
    case 'datetime':
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    case 'full':
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    case 'iso':
      return d.toISOString();
    default:
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
}

/**
 * Format date theo custom pattern.
 *
 * @param date - Date object hoặc ISO string
 * @param pattern - Pattern string (dd/MM/yyyy HH:mm:ss)
 * @returns Formatted string
 *
 * @example
 * formatDateCustom(new Date(), 'dd/MM/yyyy')           // '09/07/2026'
 * formatDateCustom(new Date(), 'yyyy-MM-dd HH:mm')     // '2026-07-09 09:30'
 * formatDateCustom(new Date(), 'dd/MM/yyyy HH:mm:ss')  // '09/07/2026 09:30:45'
 */
export function formatDateCustom(date: Date | string, pattern: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }

  const vnDate = new Date(d.toLocaleString('en-US', { timeZone: VN_TIMEZONE }));

  const map: Record<string, string> = {
    yyyy: String(vnDate.getFullYear()),
    MM: String(vnDate.getMonth() + 1).padStart(2, '0'),
    dd: String(vnDate.getDate()).padStart(2, '0'),
    HH: String(vnDate.getHours()).padStart(2, '0'),
    mm: String(vnDate.getMinutes()).padStart(2, '0'),
    ss: String(vnDate.getSeconds()).padStart(2, '0'),
  };

  return pattern.replace(/yyyy|MM|dd|HH|mm|ss/g, (matched) => map[matched]);
}

/**
 * Get current date/time in Vietnam timezone.
 */
export function nowVN(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: VN_TIMEZONE }));
}

/**
 * Get start of day (00:00:00) in Vietnam timezone.
 */
export function startOfDayVN(date?: Date | string): Date {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : nowVN();
  const vnDate = new Date(d.toLocaleString('en-US', { timeZone: VN_TIMEZONE }));
  vnDate.setHours(0, 0, 0, 0);
  return vnDate;
}

/**
 * Get end of day (23:59:59) in Vietnam timezone.
 */
export function endOfDayVN(date?: Date | string): Date {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : nowVN();
  const vnDate = new Date(d.toLocaleString('en-US', { timeZone: VN_TIMEZONE }));
  vnDate.setHours(23, 59, 59, 999);
  return vnDate;
}

/**
 * Format duration (milliseconds) to human readable.
 *
 * @example
 * formatDuration(1000)        // '1s'
 * formatDuration(65000)       // '1m 5s'
 * formatDuration(3665000)     // '1h 1m 5s'
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
  if (seconds % 60 > 0) parts.push(`${seconds % 60}s`);

  return parts.length > 0 ? parts.join(' ') : '0s';
}
