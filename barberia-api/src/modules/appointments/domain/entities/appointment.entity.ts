import { InvalidAppointmentError } from '../errors/invalid-appointment.error.js';

export interface AppointmentExtra {
  name: string;
  price: number;
}

export interface AppointmentProps {
  id: number;
  client: string;
  date: string;
  time: string;
  serviceCost: number;
  extras: AppointmentExtra[];
  /** true = cancelled, false = active. Cancelled appointments are kept, never deleted. */
  cancelled: boolean;
  /** true = client served without a booking (walk-in); it does not hold a slot of the agenda. */
  walkIn: boolean;
  /** true = the barber confirmed the service was done. Only active appointments can be completed. */
  completed: boolean;
}

/** Id assigned to an appointment that has not been persisted yet. */
export const UNSAVED_APPOINTMENT_ID = 0;

/** Minutes a booked appointment takes in the agenda (slots are one hour). */
export const APPOINTMENT_MINUTES = 60;

/** `HH:mm` -> minutes since midnight. */
export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Minutes since midnight -> `HH:mm`. */
export function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** True for real calendar dates in `YYYY-MM-DD` format (rejects 2026-02-30). */
function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

export class Appointment {
  private constructor(private readonly props: AppointmentProps) {}

  static create(props: Omit<AppointmentProps, 'id' | 'cancelled' | 'walkIn' | 'completed'> & { walkIn?: boolean }): Appointment {
    if (!props.client.trim()) {
      throw new InvalidAppointmentError('Client name is required');
    }
    if (props.serviceCost < 0) {
      throw new InvalidAppointmentError('Service cost cannot be negative');
    }
    if (!isValidDate(props.date)) {
      throw new InvalidAppointmentError(`Invalid date: ${props.date}`);
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(props.time)) {
      throw new InvalidAppointmentError(`Invalid time: ${props.time}`);
    }
    return new Appointment({ ...props, id: UNSAVED_APPOINTMENT_ID, cancelled: false, walkIn: props.walkIn ?? false, completed: false });
  }

  static restore(props: AppointmentProps): Appointment {
    return new Appointment(props);
  }

  /** Fixes the client name or the price (the barber may have said them wrong). */
  withDetails(client: string, serviceCost: number): Appointment {
    if (!client.trim()) {
      throw new InvalidAppointmentError('Client name is required');
    }
    if (!Number.isFinite(serviceCost) || serviceCost < 0) {
      throw new InvalidAppointmentError('Service cost cannot be negative');
    }
    return new Appointment({ ...this.props, client: client.trim(), serviceCost });
  }

  withCancelled(cancelled: boolean): Appointment {
    if (cancelled && this.props.completed) {
      throw new InvalidAppointmentError('A completed appointment cannot be cancelled');
    }
    return new Appointment({ ...this.props, cancelled });
  }

  withCompleted(completed: boolean): Appointment {
    if (completed && this.props.cancelled) {
      throw new InvalidAppointmentError('A cancelled appointment cannot be completed');
    }
    return new Appointment({ ...this.props, completed });
  }

  withTime(time: string): Appointment {
    return new Appointment({ ...this.props, time });
  }

  get id(): number { return this.props.id; }
  get client(): string { return this.props.client; }
  get date(): string { return this.props.date; }
  get time(): string { return this.props.time; }
  get serviceCost(): number { return this.props.serviceCost; }
  get extras(): AppointmentExtra[] { return this.props.extras; }
  get cancelled(): boolean { return this.props.cancelled; }
  get walkIn(): boolean { return this.props.walkIn; }
  get completed(): boolean { return this.props.completed; }

  get isActive(): boolean { return !this.props.cancelled; }

  /** True when both are active bookings (not walk-ins) of the same day less than one slot apart. */
  clashesWith(other: Appointment): boolean {
    return (
      this.isActive && other.isActive && !this.walkIn && !other.walkIn &&
      this.date === other.date &&
      Math.abs(toMinutes(this.time) - toMinutes(other.time)) < APPOINTMENT_MINUTES
    );
  }
}
