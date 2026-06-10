import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GenericDataDTO } from 'src/app/models/generic-data-dto';
import { Plandto } from 'src/app/models/plandto';
import { PlanserviceService } from 'src/app/services/planservice.service';
import { ShowpopupService } from 'src/app/services/showpopup.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogboxComponent } from '../dialogbox/dialogbox.component';

@Component({
  selector: 'app-createplan',
  templateUrl: './createplan.component.html',
  styleUrls: ['./createplan.component.css']
})
export class CreateplanComponent implements OnInit {
  planForm!: FormGroup;
  viewMode: 'list' | 'form' = 'list';
  plans: Plandto[] = [];
  selectedPlan: Plandto | null = null;
  planToDelete: Plandto | null = null;
  isEditMode = false;
  successMessage = '';
  constructor(private fb: FormBuilder,
    private planservice: PlanserviceService,
    private showPopup:ShowpopupService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.planForm = this.fb.group({
      planId: [null],
      name: ['', Validators.required],
      plannCategory: ['', Validators.required],
      planValidity: [null, Validators.required],
      price: [0, [Validators.required, Validators.min(0)]]
    });

    this.loadPlans(); // 👈 add this
  }

  // 👇 THIS FIXES YOUR ERROR
  get f() {
    return this.planForm.controls;
  }

// loadPlans(): void {
//   this.planservice.getPlanList().subscribe({
//     next: (response: Plandto[]) => {
//       console.log("Plans Loaded:", response);
//       this.plans = response;
//     },
//     error: (err) => {
//       console.error("Error loading plans:", err);
//     }
//   });
// }


  selectPlan(plan: Plandto): void {
    this.selectedPlan = plan;
  }



editPlan(plan: Plandto): void {
  this.isEditMode = true;
  this.viewMode = 'form';  
  this.selectedPlan = plan;
  let validityDate = '';
  if (plan.planValidity) {
    const dateStr = plan.planValidity.toString();
    validityDate = dateStr.split('T')[0];
  }
  this.planForm.patchValue({
    ...plan,
    planValidity: validityDate
  });
  this.planToDelete = null;
  this.successMessage = '';
  console.log('Edit plan object:', plan);
  if (window.innerWidth < 1024) {
    setTimeout(() => {
      document
        .querySelector('.plan-form-panel')
        ?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}

  confirmDelete(plan: Plandto): void {
    this.planToDelete = plan;
    this.successMessage = '';

    const dialogRef = this.dialog.open(DialogboxComponent, {
      width: '420px',
      disableClose: true,
      data: {
        title: 'Delete Plan',
        message: 'Are you sure you want to delete this plan?',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.deletePlan();
      } else {
        this.planToDelete = null;
      }
    });
  }

  cancelDelete(): void {
    this.planToDelete = null;
  }

deletePlan(): void {
  if (!this.planToDelete) return;

  const planId = this.planToDelete.planId;

  this.planservice.deletePlane(planId).subscribe({
    next: (response: any) => {

      this.showPopup.showResponsePopup(
        response.responseMessege || response.responseMessage,
        response.responseCode
      );

      // Remove deleted plan from UI
      this.plans = this.plans.filter(p => p.planId !== planId);

      // Reset state
      this.planToDelete = null;
      this.selectedPlan = null;
    },
    error: (err) => {
      console.error("Delete Error:", err);
    }
  });
}


  createNewPlan(): void {
    this.isEditMode = false;
    this.selectedPlan = null;
    this.planForm.reset();
    this.planToDelete = null; // Hide delete confirmation
    this.successMessage = ''; // Clear success message

    // Scroll to form on mobile
    if (window.innerWidth < 1024) {
      document.querySelector('.plan-form-panel')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  onSubmit(): void {

  if (this.planForm.invalid) {
    this.planForm.markAllAsTouched();
    return;
  }

  const planData = this.planForm.value;

  if (this.isEditMode) {

    this.planservice.updatePlane(planData.planId, planData).subscribe({
      next: (response: any) => {

        this.showPopup.showResponsePopup(
          response.responseMessege || response.responseMessage,
          response.responseCode
        );

        this.loadPlans();     // refresh table
        this.viewMode = 'list'; // return to list view
        this.createNewPlan(); // reset form AFTER success
      },
      error: (err) => {
        this.showPopup.showResponsePopup(
          err.error?.message || 'Failed to create plan. Please try again.',
          500
        );
      }    });

  } else {

    this.planservice.createPlane(planData).subscribe({
      next: (response: any) => {

        this.showPopup.showResponsePopup(
          response.responseMessege || response.responseMessage,
          response.responseCode
        );

        this.loadPlans();     // refresh table
        this.viewMode = 'list'; // return to list view
        this.createNewPlan(); // reset form AFTER success
      },
      error: (err) => {
        this.showPopup.showResponsePopup(
          err.error?.message || 'Failed to create plan. Please try again.',
          500
        );
      }
    });
  }
}



  onCancel(): void {
    this.planForm.reset();
    this.isEditMode = false;
    this.selectedPlan = null;
    this.planToDelete = null;
    this.successMessage = '';
    this.viewMode = 'list';
  }

  private showSuccessMessage(message: string): void {
    this.successMessage = message;
    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }
  isPlanActive(plan: any): boolean {
    const today = new Date();
    const validityDate = new Date(plan.planValidity);
    return validityDate >= today;
  }
// viewMode: 'list' | 'form' = 'list';

openCreateForm(): void {
  this.viewMode = 'form';
  this.isEditMode = false;
  this.planForm.reset();
}


// Add these new properties
showSearch = false;
searchQuery = '';
filteredPlans: Plandto[] = [];
isRefreshing = false;

currentPageNumber = 0;
pageSize = 5;

get totalRecords(): number {
  return this.filteredPlans.length;
}

get totalPages(): number {
  return Math.ceil(this.totalRecords / this.pageSize);
}

get paginatedPlans(): Plandto[] {
  const start = this.currentPageNumber * this.pageSize;
  return this.filteredPlans.slice(start, start + this.pageSize);
}

goToPage(pageNumber: number): void {
  this.currentPageNumber = pageNumber;
}

changePageSize(newSize: number): void {
  this.pageSize = newSize;
  this.currentPageNumber = 0;
}

// Update loadPlans to also set filteredPlans
loadPlans(): void {
  this.isRefreshing = true;
  this.planservice.getPlanList().subscribe({
    next: (response: any) => {
      const plansList = response?.responseBody || (Array.isArray(response) ? response : []);
      this.plans = plansList;
      this.filterPlans(); // keep filter in sync
      this.currentPageNumber = 0;
      this.isRefreshing = false;
    },
    error: (err) => {
      console.error("Error loading plans:", err);
      this.isRefreshing = false;
    }
  });
}

// Add these new methods
toggleSearch(): void {
  this.showSearch = !this.showSearch;
  if (!this.showSearch) {
    this.clearSearch();
  }
}

clearSearch(): void {
  this.searchQuery = '';
  this.filterPlans();
}

filterPlans(): void {
  const q = this.searchQuery.toLowerCase().trim();
  this.filteredPlans = q
    ? this.plans.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.plannCategory?.toLowerCase().includes(q)
      )
    : [...this.plans];
  this.currentPageNumber = 0;
}
}


