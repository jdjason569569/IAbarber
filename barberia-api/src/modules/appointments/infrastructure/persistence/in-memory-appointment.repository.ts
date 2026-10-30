import { Injectable } from '@nestjs/common';
import { Appointment } from '../../domain/entities/appointment.entity.js';
import { AppointmentConflictError } from '../../domain/errors/appointment-conflict.error.js';
import type { AppointmentRepository } from '../../domain/ports/appointment.repository.js';

@Injectable()
export class InMemoryAppointmentRepository implements AppointmentRepository {
  // Empty on purpose: data only exists while the process runs (used when Supabase is not configured).
  private readonly items: Appointment[] = [];

  async findAll(): Promise<Appointment[]> {
    return [...this.items];
  }

  async findById(id: number): Promise<Appointment | null> {
    return this.items.find((a) => a.id === id) ?? null;
  }

  async findActiveAt(date: string, time: string): Promise<Appointment | null> {
    return this.items.find((a) => a.holdsSlot && a.date === date && a.time === time) ?? null;
  }

  async save(appointment: Appointment): Promise<Appointment> {
    const taken = appointment.holdsSlot
      ? await this.findActiveAt(appointment.date, appointment.time)
      : null;
    if (taken && taken.id !== appointment.id) {
      throw new AppointmentConflictError('That date and time is already booked');
    }
    const index = this.items.findIndex((a) => a.id === appointment.id);
    if (index >= 0) {
      this.items[index] = appointment;
      return appointment;
    }
    const nextId = Math.max(0, ...this.items.map((a) => a.id)) + 1;
    const stored = Appointment.restore({
      id: nextId,
      client: appointment.client,
      date: appointment.date,
      time: appointment.time,
      serviceCost: appointment.serviceCost,
      extras: appointment.extras,
      cancelled: appointment.cancelled,
      walkIn: appointment.walkIn,
      completed: appointment.completed,
    });
    this.items.push(stored);
    return stored;
  }
}
