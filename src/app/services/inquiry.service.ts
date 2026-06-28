import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ENV } from 'src/assets/env';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InquiryService {
  private BASE_URL = ENV.CARGO_SETU;

  constructor(private http: HttpClient) { }

  sendInquiry(data: { name: string; email: string; phone: string; subject: string; message: string }): Observable<any> {
    return this.http.post<any>(`${this.BASE_URL}/public/api/inquiries`, data);
  }
}
