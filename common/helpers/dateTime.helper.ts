export {
  addDays as addDaysToDate,
  subDays as subtractDaysFromDate,
} from 'date-fns';
import { format } from 'date-fns';

type DateFormat = 'ddmmyyyy';

export const convertEpochToUTCString = (epoch: number) => {
  return new Date(epoch * 1000).toUTCString();
};

export const convertEpochToDateTime = (epoch: number) => {
  return new Date(epoch * 1000);
};

export const convertDateToEpoch = (date: Date): number => {
  return date.getTime();
};

export const getDateIST = (date: Date): Date => {
  // Create a new Date object to avoid modifying the original
  // Validate input
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }
  const inputDate = new Date(date);

  // Convert to UTC time first by adding the local timezone offset
  const utcTime =
    inputDate.getTime() + inputDate.getTimezoneOffset() * 60 * 1000;

  // Add IST offset (UTC+5:30 = 5.5 hours in milliseconds)
  const istOffset = 5.5 * 60 * 60 * 1000;

  // Return new date with IST time
  return new Date(utcTime + istOffset);
};

export const formatDate = (date: Date, dateFormat: DateFormat): string => {
  switch (dateFormat) {
    case 'ddmmyyyy':
      return format(date, 'ddMMyyyy');
    default:
      throw new Error('Invalid date format');
  }
};

export const convertDurationToHoursAndMinutes = (duration: number): string => {
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);

  // Don't show hours if it's 0 hours
  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
};
