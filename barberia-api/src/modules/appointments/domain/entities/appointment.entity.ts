import { InvalidAppointmentError } from '../errors/invalid-appointment.error.js';
import type { AppointmentStatus } from './appointment-status.js';

export interface AppointmentProps {
  id: number;
  client: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  status: AppointmentStatus;
}

export class Appointment {
  private constructor(private readonly props: AppointmentProps) {}

  static create(props: Omit<AppointmentProps, 'status'>): Appointment {
    if (!props.client.trim()) {
      throw new InvalidAppointmentError('Client name is required');
    }
    if (!props.service.trim()) {
      throw new InvalidAppointmentError('Service is required');
    }
    return new Appointment({ ...props, status: 'pending' });
  }

  static restore(props: AppointmentProps): Appointment {
    return new Appointment(props);
  }

  get id(): number { return this.props.id; }
  get client(): string { return this.props.client; }
  get service(): string { return this.props.service; }
  get barber(): string { return this.props.barber; }
  get date(): string { return this.props.date; }
  get time(): string { return this.props.time; }
  get status(): AppointmentStatus { return this.props.status; }
}
