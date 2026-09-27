import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ENV } from 'src/assets/env';
import { Assignments } from '../models/assignments';

export interface VehiclePayload {
  id?: number;
  chassisNumber: string;
  engineNumber: string;
  registrationNumber: string;
  vehicleType: string;
  model: string;
  manufacturer: string;
  mileage: number;
  capacityKg: number;
  capacityCbm?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  bodyType?: string;
  equipmentTags?: string;
  status: string;
  fuelType: string;
  registrationDate: string;
  insuranceExpiryDate: string;
  pollutionExpiryDate: string;
  currentLocation: string;
}

@Injectable({
  providedIn: 'root'
})
export class VehicleService {

  private readonly BASE_URL = `${ENV.CARGO_SETU}/vehicle`;
    private readonly BASE_URL_ASSIGN = `${ENV.CARGO_SETU}/api/v2/cargosetu/assignments`;


  constructor(private http: HttpClient) {}

  getVehicles(): Observable<any> {
    return this.http.get<any>(this.BASE_URL);
  }

  getVehicle(id: number): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/${id}`);
  }

  createVehicle(payload: VehiclePayload): Observable<any> {
    return this.http.post<any>(this.BASE_URL, payload);
  }

  updateVehicle(id: number, payload: VehiclePayload): Observable<any> {
    return this.http.put<any>(`${this.BASE_URL}/${id}`, payload);
  }

  deleteVehicle(id: number): Observable<any> {
    return this.http.delete<any>(`${this.BASE_URL}/${id}`);
  }

  getManufacturers(): Observable<string[]> {
    return this.http.get<string[]>(`${this.BASE_URL}/manufacturer-models/manufacturers`);
  }

  getModelsForManufacturer(manufacturer: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/manufacturer-models/manufacturers/${encodeURIComponent(manufacturer)}/models`);
  }

    getAssignments(page: number, size: number): Observable<any> {
    return this.http.get<Assignments[]>(this.BASE_URL_ASSIGN+'');
  }
      getAssignment() {
    return this.http.get<Assignments[]>(this.BASE_URL_ASSIGN+'');
  }
}
