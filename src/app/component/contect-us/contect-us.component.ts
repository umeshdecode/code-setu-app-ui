import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { InquiryService } from 'src/app/services/inquiry.service';
import { MOBILE_COUNTRIES, MobileCountry, DEFAULT_MOBILE_CODE, getMobileDigits, getMobilePattern, sanitizeMobileNumber } from 'src/app/models/mobile-codes';
import { ShowpopupService } from 'src/app/services/showpopup.service';

@Component({
  selector: 'app-contect-us',
  standalone: true, 
  templateUrl: './contect-us.component.html',
  imports: [
    CommonModule, 
    MatCardModule, 
    MatIconModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatButtonModule,
    MatSelectModule,
    FormsModule
  ],
  styleUrls: ['./contect-us.component.css']
})
export class ContectUsComponent implements OnInit {
  contact = {
    fullName: '',
    mobileCode: DEFAULT_MOBILE_CODE,
    mobilenumber: '',
    email: '',
    message: ''
  };

  countryCodes: MobileCountry[] = MOBILE_COUNTRIES;

  constructor(
    private inquiryService: InquiryService,
    private showPopup: ShowpopupService
  ) { }

  ngOnInit(): void { }

  get mobileDigits(): number {
    return getMobileDigits(this.contact.mobileCode);
  }

  get mobilePlaceholder(): string {
    return '0'.repeat(this.mobileDigits);
  }

  get isMobileValid(): boolean {
    return getMobilePattern(this.contact.mobileCode).test(this.contact.mobilenumber || '');
  }

  /** Re-trims the typed number when the country code changes. */
  onMobileCodeChange(): void {
    this.contact.mobilenumber = sanitizeMobileNumber(this.contact.mobilenumber, this.contact.mobileCode);
  }

  onMobileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = sanitizeMobileNumber(input.value, this.contact.mobileCode);
    if (input.value !== digits) {
      input.value = digits;
    }
    this.contact.mobilenumber = digits;
  }

  sendMessage(): void {
    if (!this.isMobileValid) {
      this.showPopup.showError(`Mobile number must be ${this.mobileDigits} digits for ${this.contact.mobileCode}`);
      return;
    }

    const payload = {
      name: this.contact.fullName,
      email: this.contact.email,
      phone: (this.contact.mobileCode || '') + this.contact.mobilenumber,
      subject: "Inquiry from CargoSetu Website",
      message: this.contact.message
    };

    this.inquiryService.sendInquiry(payload).subscribe({
      next: (response: any) => {
        const successMsg = response?.responseMessage || response?.responseMessege || 'Your message has been sent successfully!';
        this.showPopup.showSuccess(successMsg);
        
        // Reset the form
        this.contact = {
          fullName: '',
          mobileCode: DEFAULT_MOBILE_CODE,
          mobilenumber: '',
          email: '',
          message: ''
        };
      },
      error: (err) => {
        console.error("Inquiry Error:", err);
        const errorMsg = err.error?.responseMessage || err.error?.responseMessege || err.error?.message || 'Failed to send message. Please try again.';
        this.showPopup.showError(errorMsg);
      }
    });
  }
}
