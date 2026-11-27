/** Every 3 hours after opening the barber is asked about appointments left open. */
export const CHECK_EVERY_MINUTES = 3 * 60;
/** And once more this long before closing, so the day ends with every appointment closed. */
export const BEFORE_CLOSE_MINUTES = 30;
/** A regular check this close to the closing one is skipped: two alerts in a row would be noise. */
const MIN_GAP_MINUTES = 90;
/** A check is only sent this long after its time: a late start (deploy, sleep) does not alert old ones. */
export const SEND_WINDOW_MINUTES = 15;

/**
 * Minutes after midnight when the barber is asked about appointments that already ended and are
 * still active: every 3 hours from opening and 30 minutes before closing. Opening hours are whole
 * hours; `closeHour` 24 is midnight.
 */
export function overdueCheckpoints(openHour: number, closeHour: number): number[] {
  const open = openHour * 60;
  const last = closeHour * 60 - BEFORE_CLOSE_MINUTES;
  if (last <= open) return [];
  const checkpoints: number[] = [];
  for (let at = open + CHECK_EVERY_MINUTES; at <= last - MIN_GAP_MINUTES; at += CHECK_EVERY_MINUTES) {
    checkpoints.push(at);
  }
  checkpoints.push(last);
  return checkpoints;
}

/** The checkpoint due at `nowMinutes` (within its send window), or undefined. */
export function dueCheckpoint(checkpoints: number[], nowMinutes: number): number | undefined {
  return checkpoints.find((at) => nowMinutes >= at && nowMinutes < at + SEND_WINDOW_MINUTES);
}
