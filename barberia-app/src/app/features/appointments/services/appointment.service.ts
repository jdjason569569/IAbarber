import { Injectable } from '@angular/core';
import { APPOINTMENTS_MOCK } from '../data/appointments.mock';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  // Mock source until the NestJS API exists.
  getAppointments() {
    return APPOINTMENTS_MOCK;
  }
}
