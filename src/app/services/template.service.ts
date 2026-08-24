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

  getTemplatesByType(type: string, pageNumber: number = 0, pageSize: number = 5): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/by-type`, {
      params: { type, pageNumber: pageNumber.toString(), pageSize: pageSize.toString() }
    });
  }

  setDefaultTemplate(templateId: number): Observable<any> {
    return this.http.put<any>(`${this.BASE_URL}/${templateId}/default`, {});
  }

  getTemplateHtml(templateId: number): Observable<string> {
    return this.http.get(`${this.BASE_URL}/${templateId}/preview-html`, { responseType: 'text' });
  }

  getQuotationPdf(shiftingId: number | string, templateId?: number): Observable<Blob> {
    let url = `${this.BASE_URL}/quotation/${shiftingId}/pdf`;
    if (templateId) {
      url += `?templateId=${templateId}`;
    }
    return this.http.get(url, { responseType: 'blob' });
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
