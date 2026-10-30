import type { Appointment } from '../entities/appointment.entity.js';

export const APPOINTMENT_REPOSITORY = Symbol('APPOINTMENT_REPOSITORY');

export interface AppointmentRepository {
  findAll(): Promise<Appointment[]>;
  findById(id: number): Promise<Appointment | null>;
  /** Booking that holds the slot (not cancelled, completed or walk-in) starting exactly at the given date and time, if any. */
  findActiveAt(date: string, time: string): Promise<Appointment | null>;
  /** Inserts a new appointment (id unassigned) or updates an existing one; returns the stored copy. Throws `AppointmentConflictError` if the slot is taken. */
  save(appointment: Appointment): Promise<Appointment>;
}
