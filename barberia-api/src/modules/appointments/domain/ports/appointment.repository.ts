import type { Appointment } from '../entities/appointment.entity.js';

export const APPOINTMENT_REPOSITORY = Symbol('APPOINTMENT_REPOSITORY');

export interface AppointmentRepository {
  findAll(): Promise<Appointment[]>;
  nextId(): Promise<number>;
  save(appointment: Appointment): Promise<void>;
}
