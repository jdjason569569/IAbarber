import { Injectable } from '@angular/core';
import { APPOINTMENTS_MOCK } from '../data/appointments.mock';
import { Appointment } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  // Mock source until the NestJS API is connected.
  getAppointments(): Appointment[] {
    return APPOINTMENTS_MOCK;
  }

  getTotal(appointment: Appointment): number {
    return appointment.extras.reduce((sum, extra) => sum + extra.price, appointment.serviceCost);
  }
}
