/** Opening hours of one weekday. Whole hours; `closeHour` 24 means midnight. */
export interface DayHours {
  /** 0 = Sunday ... 6 = Saturday (same as `Date.getDay()`). */
  weekday: number;
  open: boolean;
  openHour: number;
  closeHour: number;
}
