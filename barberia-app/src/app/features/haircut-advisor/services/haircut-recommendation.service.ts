import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SKIP_LOADING } from '../../../core/loading/loading.interceptor';
import { FaceMetrics } from '../models/face-metrics.model';
import { HaircutRecommendations } from '../models/haircut.model';

/** Gemini answers in about 10–15 s; leave room for uploading the photo on a mobile connection. */
const TIMEOUT_MS = 45000;

/**
 * Sends the photo and the face proportions to the API. Gemini looks at the photo and picks the cuts;
 * if it fails, the API ranks the catalog with the proportions.
 */
@Injectable({ providedIn: 'root' })
export class HaircutRecommendationService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/haircut-recommendations`;

  /** Skips the global overlay: the photo already shows its own "analyzing" spinner. */
  recommend(
    metrics: FaceMetrics,
    photo: string,
  ): Observable<HaircutRecommendations> {
    return this.http
      .post<HaircutRecommendations>(
        this.url,
        { metrics, photo },
        { context: new HttpContext().set(SKIP_LOADING, true) },
      )
      .pipe(timeout(TIMEOUT_MS));
  }
}
