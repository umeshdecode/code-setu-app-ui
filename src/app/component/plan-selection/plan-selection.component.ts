import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { PlanserviceService } from 'src/app/services/planservice.service';
import { CompanyService } from 'src/app/services/company.service';
import { ShowpopupService } from 'src/app/services/showpopup.service';

interface SelectablePlan {
  planId: number;
  name: string;
  price: number;
  duration: string;
  features: string[];
  buttonText: string;
}

/**
 * Post-company-creation onboarding step: choose a subscription plan.
 * Deliberately its own screen/route (not the permission-gated /plan screen)
 * so a brand-new company admin can always reach it right after creating
 * their company, regardless of whether they've been granted PLAN:READ yet.
 *
 * "Purchase" here only records the selected plan against the company —
 * there is no payment gateway anywhere in this app to integrate with.
 */
@Component({
  selector: 'app-plan-selection',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './plan-selection.component.html',
  styleUrls: ['./plan-selection.component.css']
})
export class PlanSelectionComponent implements OnInit {
  plans: SelectablePlan[] = [];
  isLoading = false;
  isConfirming = false;

  isConfirmModalVisible = false;
  selectedPlan: SelectablePlan | null = null;

  private companyId: number | null = null;

  constructor(
    private planservice: PlanserviceService,
    private companyService: CompanyService,
    private showPopup: ShowpopupService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Read reactively, not just from the initial snapshot — Angular reuses this
    // component instance (without re-running ngOnInit) if navigation only changes
    // query params on the same route, so a one-time snapshot read can go stale.
    this.route.queryParamMap.subscribe(params => {
      const companyIdParam = params.get('companyId');
      this.companyId = companyIdParam ? Number(companyIdParam) : null;
    });
    this.loadPlans();
  }

  loadPlans(): void {
    this.isLoading = true;
    this.planservice.getPublicPlanList().subscribe({
      next: (response: any) => {
        this.isLoading = false;
        const rawPlans = response?.responseBody || response?.data || (Array.isArray(response) ? response : []);
        this.plans = (rawPlans || []).map((p: any) => ({
          planId: p.planId,
          name: p.name || 'Standard Plan',
          price: p.price || 0,
          duration: this.getDurationText(p.planValidity),
          features: [
            `Category: ${p.plannCategory || 'General'}`,
            `Valid Until: ${this.formatDate(p.planValidity)}`
          ],
          buttonText: 'Select This Plan'
        }));
      },
      error: (err) => {
        this.isLoading = false;
        this.showPopup.showApiError(err, 'Unable to load plans right now.');
      }
    });
  }

  private getDurationText(validity: any): string {
    if (!validity) return 'Subscription';
    const today = new Date();
    const valDate = new Date(validity);
    const diffTime = valDate.getTime() - today.getTime();
    if (diffTime <= 0) return 'Expired';
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} Days`;
  }

  private formatDate(dateStr: any): string {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  openConfirmModal(plan: SelectablePlan): void {
    this.selectedPlan = plan;
    this.isConfirmModalVisible = true;
  }

  closeConfirmModal(): void {
    if (this.isConfirming) return;
    this.isConfirmModalVisible = false;
    this.selectedPlan = null;
  }

  confirmSelection(): void {
    if (!this.selectedPlan) return;

    if (!this.companyId) {
      this.showPopup.showError('No company found to attach this plan to.');
      return;
    }

    this.isConfirming = true;
    this.companyService.selectPlan(this.companyId, this.selectedPlan.planId).subscribe({
      next: (res: any) => {
        this.isConfirming = false;
        const code = res?.responseCode;
        const message = res?.responseMessege || res?.responseMessage || 'Plan selected successfully.';
        this.showPopup.showResponsePopup(message, code);
        if (code === 200 || code === 201) {
          this.isConfirmModalVisible = false;
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isConfirming = false;
        this.showPopup.showApiError(err, 'Unable to select this plan.');
      }
    });
  }

  skipForNow(): void {
    this.router.navigate(['/dashboard']);
  }
}
