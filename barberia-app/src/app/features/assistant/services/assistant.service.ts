import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SKIP_LOADING } from '../../../core/loading/loading.interceptor';
import { BookingAnswers, BookingDraft, BookingTurnResult } from '../models/assistant.model';

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/assistant/booking`;

  /**
   * Sends every answer of the dialog at once plus the draft so far; the API reads them with a
   * single LLM call. With `preview` nothing is saved: a valid draft comes back as `ready` for review.
   * Skips the global overlay: the page shows its own send progress bar.
   */
  submitBooking(answers: BookingAnswers, draft: BookingDraft, preview = false): Observable<BookingTurnResult> {
    return this.http
      .post<BookingTurnResult>(
        this.url,
        { answers, draft, preview },
        { context: new HttpContext().set(SKIP_LOADING, true) },
      )
      .pipe(timeout(30000));
  }
}
