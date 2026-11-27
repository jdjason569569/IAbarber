import { APPOINTMENT_MINUTES, toMinutes } from '../../../shared/utils/time.util';
import { toLocalIsoDate } from '../../../shared/utils/date.util';
import { Appointment } from '../models/appointment.model';

/** Today's appointments that already ended and are still active (neither completed nor cancelled), by time. */
export function overdueToday(appointments: Appointment[], now: Date = new Date()): Appointment[] {
  const today = toLocalIsoDate(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return appointments
    .filter((a) => a.date === today && !a.cancelled && !a.completed)
    .filter((a) => toMinutes(a.time) + APPOINTMENT_MINUTES <= nowMinutes)
    .sort((a, b) => a.time.localeCompare(b.time));
}
