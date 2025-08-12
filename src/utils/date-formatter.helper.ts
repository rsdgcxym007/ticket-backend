/**
 * Date formatting utilities for handling various date formats safely
 */
export class DateFormatterHelper {
  /**
   * Safe date formatting - handles DD/MM/YYYY format and converts to YYYY-MM-DD
   */
  static formatDateSafely(dateValue: any): string {
    if (!dateValue) return '-';

    try {
      // ถ้าเป็น string ที่มีรูปแบบ DD/MM/YYYY
      if (typeof dateValue === 'string' && dateValue.includes('/')) {
        const parts = dateValue.split('/');
        if (parts.length === 3) {
          // แปลงจาก DD/MM/YYYY เป็น YYYY-MM-DD
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          const isoString = `${year}-${month}-${day}`;

          // ตรวจสอบว่าวันที่ถูกต้อง
          const date = new Date(isoString);
          if (!isNaN(date.getTime())) {
            return isoString;
          }
        }
      }

      // ลองแปลงแบบปกติ
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }

      return '-';
    } catch (error) {
      console.error('Date formatting error:', error, 'Value:', dateValue);
      return '-';
    }
  }

  /**
   * Safe date-time formatting - returns ISO string
   */
  static formatDateTimeSafely(dateValue: any): string {
    if (!dateValue) return '-';

    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
      return '-';
    } catch (error) {
      console.error('DateTime formatting error:', error, 'Value:', dateValue);
      return '-';
    }
  }

  /**
   * Convert DD/MM/YYYY to Date object safely
   */
  static parseDDMMYYYY(dateString: string): Date | null {
    if (!dateString || typeof dateString !== 'string') return null;

    try {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);

        const date = new Date(year, month, day);

        // ตรวจสอบว่าวันที่ถูกต้อง
        if (
          date.getFullYear() === year &&
          date.getMonth() === month &&
          date.getDate() === day
        ) {
          return date;
        }
      }
      return null;
    } catch (error) {
      console.error('Error parsing DD/MM/YYYY:', error, 'Value:', dateString);
      return null;
    }
  }

  /**
   * Format date to Thai format (DD/MM/YYYY)
   */
  static formatToThaiDate(date: Date | string): string {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (!dateObj || isNaN(dateObj.getTime())) return '-';

      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear();

      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Error formatting to Thai date:', error, 'Value:', date);
      return '-';
    }
  }
}
