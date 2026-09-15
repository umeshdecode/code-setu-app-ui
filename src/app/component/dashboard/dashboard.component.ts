import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AccessMenuItem, AccessMenuSection, AccessMenuService } from 'src/app/services/access-menu.service';
import { CustomersService } from 'src/app/services/customers.service';
import { ShiftingWorkspaceService } from 'src/app/services/shifting-workspace.service';
import { ShowpopupService } from 'src/app/services/showpopup.service';

export interface DashboardStat {
  id: string;
  label: string;
  icon: string;
  tone: 'primary' | 'success' | 'warning' | 'info';
  value: number | null;
  loading: boolean;
  failed: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  dashboardSections: AccessMenuSection[] = [];
  stats: DashboardStat[] = [];

  constructor(
    private router: Router,
    private accessMenuService: AccessMenuService,
    private showPopup: ShowpopupService,
    private customersService: CustomersService,
    private shiftingService: ShiftingWorkspaceService
  ) {}

  ngOnInit(): void {
    this.dashboardSections = this.accessMenuService.getDashboardSections();
    this.loadStats();
  }

  openModule(item: AccessMenuItem): void {
    if (item.comingSoon || !item.route) {
      this.showPopup.showInfo(`${item.label} module is currently under construction.`);
      return;
    }

    this.router.navigate([item.route]);
  }

  /**
   * Only endpoints that are both paginated and company-scoped are counted here.
   * Trips and vehicles are deliberately absent: those endpoints return rows across
   * every tenant, so their totals would be misleading on a per-company dashboard.
   */
  private loadStats(): void {
    const candidates: Array<{ stat: DashboardStat; module: string; source: () => Observable<number> }> = [
      {
        module: 'CUSTOMER',
        stat: this.buildStat('customers', 'Customers', 'groups', 'primary'),
        // pageSize=1 — we want the page metadata, not the rows.
        source: () => this.customersService.getCustomers(0, 1).pipe(map(this.readTotal))
      },
      {
        module: 'SHIFT',
        stat: this.buildStat('shiftings', 'Shiftings', 'local_shipping', 'success'),
        source: () => this.shiftingService.getShifts(0, 1).pipe(map(this.readTotal))
      }
    ];

    const permitted = candidates.filter((candidate) => this.accessMenuService.hasPermission(candidate.module));
    this.stats = permitted.map((candidate) => candidate.stat);

    permitted.forEach((candidate) => {
      candidate
        .source()
        .pipe(catchError(() => of(null)))
        .subscribe((value) => {
          candidate.stat.loading = false;
          if (value === null) {
            candidate.stat.failed = true;
            return;
          }
          candidate.stat.value = value;
        });
    });
  }

  private buildStat(id: string, label: string, icon: string, tone: DashboardStat['tone']): DashboardStat {
    return { id, label, icon, tone, value: null, loading: true, failed: false };
  }

  /**
   * These services put the Spring Page straight into `data`, so the count is
   * data.totalElements. An empty result comes back as a NOT_FOUND code with no
   * `data` at all, which is zero records rather than a failure.
   */
  private readTotal(response: any): number {
    return response?.data?.totalElements ?? 0;
  }
}
