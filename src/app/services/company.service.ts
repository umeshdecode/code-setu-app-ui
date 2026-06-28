import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ENV } from 'src/assets/env';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  private BASE_URL =
    ENV.CARGO_SETU + '/api/v2/cargosetu/company';

  constructor(private http: HttpClient) {}

  // Get All Companies
  getCompany(): Observable<any> {
    return this.http.get<any>(this.BASE_URL);
  }

  // Get Current Company
  getCurrentCompany(): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/currentCompany`);
  }

  // Create Company
  createCompany(payload: FormData): Observable<any> {
    return this.http.post<any>(this.BASE_URL, payload);
  }

  // Update Company
  updateCompany(payload: any): Observable<any> {
    return this.http.put<any>(this.BASE_URL, payload);
  }

  // Get By Id
  getCompanyById(id: number): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/${id}`);
  }
   // Get By Id
  deleteCompany(id: number): Observable<any> {
    return this.http.delete<any>(`${this.BASE_URL}/${id}`);
  }
}
