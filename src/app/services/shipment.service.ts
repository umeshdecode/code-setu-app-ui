import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ENV } from 'src/assets/env';
import { Shipment, ShipmentItem, ShipmentPayload } from '../models/shipment';

@Injectable({ providedIn: 'root' })
export class ShipmentService {
  private readonly BASE_URL = `${ENV.CARGO_SETU}/api/v2/cargosetu/shipment`;

  constructor(private http: HttpClient) {}

  // ── Shipment CRUD ─────────────────────────────────────────────────────
  getShipments(pageNumber = 0, pageSize = 10): Observable<any> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);
    return this.http.get<any>(this.BASE_URL, { params });
  }

  getShipment(id: number): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/${id}`);
  }

  createShipment(payload: ShipmentPayload): Observable<any> {
    return this.http.post<any>(this.BASE_URL, payload);
  }

  updateShipment(id: number, payload: ShipmentPayload): Observable<any> {
    return this.http.put<any>(`${this.BASE_URL}/${id}`, payload);
  }

  deleteShipment(id: number): Observable<any> {
    return this.http.delete<any>(`${this.BASE_URL}/${id}`);
  }

  // ── Shipment items ────────────────────────────────────────────────────
  addItem(shipmentId: number, item: ShipmentItem): Observable<any> {
    return this.http.post<any>(`${this.BASE_URL}/${shipmentId}/items`, item);
  }

  updateItem(shipmentId: number, itemId: number, item: ShipmentItem): Observable<any> {
    return this.http.put<any>(`${this.BASE_URL}/${shipmentId}/items/${itemId}`, item);
  }

  deleteItem(shipmentId: number, itemId: number): Observable<any> {
    return this.http.delete<any>(`${this.BASE_URL}/${shipmentId}/items/${itemId}`);
  }

  // ── Open shipment search (Find Loads) ────────────────────────────────
  searchOpenShipments(
    criteria: { sourceCity?: string; destinationCity?: string; vehicleTypeRequired?: string },
    pageNumber = 0,
    pageSize = 10
  ): Observable<any> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);
    if (criteria.sourceCity) params = params.set('sourceCity', criteria.sourceCity);
    if (criteria.destinationCity) params = params.set('destinationCity', criteria.destinationCity);
    if (criteria.vehicleTypeRequired) params = params.set('vehicleTypeRequired', criteria.vehicleTypeRequired);
    return this.http.get<any>(`${this.BASE_URL}/search`, { params });
  }
}
