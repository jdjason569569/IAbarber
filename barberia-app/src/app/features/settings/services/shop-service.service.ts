import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { NewShopService, ShopService } from '../models/shop-service.model';

@Injectable({ providedIn: 'root' })
export class ShopServiceService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/services`;

  list(): Observable<ShopService[]> {
    return this.http.get<ShopService[]>(this.url);
  }

  add(service: NewShopService): Observable<ShopService> {
    return this.http.post<ShopService>(this.url, service);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
