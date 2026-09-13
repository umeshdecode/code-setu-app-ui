import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ENV } from 'src/assets/env';
import { GenericDataDTO } from '../models/generic-data-dto';

@Injectable({
  providedIn: 'root'
})
export class StaffuserServiceService {

  constructor(private http: HttpClient) { }

  private BASE_URL = ENV.CARGO_SETU;
  getStaffById(staffId: any) {
    return this.http.get<any>(`${this.BASE_URL}/api/v2/cargosetu/staff/${staffId}`);
  }
  createStaff(payload: any): Observable<any> {
    return this.http.post(`${this.BASE_URL}/auth/user/register`, payload);
  }
   updateStaff(payload: any): Observable<any> {
    return this.http.post(`${this.BASE_URL}/auth/user/register`, payload);
  }
  // Staff management endpoints (matches backend StaffDTO)
  createStaffRecord(payload: any): Observable<any> {
    return this.http.post(`${this.BASE_URL}/api/v2/cargosetu/staff`, payload);
  }
  updateStaffRecord(staffId: any, payload: any): Observable<any> {
    return this.http.put(`${this.BASE_URL}/api/v2/cargosetu/staff/${staffId}`, payload);
  }
  deleteStaff(staffId: any): Observable<any> {
    return this.http.delete(`${this.BASE_URL}/api/v2/cargosetu/staff/${staffId}`);
  }
  // staff.service.ts
  private staffDetailsSubject = new BehaviorSubject<any>(null);
  staffDetails$ = this.staffDetailsSubject.asObservable(); // Components subscribe to this

  setStaffDetails(details: any) {
    this.staffDetailsSubject.next(details);
  }
  // staff.service.ts
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.loadingSubject.asObservable();

  setLoading(state: boolean) {
    this.loadingSubject.next(state);
  }

  profileUpload(staffId: any) {
    return this.http.post(`${this.BASE_URL}/api/v2/cargosetu/document/upload?/`,staffId);
  }

   getAllStaff(page: number, size: number): Observable<GenericDataDTO> {
    return this.http.get<GenericDataDTO>(
      `${this.BASE_URL}/api/v2/cargosetu/staff?page=${page}&size=${size}`,
    );
  }

  /** The signed-in user's own UI preferences, so their theme follows them across devices. */
  getMyPreferences(): Observable<GenericDataDTO> {
    return this.http.get<GenericDataDTO>(
      `${this.BASE_URL}/api/v2/cargosetu/staff/myprofile/preferences`,
    );
  }

  /** PUT, not PATCH — PATCH is missing from the backend's CORS allowed-methods list. */
  updateMyPreferences(payload: any): Observable<GenericDataDTO> {
    return this.http.put<GenericDataDTO>(
      `${this.BASE_URL}/api/v2/cargosetu/staff/myprofile/preferences`,
      payload,
    );
  }

}
