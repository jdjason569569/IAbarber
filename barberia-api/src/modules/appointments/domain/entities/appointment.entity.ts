import { InvalidAppointmentError } from '../errors/invalid-appointment.error.js';
import type { AppointmentStatus } from './appointment-status.js';

export interface AppointmentExtra {
  name: string;
  price: number;
}

export interface AppointmentProps {
  id: number;
  client: string;
  service: string;
  date: string;
  time: string;
  serviceCost: number;
  extras: AppointmentExtra[];
  status: AppointmentStatus;
}

/** Id assigned to an appointment that has not been persisted yet. */
export const UNSAVED_APPOINTMENT_ID = 0;

/** True for real calendar dates in `YYYY-MM-DD` format (rejects 2026-02-30). */
function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

export class Appointment {
  private constructor(private readonly props: AppointmentProps) {}

  static create(props: Omit<AppointmentProps, 'id' | 'status'>): Appointment {
    if (!props.client.trim()) {
      throw new InvalidAppointmentError('Client name is required');
    }
    if (!props.service.trim()) {
      throw new InvalidAppointmentError('Service is required');
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
    return new Appointment({ ...props, id: UNSAVED_APPOINTMENT_ID, status: 'pending' });
  }

  static restore(props: AppointmentProps): Appointment {
    return new Appointment(props);
  }

  withStatus(status: AppointmentStatus): Appointment {
    return new Appointment({ ...this.props, status });
  }

  get id(): number { return this.props.id; }
  get client(): string { return this.props.client; }
  get service(): string { return this.props.service; }
  get date(): string { return this.props.date; }
  get time(): string { return this.props.time; }
  get serviceCost(): number { return this.props.serviceCost; }
  get extras(): AppointmentExtra[] { return this.props.extras; }
  get status(): AppointmentStatus { return this.props.status; }

  get isActive(): boolean { return this.props.status !== 'cancelled'; }
}
