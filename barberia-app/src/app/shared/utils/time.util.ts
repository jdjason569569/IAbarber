/** Minutes a booking takes (half-hour slots: 13:00, 13:30...); must match the API. */
export const APPOINTMENT_MINUTES = 30;

/** Labels for the two halves of the day ("a. m." / "p. m."), taken from the message catalog. */
export interface MeridiemLabels {
  am: string;
  pm: string;
}

/** `HH:mm` (or `HH:mm:ss`) -> minutes since midnight. */
export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Minutes since midnight -> 12-hour clock without the meridiem: 780 -> "1:00", 0 -> "12:00". */
function clock12(minutes: number): string {
  const hour24 = Math.floor(minutes / 60) % 24;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minutes % 60).padStart(2, '0')}`;
}

function meridiem(minutes: number, labels: MeridiemLabels): string {
  return Math.floor(minutes / 60) % 24 < 12 ? labels.am : labels.pm;
}

/** `13:00` -> "1:00 p. m.". */
export function formatTime12(time: string, labels: MeridiemLabels): string {
  const minutes = toMinutes(time);
  return `${clock12(minutes)} ${meridiem(minutes, labels)}`;
}

/**
 * The half hour a booking takes, on the 12-hour clock: `13:00` -> "1:00 – 1:30 p. m.";
 * when it crosses noon or midnight both ends carry their meridiem: "11:30 a. m. – 12:00 p. m.".
 */
export function formatTimeRange(time: string, labels: MeridiemLabels, separator = ' – '): string {
  const start = toMinutes(time);
  const end = (start + APPOINTMENT_MINUTES) % (24 * 60);
  const startMeridiem = meridiem(start, labels);
  const endMeridiem = meridiem(end, labels);
  const from = startMeridiem === endMeridiem ? clock12(start) : `${clock12(start)} ${startMeridiem}`;
  return `${from}${separator}${clock12(end)} ${endMeridiem}`;
}
