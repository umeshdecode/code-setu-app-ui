import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DialogboxComponent } from 'src/app/component/dialogbox/dialogbox.component';
import { ENV } from 'src/assets/env';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  private BASE_URL =
    ENV.CARGO_SETU + '/api/v2/cargosetu/company';

  private readonly COMPANY_STATUS_KEY = 'cargosetu_company_status';
  private companyStatusSubject = new BehaviorSubject<boolean | null>(this.getCompanyStatus());
  private companyDialogOpen = false;

  companyStatus$ = this.companyStatusSubject.asObservable();

  constructor(private http: HttpClient, private dialog: MatDialog, private router: Router) {}

  requireCompany(): boolean {
    if (this.getCompanyStatus() !== false) return true;
    this.promptCreateCompany();
    return false;
  }

  promptCreateCompany(): void {
    if (this.companyDialogOpen) return;
    this.companyDialogOpen = true;
    const dialogRef = this.dialog.open(DialogboxComponent, {
      width: '450px',
      disableClose: true,
      data: {
        title: 'Create Your First Company',
        message: 'It looks like you do not have any company associated with your account. Would you like to create one now?',
        confirmText: 'Create Company',
        cancelText: 'Skip'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      this.companyDialogOpen = false;
      if (confirmed) {
        this.router.navigate(['/company-create']);
      }
    });
  }

  setCompanyStatus(exists: boolean): void {
    localStorage.setItem(this.COMPANY_STATUS_KEY, exists ? 'true' : 'false');
    this.companyStatusSubject.next(exists);
  }

  getCompanyStatus(): boolean | null {
    const val = localStorage.getItem(this.COMPANY_STATUS_KEY);
    if (val === 'true') return true;
    if (val === 'false') return false;
    return null;
  }

  clearCompanyStatus(): void {
    localStorage.removeItem(this.COMPANY_STATUS_KEY);
    this.companyStatusSubject.next(null);
  }

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

  // Record which plan the company selected (no payment processing — see PlanSelectionComponent)
  selectPlan(companyId: number, planId: number): Observable<any> {
    return this.http.put<any>(`${this.BASE_URL}/${companyId}/plan`, { planId });
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
