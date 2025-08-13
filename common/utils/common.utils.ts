// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CommonUtils {
  public static dateYYYYMMDDInIndianTimeZoneHandler(): string {
    const [dd, mm, yy] = this.getDateInIndianTimeZoneHandler().split('/');
    return [2000 + +yy + '', mm, dd].join('-');
  }

  public static formatTimestampToIndianTimeZone(
    timestamp: string | number | Date,
  ): string {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid timestamp provided');
    }

    // Convert to Indian Time by adding 5h30m (19800 seconds)
    const indianTimeMs = date.getTime() + 5.5 * 60 * 60 * 1000;
    const indianDate = new Date(indianTimeMs);

    // Format date and time parts manually with zero-padding
    const year = indianDate.getUTCFullYear();
    const month = String(indianDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(indianDate.getUTCDate()).padStart(2, '0');
    const hours = String(indianDate.getUTCHours()).padStart(2, '0');
    const minutes = String(indianDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(indianDate.getUTCSeconds()).padStart(2, '0');

    // Get milliseconds and pad to 3 digits
    const milliseconds = String(indianDate.getUTCMilliseconds()).padStart(
      3,
      '0',
    );

    // Construct final string in xsd:dateTime format with Indian timezone offset
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}+05:30`;
  }

  public static getDateInIndianTimeZoneHandler(): string {
    return this.getDateTimeInIndianTimeZoneHandler().split(', ')[0];
  }

  public static getDateTimeInIndianTimeZoneHandler() {
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
      minute: '2-digit',
      month: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Kolkata',
      timeZoneName: 'short',
      year: '2-digit',
    };
    return new Intl.DateTimeFormat('en-IN', options).format(new Date());
  }
}
