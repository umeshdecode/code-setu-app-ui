import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { debounceTime, switchMap, of, filter } from 'rxjs';
import { StaffuserServiceService } from 'src/app/services/staffuser-service';
import { ActivatedRoute, Route, Router } from '@angular/router';
import { ShowpopupService } from 'src/app/services/showpopup.service';
import { GenericDataDTO } from 'src/app/models/generic-data-dto';
import { LoginService } from 'src/app/services/login.service';
import { AuthResponse } from 'src/app/models/authresponse';
import { CompanyService } from 'src/app/services/company.service';
import { MatDialog } from '@angular/material/dialog';
import { DialogboxComponent } from '../dialogbox/dialogbox.component';
import { ENV } from 'src/assets/env';
import { PlaceLookupService } from 'src/app/services/place-lookup.service';
import { MOBILE_COUNTRIES, MobileCountry, DEFAULT_MOBILE_CODE, getMobileDigits, getMobilePattern, sanitizeMobileNumber } from 'src/app/models/mobile-codes';

declare const google: any;

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnInit, AfterViewInit {
  staffForm!: FormGroup;
  currentStep = 1;
  citySuggestions: any[] = [];
  submitting = false;
  hidePassword = true;
  hideConfirmPassword = true;
  countryCodes: MobileCountry[] = MOBILE_COUNTRIES;
  isLoading = false; // Add this property

  credential = {
    email: '',
    userName: '',
    password: ''
  };

  constructor(
    private fb: FormBuilder,
    private placeLookup: PlaceLookupService,
    private staffService: StaffuserServiceService,
    private router: Router,
    private showpopupservice: ShowpopupService,
    private loginService: LoginService,
    private companyService: CompanyService,
    private dialog: MatDialog,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.staffForm = this.fb.group({
      // STEP 1: Basic Info (No password here)
      basicInfo: this.fb.group({
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        // userName: [''],
        dob: [new Date()]
      }),

      // STEP 2: Contact Info
      otherInfo: this.fb.group({
        mobileNumber: ['', [Validators.required, Validators.pattern(getMobilePattern(DEFAULT_MOBILE_CODE))]],
        mobileCode: [DEFAULT_MOBILE_CODE, Validators.required],
        // staffType is not user-editable here: the backend derives it as COMPANY_ADMIN
        // for every self-signup, since that's the only role this flow ever creates.
        departmentId: [1],
        isActive: [true]
      }),

      // STEP 3: Address Info
      addressInfo: this.fb.group({
        city: ['', Validators.required],
        state: ['', Validators.required],
        pincode: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
        country: ['India'],
        address: ['Default Address']
      }),

      // STEP 4: Security Info (Password moved here)
      securityInfo: this.fb.group({
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required]
      }, { validators: this.passwordMatchValidator })
    });

    this.setupCitySearch();

    // Changing the country code re-applies the digit rule and trims the number.
    this.staffForm.get('otherInfo.mobileCode')?.valueChanges.subscribe(() => {
      this.refreshMobileValidators();
      const mobile = this.staffForm.get('otherInfo.mobileNumber');
      mobile?.setValue(sanitizeMobileNumber(mobile.value, this.mobileCode), { emitEvent: false });
    });

    const emailFromQuery = this.route.snapshot.queryParamMap.get('email');
    if (emailFromQuery) {
      this.staffForm.get('basicInfo.email')?.setValue(emailFromQuery);
    }
  }

  ngAfterViewInit(): void {
    this.initGoogleSignIn();
  }

  private googleInitialized = false;

  private initGoogleSignIn(): void {
    const clientId = ENV?.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn('GOOGLE_CLIENT_ID is not configured; Google sign-up is disabled.');
      return;
    }
    if (typeof google === 'undefined') {
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

    const target = document.getElementById('googleSignInDiv');
    if (target) {
      target.innerHTML = '';
      google.accounts.id.renderButton(target, {
        theme: 'outline',
        size: 'large',
        width: 280,
        text: 'signup_with'
      });
    }
  }

  handleGoogleCredential(response: any) {
    if (!response?.credential) {
      this.showpopupservice.showError('Google sign-in failed. Please try again.');
      return;
    }
    this.submitting = true;
    this.loginService.googleSignup(response.credential).pipe(
      switchMap((tokenResponse: AuthResponse) => {
        return this.loginService.loginAndFetchUser(tokenResponse.accessToken);
      })
    ).subscribe({
      next: (userDetails: any) => {
        this.loginService.setUserData(userDetails);
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
            error: () => this.companyService.setCompanyStatus(false)
          });
        }, 1500);
      },
      error: (err) => {
        console.error('Google sign-up failed', err);
        this.showpopupservice.showApiError(err, 'Google sign-up failed');
        this.submitting = false;
      },
      complete: () => {
        this.submitting = false;
      }
    });
  }

  // Password matching logic
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const pass = control.get('password')?.value;
    const confirm = control.get('confirmPassword')?.value;
    return pass && confirm && pass !== confirm ? { passwordMismatch: true } : null;
  }

  // Helper for HTML error messages
  isInvalid(groupName: string, controlName: string): boolean {
    const control = this.staffForm.get(`${groupName}.${controlName}`);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  get mobileCode(): string {
    return this.staffForm?.get('otherInfo.mobileCode')?.value;
  }

  get mobileDigits(): number {
    return getMobileDigits(this.mobileCode);
  }

  get mobilePlaceholder(): string {
    return '0'.repeat(this.mobileDigits);
  }

  private refreshMobileValidators(): void {
    const mobile = this.staffForm?.get('otherInfo.mobileNumber');
    if (!mobile) return;
    mobile.setValidators([Validators.required, Validators.pattern(getMobilePattern(this.mobileCode))]);
    mobile.updateValueAndValidity({ emitEvent: false });
  }

  restrictMobileNumber(event: Event): void {
    this.restrictDigits(event, 'otherInfo.mobileNumber', this.mobileDigits);
  }

  restrictPincode(event: Event): void {
    this.restrictDigits(event, 'addressInfo.pincode', 6);
  }

  private restrictDigits(event: Event, controlPath: string, maxLength: number): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/[^0-9]/g, '').slice(0, maxLength);
    this.staffForm.get(controlPath)?.setValue(digits, { emitEvent: false });
    if (input.value !== digits) {
      input.value = digits;
    }
  }

  setupCitySearch() {
    this.staffForm.get('addressInfo.city')?.valueChanges.pipe(
      debounceTime(400),
      filter(val => typeof val === 'string'),
      switchMap(val => this.placeLookup.searchCities(val))
    ).subscribe(suggestions => {
      this.citySuggestions = suggestions;
    });
  }

  getStepClass(stepNum: number) {
    if (this.currentStep > stepNum) return 'step completed';
    if (this.currentStep === stepNum) return 'step active';
    return 'step';
  }

  nextStep() {
    const currentGroup = this.getGroupForStep(this.currentStep);

    if (currentGroup?.valid) {
      if (this.currentStep < 4) {
        this.currentStep++;
      } else {
        this.submit();
      }
    } else {
      currentGroup?.markAllAsTouched();
      console.log(`Step ${this.currentStep} validation failed`);
    }
  }

  getGroupForStep(step: number): AbstractControl | null {
    switch (step) {
      case 1: return this.staffForm.get('basicInfo');
      case 2: return this.staffForm.get('otherInfo');
      case 3: return this.staffForm.get('addressInfo');
      case 4: return this.staffForm.get('securityInfo');
      default: return null;
    }
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  selectCity(place: any) {
    this.staffForm.get('addressInfo')?.patchValue({
      city: place.name,
      state: place.state || '',
    }, { emitEvent: false });
    this.citySuggestions = [];
  }

  submit() {
    if (!this.staffForm.valid) {
      this.staffForm.markAllAsTouched();
      return;
    }

    const payload = {
      ...this.staffForm.value.basicInfo,
      ...this.staffForm.value.otherInfo,
      ...this.staffForm.value.addressInfo,
      password: this.staffForm.value.securityInfo.password
    };

    const email = this.staffForm.value.basicInfo.email;
    const password = this.staffForm.value.securityInfo.password;

    this.submitting = true;

    this.staffService.createStaff(payload).pipe(
      switchMap((response: any) => {

        this.showpopupservice.showResponsePopup(
          response.responseMessege || response.responseMessage,
          response.responseCode
        );

        if (response.responseCode !== 200 && response.responseCode !== 201) {
          throw new Error('Signup failed');
        }

        // 👉 Auto login after successful signup
        return this.loginService.generateToken({ email, password });
      }),
      switchMap((authResponse: AuthResponse) => {
        return this.loginService.loginAndFetchUser(authResponse.accessToken);
      }),
      switchMap((userDetails: any) => {
        this.loginService.setUserData(userDetails);
        return of(userDetails);
      })
    ).subscribe({
      next: (userDetails: any) => {
        console.log('Auto login successful:', userDetails);
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
        console.error('Signup/Login flow error', err);
        this.submitting = false;
      },
      complete: () => {
        this.submitting = false;
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


  private autoLogin(email: string, password: string) {
    return this.loginService.generateToken({ email, password });
  }

}
