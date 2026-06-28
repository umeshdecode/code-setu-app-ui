import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { HttpClient } from '@angular/common/http';
import { InquiryService } from 'src/app/services/inquiry.service';
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
    mobileCode: '+91',
    mobilenumber: '',
    email: '',
    message: ''
  };

  countryCodes: any[] = [
    { name: 'India', code: '+91', cca2: 'IN' },
    { name: 'USA', code: '+1', cca2: 'US' },
    { name: 'UK', code: '+44', cca2: 'GB' },
    { name: 'UAE', code: '+971', cca2: 'AE' }
  ];

  constructor(
    private inquiryService: InquiryService,
    private showPopup: ShowpopupService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.loadCountryCodes();
  }

  loadCountryCodes(): void {
    this.http.get<any[]>('https://restcountries.com/v3.1/all?fields=name,idd,cca2').subscribe({
      next: (countries) => {
        if (Array.isArray(countries)) {
          this.countryCodes = countries
            .map(c => {
              const root = c.idd?.root || '';
              const suffix = c.idd?.suffixes?.[0] || '';
              return {
                name: c.name?.common || '',
                code: root + suffix,
                cca2: c.cca2 || ''
              };
            })
            .filter(c => c.name && c.code)
            .sort((a, b) => a.name.localeCompare(b.name));
        }
      },
      error: (err) => {
        console.error("Error loading country codes:", err);
      }
    });
  }

  sendMessage(): void {
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
          mobileCode: '+91',
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
