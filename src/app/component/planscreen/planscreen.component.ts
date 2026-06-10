import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { PlanserviceService } from 'src/app/services/planservice.service';

// Define an interface for type safety (optional but recommended)
interface Plan {
  name: string;
  price: number;
  duration: string;
  features: string[];
  buttonText: string;
  colorClass: string;
}
// Define an interface for structured data
interface PaymentDetails {
  cgst: number;
  sgst: number;
  totalPayable: number;
}
@Component({
  selector: 'app-planscreen',
  templateUrl: './planscreen.component.html',
  standalone:true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatIconModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatButtonModule
  ],
  styleUrls: ['./planscreen.component.css']
})

export class PlanscreenComponent implements OnInit {
  payment: PaymentDetails = { cgst: 0, sgst: 0, totalPayable: 0 };
  // Make these properties public so they can be accessed in the template
  public isPaymentModalVisible : boolean = false;
  public selectedPlan: Plan | null = null; // To hold the selected plan object


  plans: Plan[] = [];

  constructor(private planservice: PlanserviceService) { }

  ngOnInit(): void {
    this.loadPlans();
  }

  loadPlans(): void {
    this.planservice.getPublicPlanList().subscribe({
      next: (response: any) => {
        const rawPlans = response?.responseBody || (Array.isArray(response) ? response : []);
        this.plans = rawPlans.map((p: any) => ({
          name: p.name || 'Standard Plan',
          price: p.price || 0,
          duration: this.getDurationText(p.planValidity),
          features: [
            `Category: ${p.plannCategory || 'General'}`,
            `Valid Until: ${this.formatDate(p.planValidity)}`,
            'Create and Share - Unlimited Document',
            '24/7 Support'
          ],
          buttonText: 'Subscribe Now',
          colorClass: this.getColorClass(p.name)
        }));
      },
      error: (err) => {
        console.error("Error loading plans:", err);
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
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  private getColorClass(name: string): string {
    const n = name?.toLowerCase() || '';
    if (n.includes('gold')) return 'light-blue lighten-5';
    if (n.includes('silver')) return 'grey lighten-4';
    if (n.includes('platinum')) return 'blue-grey lighten-5';
    return 'grey lighten-4';
  }


    
  // Function to open the modal, now accepts the specific plan as an argument
  openPaymentModal(plan: Plan): void {

    this.selectedPlan = plan; // Set the selected plan
    this.isPaymentModalVisible = true;
    // You would integrate GST calculation logic here
      this.calculatePaymentBreakdown(this.selectedPlan.price); 

  }

  // Function to close the modal
  closePaymentModal(): void {
    this.isPaymentModalVisible = false;
    this.selectedPlan = null; // Clear the selected plan when closing
  }
calculatePaymentBreakdown(planPrice: number): void {
  const gstRate = 18; // Total GST Rate (18%)
  
  // 1. Calculate Total GST
  const totalGst = (planPrice * gstRate) / 100;

  // 2. Split for Intra-state (50% CGST, 50% SGST)
  this.payment.cgst = totalGst / 2;
  this.payment.sgst = totalGst / 2;

  // 3. Final Amount
  this.payment.totalPayable = planPrice + totalGst;
}


}

 
