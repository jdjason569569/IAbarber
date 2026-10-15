import { Injectable } from '@nestjs/common';
import { Appointment } from '../../domain/entities/appointment.entity.js';
import type { AppointmentRepository } from '../../domain/ports/appointment.repository.js';

@Injectable()
export class InMemoryAppointmentRepository implements AppointmentRepository {
  private readonly items: Appointment[] = [
    Appointment.restore({ id: 1, client: 'Michael Torres', service: 'Classic Haircut', barber: 'Carlos', date: '2026-10-13', time: '09:00', status: 'confirmed' }),
    Appointment.restore({ id: 2, client: 'Daniel Rivera', service: 'Beard Trim', barber: 'Luis', date: '2026-10-13', time: '10:30', status: 'pending' }),
    Appointment.restore({ id: 3, client: 'James Walker', service: 'Haircut + Beard', barber: 'Carlos', date: '2026-10-13', time: '12:00', status: 'completed' }),
    Appointment.restore({ id: 4, client: 'Andrew Scott', service: 'Fade Haircut', barber: 'Luis', date: '2026-10-14', time: '11:00', status: 'confirmed' }),
    Appointment.restore({ id: 5, client: 'Robert Hill', service: 'Classic Haircut', barber: 'Carlos', date: '2026-10-14', time: '16:30', status: 'cancelled' }),
  ];

  async findAll(): Promise<Appointment[]> {
    return [...this.items];
  }

  async nextId(): Promise<number> {
    return Math.max(0, ...this.items.map((a) => a.id)) + 1;
  }

  async save(appointment: Appointment): Promise<void> {
    this.items.push(appointment);
  }
}
