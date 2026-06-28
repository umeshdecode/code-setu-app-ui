import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ENV } from 'src/assets/env';

@Injectable({ providedIn: 'root' })
export class TripService {
  private readonly BASE_URL     = `${ENV.CARGO_SETU}/api/v2/cargosetu/trip`;
  private readonly EXPENSE_URL  = `${ENV.CARGO_SETU}/api/v2/cargosetu/trip-expense`;
  private readonly HISTORY_URL  = `${ENV.CARGO_SETU}/api/v2/cargosetu/trip-status-history`;
  private readonly DOCUMENT_URL = `${ENV.CARGO_SETU}/api/v2/cargosetu/trip-document`;

  constructor(private http: HttpClient) {}

  // ── Trip CRUD ─────────────────────────────────────────────────────────
  getTrips(pageNumber = 0, pageSize = 10): Observable<any> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);
    return this.http.get<any>(this.BASE_URL, { params });
  }

  getTrip(id: number): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/${id}`);
  }

  createTrip(payload: any): Observable<any> {
    return this.http.post<any>(this.BASE_URL, payload);
  }

  updateTrip(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.BASE_URL}/${id}`, payload);
  }

  deleteTrip(id: number): Observable<any> {
    return this.http.delete<any>(`${this.BASE_URL}/${id}`);
  }

  // ── Expense endpoints (/trip-expense) ─────────────────────────────────
  getExpensesByTrip(tripId: number): Observable<any> {
    return this.http.get<any>(`${this.EXPENSE_URL}/by-trip/${tripId}`);
  }

  getExpense(expenseId: number): Observable<any> {
    return this.http.get<any>(`${this.EXPENSE_URL}/${expenseId}`);
  }

  createExpense(payload: any): Observable<any> {
    return this.http.post<any>(this.EXPENSE_URL, payload);
  }

  updateExpense(expenseId: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.EXPENSE_URL}/${expenseId}`, payload);
  }

  deleteExpense(expenseId: number): Observable<any> {
    return this.http.delete<any>(`${this.EXPENSE_URL}/${expenseId}`);
  }

  // ── Document endpoints (/trip-document) ──────────────────────────────
  getAllDocuments(): Observable<any> {
    return this.http.get<any>(this.DOCUMENT_URL);
  }

  getDocumentsByTrip(tripId: number): Observable<any> {
    return this.http.get<any>(`${this.DOCUMENT_URL}/by-trip/${tripId}`);
  }

  downloadDocument(id: number): Observable<Blob> {
    return this.http.get(`${this.DOCUMENT_URL}/${id}`, { responseType: 'blob' });
  }

  uploadDocument(tripId: number, documentType: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    const params = new HttpParams()
      .set('tripId', tripId.toString())
      .set('documentType', documentType);
    return this.http.post<any>(this.DOCUMENT_URL, formData, { params });
  }

  updateDocument(id: number, tripId: number, documentType: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    const params = new HttpParams()
      .set('tripId', tripId.toString())
      .set('documentType', documentType);
    return this.http.put<any>(`${this.DOCUMENT_URL}/${id}`, formData, { params });
  }

  deleteDocument(id: number): Observable<any> {
    return this.http.delete<any>(`${this.DOCUMENT_URL}/${id}`);
  }

  // ── Status history endpoints (/trip-status-history) ───────────────────
  getStatusHistoryByTrip(tripId: number): Observable<any> {
    return this.http.get<any>(`${this.HISTORY_URL}/by-trip/${tripId}`);
  }

  getStatusHistoryEntry(id: number): Observable<any> {
    return this.http.get<any>(`${this.HISTORY_URL}/${id}`);
  }

  getAllStatusHistory(): Observable<any> {
    return this.http.get<any>(this.HISTORY_URL);
  }

  createStatusHistory(payload: any): Observable<any> {
    return this.http.post<any>(this.HISTORY_URL, payload);
  }

  updateStatusHistory(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.HISTORY_URL}/${id}`, payload);
  }

  deleteStatusHistory(id: number): Observable<any> {
    return this.http.delete<any>(`${this.HISTORY_URL}/${id}`);
  }
}
