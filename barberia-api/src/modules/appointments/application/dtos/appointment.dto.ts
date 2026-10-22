import type { AppointmentExtra } from '../../domain/entities/appointment.entity.js';
import type { Appointment } from '../../domain/entities/appointment.entity.js';

export interface AppointmentDto {
  id: number;
  client: string;
  service: string;
  date: string;
  time: string;
  serviceCost: number;
  extras: AppointmentExtra[];
  status: string;
}

export interface ScheduleAppointmentInput {
  client: string;
  service: string;
  date: string;
  time: string;
  serviceCost: number;
  extras: AppointmentExtra[];
}

export function toAppointmentDto(a: Appointment): AppointmentDto {
  return {
    id: a.id,
    client: a.client,
    service: a.service,
    date: a.date,
    time: a.time,
    serviceCost: a.serviceCost,
    extras: a.extras,
    status: a.status,
  };
}
