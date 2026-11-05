import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SKIP_LOADING } from '../../../core/loading/loading.interceptor';
import { HaircutPreviewErrorCode } from '../models/haircut-preview.model';

/** Gemini takes about 10–30 s per picture; leave room for the upload and download on mobile data. */
const TIMEOUT_MS = 90000;

/** Asks the API (Gemini) for a picture of the client wearing a cut of the catalog. */
@Injectable({ providedIn: 'root' })
export class HaircutPreviewService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/haircut-preview`;

  /** Emits the picture as a data URL, or errors with a `HaircutPreviewErrorCode`. */
  generate(photo: string, haircutId: string): Observable<string> {
    return this.http
      .post<{ image: string }>(
        this.url,
        { photo, haircutId },
        { context: new HttpContext().set(SKIP_LOADING, true) },
      )
      .pipe(
        timeout(TIMEOUT_MS),
        map((response) => response.image),
        catchError((error: unknown) => {
          console.error('Haircut preview failed', error);
          const code: HaircutPreviewErrorCode =
            error instanceof HttpErrorResponse && error.status === 429 ? 'quota' : 'failed';
          return throwError(() => code);
        }),
      );
  }
}
