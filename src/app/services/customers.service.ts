import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENV } from 'src/assets/env';

@Injectable({
  providedIn: 'root'
})
export class CustomersService {
  private BASE_URL = ENV.CARGO_SETU;

  constructor(private http: HttpClient) { }

  getCustomers(pageNumber = 0, pageSize = 5): Observable<any> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    return this.http.get<any>(`${this.BASE_URL}/api/v2/cargosetu/customer`, { params });
  }

  // Changed to get customer by UUID
  getCustomerByUuid(uuid: string): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/api/v2/cargosetu/customer/${uuid}`);
  }

  createCustomer(payload: any): Observable<any> {
    return this.http.post<any>(`${this.BASE_URL}/api/v2/cargosetu/customer`, payload);
  }

  updateCustomer(payload: any): Observable<any> {
    return this.http.put<any>(`${this.BASE_URL}/api/v2/cargosetu/customer`, payload);
  }

  deleteCustomer(payload: any): Observable<any> {
    return this.http.delete<any>(`${this.BASE_URL}/api/v2/cargosetu/customer`, { body: payload });
  }
getShiftType(): Observable<any> {
  return this.http.get<any>(`${this.BASE_URL}/api/v2/cargosetu/shifts/shifting-types`);
}
}
