import { animate, style, transition, trigger } from '@angular/animations';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthResponse } from 'src/app/models/authresponse';
import { LoginService } from 'src/app/services/login.service';
import { LoaderComponent } from '../loader/loader.component';
import { switchMap, tap } from 'rxjs';
import { StaffuserServiceService } from 'src/app/services/staffuser-service';
import { JwttokenService } from 'src/app/services/jwttoken.service';
import { CompanyService } from 'src/app/services/company.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogboxComponent } from '../dialogbox/dialogbox.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  animations: [
    trigger('cardAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class LoginComponent implements OnInit {
  isLoading = false; // Add this property

  credential = {
    email: '',
    userName: '',
    password: ''
  };

  hidePassword = true;

  countryCodes: any[] = [
    { name: 'India', code: '+91', cca2: 'IN' },
    { name: 'USA', code: '+1', cca2: 'US' },
    { name: 'UK', code: '+44', cca2: 'GB' },
    { name: 'UAE', code: '+971', cca2: 'AE' }
  ];

  constructor(
    private loginService: LoginService,
    private router: Router,
    private http: HttpClient,
    private companyService: CompanyService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadCountryCodes();
  }

  otp = {
    mobileCode: '+91',
    mobile: '',
    code: ''
  };
  otpSent = false;

  loginWithEmail() {
    if (!this.credential.email || !this.credential.password) {
      alert('Missing fields');
      return;
    }
    this.isLoading = true;

    this.loginService.generateToken(this.credential).pipe(
      switchMap((response: AuthResponse) => {
        return this.loginService.loginAndFetchUser(response.accessToken);
      })
    ).subscribe({
      next: (userDetails) => {
        console.log('User Details fetched:', userDetails);
        this.companyService.getCurrentCompany().subscribe({
          next: (res) => {
            if (res && res.responseCode === 200 && res.data) {
              this.router.navigate(['/dashboard']);
            } else {
              this.showNoCompanyDialog();
            }
          },
          error: (err) => {
            console.warn('getCurrentCompany failed, likely no company bound:', err);
            this.showNoCompanyDialog();
          }
        });
      },
      error: (err) => {
        console.error('API Error:', err);
        alert('Login or Profile fetch failed');
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  showNoCompanyDialog() {
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
      if (confirmed) {
        this.router.navigate(['/company-create']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    });
  }



  verifyOtp() {
    if (!this.otp.code || this.otp.code.length !== 6) {
      alert('Invalid OTP');
      return;
    }


    // CALL BACKEND HERE
    console.log('OTP sent to', this.otp.mobile);
    this.otpSent = true;

  }
  sendOtp() {
    if (!this.otp.mobile) {
      alert('Enter mobile number');
      return;
    }
    console.log('Sending OTP to', (this.otp.mobileCode || '') + this.otp.mobile);
  }

  loadCountryCodes() {
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
        console.error('Failed to load country codes', err);
      }
    });
  }
}


