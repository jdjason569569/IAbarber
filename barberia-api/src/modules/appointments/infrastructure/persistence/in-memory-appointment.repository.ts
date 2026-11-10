import { Injectable } from '@nestjs/common';
import { WorkspaceContext } from '../../../../shared/workspace/workspace-context.js';
import { Appointment } from '../../domain/entities/appointment.entity.js';
import { AppointmentConflictError } from '../../domain/errors/appointment-conflict.error.js';
import type { AppointmentRepository } from '../../domain/ports/appointment.repository.js';

@Injectable()
export class InMemoryAppointmentRepository implements AppointmentRepository {
  // Empty on purpose: data only exists while the process runs (used when Supabase is not configured).
  /** Appointments per workspace id. */
  private readonly byWorkspace = new Map<string, Appointment[]>();
  /** Ids are unique across workspaces, as in the database. */
  private lastId = 0;

  async findAll(): Promise<Appointment[]> {
    return [...this.items()];
  }

  async findById(id: number): Promise<Appointment | null> {
    return this.items().find((a) => a.id === id) ?? null;
  }

  async findActiveAt(date: string, time: string): Promise<Appointment | null> {
    return this.items().find((a) => a.holdsSlot && a.date === date && a.time === time) ?? null;
  }

  async save(appointment: Appointment): Promise<Appointment> {
    const taken = appointment.holdsSlot
      ? await this.findActiveAt(appointment.date, appointment.time)
      : null;
    if (taken && taken.id !== appointment.id) {
      throw new AppointmentConflictError('That date and time is already booked');
    }
    const items = this.items();
    const index = items.findIndex((a) => a.id === appointment.id);
    if (index >= 0) {
      items[index] = appointment;
      return appointment;
    }
    const stored = Appointment.restore({
      id: ++this.lastId,
      client: appointment.client,
      date: appointment.date,
      time: appointment.time,
      serviceCost: appointment.serviceCost,
      extras: appointment.extras,
      cancelled: appointment.cancelled,
      walkIn: appointment.walkIn,
      completed: appointment.completed,
      phone: appointment.phone,
      chatId: appointment.chatId,
    });
    items.push(stored);
    return stored;
  }

  /** Appointments of the current workspace (the stored array, so callers may modify it). */
  private items(): Appointment[] {
    const workspaceId = WorkspaceContext.currentId();
    let items = this.byWorkspace.get(workspaceId);
    if (!items) {
      items = [];
      this.byWorkspace.set(workspaceId, items);
    }
    return items;
  }
}
