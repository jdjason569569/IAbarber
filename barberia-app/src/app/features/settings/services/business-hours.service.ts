import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DayHours } from '../models/business-hours.model';

@Injectable({ providedIn: 'root' })
export class BusinessHoursService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/business-hours`;

  /** The seven weekdays; never configured days come with the default 07:00 to midnight. */
  get(): Observable<DayHours[]> {
    return this.http.get<DayHours[]>(this.url);
  }

  update(days: DayHours[]): Observable<DayHours[]> {
    return this.http.put<DayHours[]>(this.url, days);
  }
}
