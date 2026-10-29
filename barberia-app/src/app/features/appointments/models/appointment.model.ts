import { AppointmentExtra } from './appointment-extra.model';

export interface Appointment {
  id: number;
  clientName: string;
  /** Appointment day, ISO format (YYYY-MM-DD). */
  date: string;
  /** Appointment time, 24h format (HH:mm). */
  time: string;
  /** Price of the service, as the barber said it to the assistant. */
  serviceCost: number;
  /** Additional items charged on top of the service. */
  extras: AppointmentExtra[];
  /** true = cancelled, false = active. Cancelled appointments are kept, never deleted. */
  cancelled: boolean;
  /** true = client served without a booking (walk-in), registered with the "Cliente casual" button. */
  walkIn: boolean;
  /** true = the barber confirmed the service was done (button "Completar"). */
  completed: boolean;
}
