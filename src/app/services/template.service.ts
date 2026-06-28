import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ENV } from 'src/assets/env';

@Injectable({
  providedIn: 'root'
})
export class TemplateService {
  private readonly BASE_URL = `${ENV.CARGO_SETU}/api/v2/cargosetu/templates`;

  constructor(private http: HttpClient) {}

  createTemplate(payload: FormData): Observable<any> {
    return this.http.post<any>(this.BASE_URL, payload);
  }

  getQuotationPdf(shiftingId: number | string): Observable<Blob> {
    return this.http.get(`${this.BASE_URL}/quotation/${shiftingId}/pdf`, { responseType: 'blob' });
  }

  getInvoicePdf(shiftingId: number | string): Observable<Blob> {
    return this.http.get(`${this.BASE_URL}/${shiftingId}/invoice`, { responseType: 'blob' });
  }

  getLRCopyPdf(shiftingId: number | string): Observable<Blob> {
    return this.http.get(`${this.BASE_URL}/lr-copy/${shiftingId}/pdf`, { responseType: 'blob' });
  }

  getItemListPdf(shiftingId: number | string): Observable<Blob> {
    return this.http.get(`${this.BASE_URL}/item-list/${shiftingId}/pdf`, { responseType: 'blob' });
  }

}
