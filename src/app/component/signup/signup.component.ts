import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { debounceTime, switchMap, of, filter } from 'rxjs';
import { StaffuserServiceService } from 'src/app/services/staffuser-service';
import { Route, Router } from '@angular/router';
import { ShowpopupService } from 'src/app/services/showpopup.service';
import { GenericDataDTO } from 'src/app/models/generic-data-dto';
import { LoginService } from 'src/app/services/login.service';
import { AuthResponse } from 'src/app/models/authresponse';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnInit {
  staffForm!: FormGroup;
  currentStep = 1;
  citySuggestions: any[] = [];
  submitting = false;
  hidePassword = true;
  hideConfirmPassword = true;
  countryCodes = [
    { name: 'India', code: '+91' },
    { name: 'USA', code: '+1' },
    { name: 'UK', code: '+44' },
    { name: 'UAE', code: '+971' }
  ];
  isLoading = false; // Add this property

  credential = {
    email: '',
    userName: '',
    password: ''
  };

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private staffService: StaffuserServiceService,
    private router: Router,
    private showpopupservice: ShowpopupService,
    private loginService: LoginService
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
        mobileNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
        mobileCode: ['+91', Validators.required],
        staffType: ['STAFF'],
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

  setupCitySearch() {
    this.staffForm.get('addressInfo.city')?.valueChanges.pipe(
      debounceTime(400),
      filter(val => typeof val === 'string'),
      switchMap(val => val?.length > 2 ? this.http.get(`https://photon.komoot.io/api/?q=${val}`) : of(null))
    ).subscribe((data: any) => {
      this.citySuggestions = data ? data.features : [];
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

  selectCity(city: any) {
    const props = city.properties;
    this.staffForm.get('addressInfo')?.patchValue({
      city: props.name,
      state: props.state || '',
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
      })
    ).subscribe({
      next: (userDetails: any) => {
        console.log('Auto login successful:', userDetails);
        this.router.navigate(['/dashboard']);
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


  private autoLogin(email: string, password: string) {
    return this.loginService.generateToken({ email, password });
  }

}
