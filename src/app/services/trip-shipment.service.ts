import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ENV } from 'src/assets/env';
import { TripShipment } from 'src/app/models/trip-shipment';

@Injectable({ providedIn: 'root' })
export class TripShipmentService {
  private readonly BASE_URL = `${ENV.CARGO_SETU}/api/v2/cargosetu/trip`;

  constructor(private http: HttpClient) {}

  getManifest(tripId: number): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/${tripId}/manifest`);
  }

  updateManifestEntry(tripId: number, tripShipmentId: number, payload: Partial<TripShipment>): Observable<any> {
    return this.http.put<any>(`${this.BASE_URL}/${tripId}/manifest/${tripShipmentId}`, payload);
  }
}
