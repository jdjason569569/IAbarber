import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SKIP_LOADING } from '../../../core/loading/loading.interceptor';
import { BookingDraft, BookingTurnResult } from '../models/assistant.model';

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/assistant/booking`;

  /**
   * Sends the user's last answer plus the draft so far; an empty text starts the dialog.
   * Skips the global overlay: the page shows its own send progress bar.
   */
  bookingTurn(text: string, draft: BookingDraft): Observable<BookingTurnResult> {
    return this.http
      .post<BookingTurnResult>(this.url, { text, draft }, { context: new HttpContext().set(SKIP_LOADING, true) })
      .pipe(timeout(20000));
  }
}
