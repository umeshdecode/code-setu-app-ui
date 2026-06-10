import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
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
    FormsModule
  ],
  styleUrls: ['./contect-us.component.css']
})
export class ContectUsComponent implements OnInit {
  contact = {
    fullName: '',
    mobilenumber: '',
    email: '',
    message: ''
  };

  constructor(
    private inquiryService: InquiryService,
    private showPopup: ShowpopupService
  ) { }

  ngOnInit(): void {
  }

  sendMessage(): void {
    const payload = {
      name: this.contact.fullName,
      email: this.contact.email,
      phone: this.contact.mobilenumber,
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
