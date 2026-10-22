import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BookingDraft, BookingTurnResult } from '../models/assistant.model';

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/assistant/booking`;

  /** Sends the user's last answer plus the draft so far; an empty text starts the dialog. */
  bookingTurn(text: string, draft: BookingDraft): Observable<BookingTurnResult> {
    return this.http.post<BookingTurnResult>(this.url, { text, draft }).pipe(timeout(20000));
  }
}
