import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DayHours, TimeBlock } from '../models/business-hours.model';

@Injectable({ providedIn: 'root' })
export class BusinessHoursService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/business-hours`;

  /** The seven weekdays; never configured days come with the default 07:00 to midnight. */
  get(): Observable<DayHours[]> {
    return this.http.get<DayHours[]>(this.url);
  }

  /** Hours the barber blocked on `date` (`YYYY-MM-DD`). */
  getBlocks(date: string): Observable<TimeBlock[]> {
    return this.http.get<TimeBlock[]>(`${this.url}/blocks/${date}`);
  }

  /** Replaces the blocks of `date`. Fails with 409 (and the clashing appointments) if any falls inside. */
  updateBlocks(date: string, blocks: TimeBlock[]): Observable<TimeBlock[]> {
    return this.http.put<TimeBlock[]>(`${this.url}/blocks/${date}`, blocks);
  }
}
