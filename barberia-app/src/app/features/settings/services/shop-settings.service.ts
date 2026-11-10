import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Settings of the shop kept by the API (`/settings`). */
@Injectable({ providedIn: 'root' })
export class ShopSettingsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/settings/service-price`;

  /** Value of the haircut; WhatsApp bookings are created with it. 0 = not configured. */
  getServicePrice(): Observable<number> {
    return this.http.get<{ price: number }>(this.url).pipe(map((r) => r.price));
  }

  saveServicePrice(price: number): Observable<number> {
    return this.http.put<{ price: number }>(this.url, { price }).pipe(map((r) => r.price));
  }
}
