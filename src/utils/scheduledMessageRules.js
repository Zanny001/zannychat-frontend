export const MAX_SCHEDULED_MESSAGE_LENGTH = 4000;
export const MIN_SCHEDULE_LEAD_MS = 60_000;
export const MAX_SCHEDULE_HORIZON_MS = 30 * 24 * 60 * 60 * 1000;

export function localDateTimeInput(date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new Error('Enter a valid local date and time.');
  }
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function hasValidCalendarDate(value) {
  // Date.parse accepts impossible dates such as February 30 by rolling them
  // into the following month. Date/time picker values use this ISO-like shape;
  // validate the calendar fields before relying on the platform parser.
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?)?$/.exec(value);
  if (!match) return true; // Preserve support for other Date.parse-compatible values.
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, zone] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = hourText === undefined ? 0 : Number(hourText);
  const minute = minuteText === undefined ? 0 : Number(minuteText);
  const second = secondText === undefined ? 0 : Number(secondText);
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysByMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > daysByMonth[month - 1]) return false;
  if (zone && zone !== 'Z') {
    const offset = /[+-](\d{2}):?(\d{2})$/.exec(zone);
    if (offset) {
      const offsetHours = Number(offset[1]);
      const offsetMinutes = Number(offset[2]);
      if (offsetMinutes > 59 || offsetHours > 14 || (offsetHours === 14 && offsetMinutes !== 0)) return false;
    }
  }
  return true;
}

export function normalizeScheduledDate(value, now = Date.now()) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Enter a valid local date and time.');
  const normalizedInput = value.trim();
  if (!hasValidCalendarDate(normalizedInput)) throw new Error('Enter a valid local date and time.');
  const timestamp = new Date(normalizedInput).getTime();
  const currentTime = Number(now);
  if (!Number.isFinite(timestamp) || !Number.isFinite(currentTime)) {
    throw new Error('Enter a valid local date and time.');
  }
  const delta = timestamp - currentTime;
  if (delta < MIN_SCHEDULE_LEAD_MS) throw new Error('Choose a time at least one minute from now.');
  if (delta > MAX_SCHEDULE_HORIZON_MS) throw new Error('Messages can be scheduled up to 30 days ahead.');
  return new Date(timestamp).toISOString();
}

export function validateScheduledMessageText(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Write the message you want to send later.');
  if (value.trim().length > MAX_SCHEDULED_MESSAGE_LENGTH) throw new Error('Message text must be 4,000 characters or fewer.');
  return value.trim();
}
