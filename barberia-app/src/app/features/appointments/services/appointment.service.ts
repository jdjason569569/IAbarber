import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Appointment } from '../models/appointment.model';
import { AppointmentExtra } from '../models/appointment-extra.model';

/** Shape returned by the NestJS API. */
interface AppointmentDto {
  id: number;
  client: string;
  service: string;
  date: string;
  time: string;
  serviceCost: number;
  extras: AppointmentExtra[];
  cancelled: boolean;
  walkIn: boolean;
  completed: boolean;
}

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/appointments`;

  getAppointments(): Observable<Appointment[]> {
    return this.http
      .get<AppointmentDto[]>(this.url)
      .pipe(map((items) => items.map(toAppointment)));
  }

  /** Cancels (true) or reactivates (false) an appointment; the record is not deleted. */
  setCancelled(id: number, cancelled: boolean): Observable<Appointment> {
    return this.http
      .patch<AppointmentDto>(`${this.url}/${id}/cancelled`, { cancelled })
      .pipe(map(toAppointment));
  }

  /** Marks (true) that the service of an appointment was done. */
  setCompleted(id: number, completed: boolean): Observable<Appointment> {
    return this.http
      .patch<AppointmentDto>(`${this.url}/${id}/completed`, { completed })
      .pipe(map(toAppointment));
  }

  getTotal(appointment: Appointment): number {
    return appointment.extras.reduce((sum, extra) => sum + extra.price, appointment.serviceCost);
  }
}

function toAppointment(dto: AppointmentDto): Appointment {
  const { client, ...rest } = dto;
  return { ...rest, clientName: client };
}
