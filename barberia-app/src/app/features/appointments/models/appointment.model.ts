import { AppointmentExtra } from './appointment-extra.model';

export interface Appointment {
  id: number;
  clientName: string;
  /** Appointment day, ISO format (YYYY-MM-DD). */
  date: string;
  /** Appointment time, 24h format (HH:mm). */
  time: string;
  service: string;
  /** Base price of the service. */
  serviceCost: number;
  /** Additional items charged on top of the service. */
  extras: AppointmentExtra[];
  /** true = cancelled, false = active. Cancelled appointments are kept, never deleted. */
  cancelled: boolean;
}
