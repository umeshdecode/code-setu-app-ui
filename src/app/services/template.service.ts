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

  /**
   * Delivers a generated document to the user.
   * - A real PDF response is downloaded as `<baseName>.pdf`.
   * - An HTML response (what the quotation/invoice endpoints return today) is rendered in a
   *   hidden iframe and the browser print dialog is opened, where the user can "Save as PDF".
   *   Saving HTML with a .pdf extension produces a file that cannot be opened.
   */
  async deliverDocument(blob: Blob, baseName: string): Promise<'downloaded' | 'printed'> {
    if (await this.isPdf(blob)) {
      this.downloadBlob(blob, `${baseName}.pdf`);
      return 'downloaded';
    }
    const html = await blob.text();
    await this.printHtml(html, baseName);
    return 'printed';
  }

  private async isPdf(blob: Blob): Promise<boolean> {
    if (blob.type.includes('pdf')) {
      return true;
    }
    const header = await blob.slice(0, 5).text();
    return header === '%PDF-';
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  }

  private printHtml(html: string, title: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';

      const cleanup = () => setTimeout(() => iframe.remove(), 1000);

      iframe.onload = () => {
        const win = iframe.contentWindow;
        if (!win) {
          cleanup();
          reject(new Error('Unable to open print frame'));
          return;
        }
        // The browser uses the document title as the default "Save as PDF" file name.
        win.document.title = title;
        win.addEventListener('afterprint', cleanup, { once: true });
        win.focus();
        win.print();
        resolve();
      };

      iframe.srcdoc = html;
      document.body.appendChild(iframe);
    });
  }

}
