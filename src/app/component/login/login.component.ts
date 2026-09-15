import { animate, style, transition, trigger } from '@angular/animations';
import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthResponse } from 'src/app/models/authresponse';
import { LoginService } from 'src/app/services/login.service';
import { switchMap } from 'rxjs';
import { CompanyService } from 'src/app/services/company.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogboxComponent } from '../dialogbox/dialogbox.component';
import { ShowpopupService } from 'src/app/services/showpopup.service';
import { ENV } from 'src/assets/env';
import { MOBILE_COUNTRIES, MobileCountry, DEFAULT_MOBILE_CODE, getMobileDigits, getMobilePattern, sanitizeMobileNumber } from 'src/app/models/mobile-codes';

declare const google: any;

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
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = false;

  credential = {
    email: '',
    userName: '',
    password: ''
  };

  hidePassword = true;
  userExists: boolean | null = null;
  checkingEmail = false;

  // Country/mobile-code config comes from the shared mobile-codes model
  countryCodes: MobileCountry[] = MOBILE_COUNTRIES;

  // Timer handle used to debounce the email-existence check on blur
  private emailBlurTimer: any = null;

  constructor(
    private loginService: LoginService,
    private router: Router,
    private companyService: CompanyService,
    private dialog: MatDialog,
    private showPopup: ShowpopupService
  ) { }

  ngOnInit(): void {
    // Country codes are now static – no API call needed
  }

  ngOnDestroy(): void {
    if (this.emailBlurTimer) {
      clearTimeout(this.emailBlurTimer);
    }
  }

  ngAfterViewInit(): void {
    this.initGoogleSignIn();
  }

  private googleInitialized = false;

  private initGoogleSignIn(): void {
    const clientId = ENV?.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn('GOOGLE_CLIENT_ID is not configured; Google login is disabled.');
      return;
    }
    if (typeof google === 'undefined') {
      // GSI script may not have loaded yet - retry shortly.
      setTimeout(() => this.initGoogleSignIn(), 300);
      return;
    }

    if (!this.googleInitialized) {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => this.handleGoogleCredential(response)
      });
      this.googleInitialized = true;
    }

    this.renderGoogleButton();
  }

  private renderGoogleButton(): void {
    // The OTP tab's content isn't in the DOM until it's selected at least once
    // (mat-tab-group lazily renders inactive tabs), so retry until the div shows up.
    const target = document.getElementById('googleSignInDiv');
    if (target) {
      target.innerHTML = '';
      google.accounts.id.renderButton(target, {
        theme: 'outline',
        size: 'large',
        width: 280,
        text: 'continue_with'
      });
    } else {
      setTimeout(() => this.renderGoogleButton(), 300);
    }
  }

  onTabChange(): void {
    if (this.googleInitialized) {
      this.renderGoogleButton();
    }
  }

  handleGoogleCredential(response: any) {
    if (!response?.credential) {
      this.showPopup.showError('Google sign-in failed. Please try again.');
      return;
    }
    this.isLoading = true;
    this.loginService.googleLogin(response.credential).pipe(
      switchMap((tokenResponse: AuthResponse) => {
        return this.loginService.loginAndFetchUser(tokenResponse.accessToken);
      })
    ).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);

        setTimeout(() => {
          this.companyService.getCurrentCompany().subscribe({
            next: (res) => {
              if (res && res.responseCode === 200 && res.data) {
                this.companyService.setCompanyStatus(true);
              } else {
                this.companyService.setCompanyStatus(false);
              }
            },
            error: (err) => {
              console.warn('getCurrentCompany failed, likely no company bound:', err);
              this.companyService.setCompanyStatus(false);
            }
          });
        }, 1500);
      },
      error: (err) => {
        console.error('Google login failed', err);
        this.showPopup.showApiError(err, 'Google login failed');
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  otp = {
    mobileCode: DEFAULT_MOBILE_CODE,
    mobile: '',
    code: ''
  };
  otpSent = false;

  get mobileDigits(): number {
    return getMobileDigits(this.otp.mobileCode);
  }

  get mobilePlaceholder(): string {
    return '0'.repeat(this.mobileDigits);
  }

  /** Re-trims the typed number when the country code changes. */
  onMobileCodeChange(): void {
    this.otp.mobile = sanitizeMobileNumber(this.otp.mobile, this.otp.mobileCode);
  }

  onMobileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = sanitizeMobileNumber(input.value, this.otp.mobileCode);
    if (input.value !== digits) {
      input.value = digits;
    }
    this.otp.mobile = digits;
  }

  checkEmailExists() {
    // Clear any previous pending check
    if (this.emailBlurTimer) {
      clearTimeout(this.emailBlurTimer);
    }

    const email = this.credential.email?.trim();
    if (!email) {
      this.userExists = null;
      return;
    }

    // Debounce: wait 300ms after blur before checking.
    // Do NOT auto-redirect — browser autofill can trigger blur before the
    // user has intentionally interacted with the field, causing spurious
    // redirects to /signup. We only show a hint message; the user decides.
    this.emailBlurTimer = setTimeout(() => {
      // Skip the check if focus is still within the login form
      // (e.g., user tabbed to the password field).
      const focused = document.activeElement as HTMLElement;
      const loginForm = document.querySelector('form');
      if (loginForm && loginForm.contains(focused)) {
        return;
      }

      this.checkingEmail = true;
      this.loginService.checkUserExists(email).subscribe({
        next: (res) => {
          this.userExists = res.exists;
          this.checkingEmail = false;
          // NOTE: Do NOT redirect here. If the user doesn't exist,
          // we show a message with a link to signup — the user chooses.
        },
        error: () => {
          // Don't block login on a failed check – let the actual login call decide.
          this.userExists = null;
          this.checkingEmail = false;
        }
      });
    }, 300);
  }

  goToSignup() {
    const email = this.credential.email?.trim();
    this.router.navigate(['/signup'], email ? { queryParams: { email } } : {});
  }

  loginWithEmail() {
    if (!this.credential.email || !this.credential.password) {
      this.showPopup.showError('Missing fields');
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
        this.router.navigate(['/dashboard']);

        setTimeout(() => {
          this.companyService.getCurrentCompany().subscribe({
            next: (res) => {
              if (res && res.responseCode === 200 && res.data) {
                this.companyService.setCompanyStatus(true);
              } else {
                this.companyService.setCompanyStatus(false);
              }
            },
            error: (err) => {
              console.warn('getCurrentCompany failed, likely no company bound:', err);
              this.companyService.setCompanyStatus(false);
            }
          });
        }, 1500);
      },
      error: (err) => {
        console.error('API Error:', err);
        this.showPopup.showApiError(err, 'Login or Profile fetch failed');
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



  sendOtp() {
    if (!this.otp.mobile) {
      this.showPopup.showError('Enter mobile number');
      return;
    }
    if (!getMobilePattern(this.otp.mobileCode).test(this.otp.mobile)) {
      this.showPopup.showError(`Mobile number must be ${this.mobileDigits} digits for ${this.otp.mobileCode}`);
      return;
    }
    this.isLoading = true;
    this.loginService.sendOtp(this.otp.mobile).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.otpSent = true;
        this.showPopup.showSuccess('Your mockOtp is : ' + res.mockOtp);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Send OTP failed', err);
        this.showPopup.showApiError(err, 'Failed to send OTP. Is the number registered?');
      }
    });
  }

  verifyOtp() {
    if (!this.otp.code || this.otp.code.length !== 6) {
      this.showPopup.showError('Invalid OTP');
      return;
    }
    this.isLoading = true;
    this.loginService.verifyOtp(this.otp.mobile, this.otp.code).pipe(
      switchMap((response: AuthResponse) => {
        return this.loginService.loginAndFetchUser(response.accessToken);
      })
    ).subscribe({
      next: (userDetails) => {
        this.isLoading = false;
        console.log('User Details fetched:', userDetails);
        this.router.navigate(['/dashboard']);

        setTimeout(() => {
          this.companyService.getCurrentCompany().subscribe({
            next: (res) => {
              if (res && res.responseCode === 200 && res.data) {
                this.companyService.setCompanyStatus(true);
              } else {
                this.companyService.setCompanyStatus(false);
              }
            },
            error: (err) => {
              console.warn('getCurrentCompany failed, likely no company bound:', err);
              this.companyService.setCompanyStatus(false);
            }
          });
        }, 1500);
      },
      error: (err) => {
        console.error('Verify OTP failed', err);
        this.showPopup.showApiError(err, 'Invalid or expired OTP');
        this.isLoading = false;
      }
    });
  }

}



