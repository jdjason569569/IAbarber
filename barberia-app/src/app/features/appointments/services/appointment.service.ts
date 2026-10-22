import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Appointment, AppointmentStatus } from '../models/appointment.model';
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
  status: AppointmentStatus;
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

  getTotal(appointment: Appointment): number {
    return appointment.extras.reduce((sum, extra) => sum + extra.price, appointment.serviceCost);
  }
}

function toAppointment(dto: AppointmentDto): Appointment {
  const { client, ...rest } = dto;
  return { ...rest, clientName: client };
}
