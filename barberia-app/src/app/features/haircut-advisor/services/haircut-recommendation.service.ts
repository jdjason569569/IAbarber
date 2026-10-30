import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SKIP_LOADING } from '../../../core/loading/loading.interceptor';
import { FaceMetrics } from '../models/face-metrics.model';
import { HaircutRecommendations } from '../models/haircut.model';

/** Sends only the face proportions to the API, which classifies the shape and ranks the catalog. */
@Injectable({ providedIn: 'root' })
export class HaircutRecommendationService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/haircut-recommendations`;

  /** Skips the global overlay: the photo already shows its own "analyzing" spinner. */
  recommend(metrics: FaceMetrics): Observable<HaircutRecommendations> {
    return this.http
      .post<HaircutRecommendations>(this.url, { metrics }, { context: new HttpContext().set(SKIP_LOADING, true) })
      .pipe(timeout(20000));
  }
}
