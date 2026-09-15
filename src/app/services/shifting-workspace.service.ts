import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ENV } from 'src/assets/env';

@Injectable({ providedIn: 'root' })
export class ShiftingWorkspaceService {
  private readonly BASE_URL = `${ENV.CARGO_SETU}/api/v2/cargosetu/shifts`;

  constructor(private http: HttpClient) {}

  getShift(shiftId: number | string): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/${shiftId}`);
  }

  updateShift(shiftId: number | string, payload: any): Observable<any> {
    return this.http.put<any>(`${this.BASE_URL}/${shiftId}`, payload);
  }

  /** Paged list. The dashboard asks for a single row purely to read data.totalElements. */
  getShifts(pageNumber = 0, pageSize = 10): Observable<any> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    return this.http.get<any>(this.BASE_URL, { params });
  }
}
