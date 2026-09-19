import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ENV } from 'src/assets/env';

export interface LoadMatchSearchCriteria {
  sourceCity?: string;
  destinationCity?: string;
  minAvailableVolume?: number;
  minAvailableWeight?: number;
}

@Injectable({ providedIn: 'root' })
export class LoadMatchingService {
  private readonly BASE_URL = `${ENV.CARGO_SETU}/api/v2/cargosetu`;

  constructor(private http: HttpClient) {}

  // ── Matching lookups ──────────────────────────────────────────────────
  getMatchingTripsForShipment(shipmentId: number): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/shipment/${shipmentId}/matching-trips`);
  }

  getMatchingShipmentsForTrip(tripId: number): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/trip/${tripId}/matching-shipments`);
  }

  search(criteria: LoadMatchSearchCriteria): Observable<any> {
    let params = new HttpParams();
    if (criteria.sourceCity)                          params = params.set('sourceCity', criteria.sourceCity);
    if (criteria.destinationCity)                      params = params.set('destinationCity', criteria.destinationCity);
    if (criteria.minAvailableVolume !== undefined && criteria.minAvailableVolume !== null) {
      params = params.set('minAvailableVolume', criteria.minAvailableVolume);
    }
    if (criteria.minAvailableWeight !== undefined && criteria.minAvailableWeight !== null) {
      params = params.set('minAvailableWeight', criteria.minAvailableWeight);
    }
    return this.http.get<any>(`${this.BASE_URL}/load-matching`, { params });
  }

  // ── Actions ───────────────────────────────────────────────────────────
  markViewed(loadMatchId: number): Observable<any> {
    return this.http.post<any>(`${this.BASE_URL}/load-matching/${loadMatchId}/view`, {});
  }

  requestMatch(loadMatchId: number): Observable<any> {
    return this.http.post<any>(`${this.BASE_URL}/load-matching/${loadMatchId}/request`, {});
  }

  acceptMatch(loadMatchId: number): Observable<any> {
    return this.http.post<any>(`${this.BASE_URL}/load-matching/${loadMatchId}/accept`, {});
  }

  rejectMatch(loadMatchId: number, reason?: string): Observable<any> {
    return this.http.post<any>(`${this.BASE_URL}/load-matching/${loadMatchId}/reject`, { reason });
  }
}
