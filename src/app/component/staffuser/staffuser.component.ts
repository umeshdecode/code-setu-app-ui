import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, AbstractControl, ValidationErrors, FormGroup } from '@angular/forms';
import { Staff } from 'src/app/models/staff';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { StaffuserServiceService } from 'src/app/services/staffuser-service';
import { GenericDataDTO } from 'src/app/models/generic-data-dto';
import { ShowpopupService } from 'src/app/services/showpopup.service';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { RoleserviceService } from 'src/app/services/role/roleservice.service';
import { DepartmentService } from 'src/app/services/department.service';
import { CompanyService } from 'src/app/services/company.service';
import { forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { PlaceLookupService, PlaceSuggestion } from 'src/app/services/place-lookup.service';
import { MOBILE_COUNTRIES, MobileCountry, getCountryFlag as countryFlag, getMobileDigits, getMobilePattern, sanitizeMobileNumber } from 'src/app/models/mobile-codes';


@Component({
  selector: 'app-staffuser',
  templateUrl: './staffuser.component.html',
  styleUrls: ['./staffuser.component.css']
})
export class StaffuserComponent implements OnInit {
  imagePreview: string | null = null;
  staffForm!: FormGroup;
  isSubmitting = false;
  selectedFile: File | null = null;
  previewImageUrl: string | null = null;
  uploadedImageUrl: string | null = null;
  uploadProgress: number = 0;
  uploadError: string | null = null;
  uploadSuccess: string | null = null;
  imageChangedEvent: any = '';
  croppedImage: any = ''; // Preview of the cropped version
  showCropper = false;
  isEditMode = false;
  staffId!: number;
  isLoading = false;
  showCreateForm = false;
  showUpdateForm = false;

  roles: any[] = [];
  departments: any[] = [];
  /**
   * The designations tblm_staff.staff_type actually holds (see the comment on
   * Staff.java). SUPERADMIN is excluded — it is seeded once and never assignable here.
   */
  readonly staffTypeOptions = [
    { value: 'COMPANY_ADMIN', label: 'Company Admin' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'DRIVER', label: 'Driver' },
    { value: 'ACCOUNTANT', label: 'Accountant' }
  ];
  mobileCountries: MobileCountry[] = MOBILE_COUNTRIES;
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private staffservice: StaffuserServiceService,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private roleservice: RoleserviceService,
    private departmentservice: DepartmentService,
    private companyService: CompanyService,
    private shoepopup: ShowpopupService,
    private placeLookup: PlaceLookupService
  ) {
    // this.initializeForm();

    // Get navigation from Router
    const navigation = this.router.getCurrentNavigation();

    // Try to get data from Router State OR History API fallback
    const receivedData = navigation?.extras.state?.['staffData'] || history.state?.['staffData'];

    if (receivedData) {
      console.log('Data received, patching...', receivedData);
      // Use a small timeout to ensure the form is fully ready in the DOM
      setTimeout(() => {
        this.patchStaffData(receivedData);
      });
    }
  }



  ngOnInit(): void {

    this.buildForm();
    this.loadRoles();
    this.loadDepartments();
    this.resolveCompanyId();

    this.route.params.subscribe(params => {
      if (params['staffId']) {
        this.isEditMode = true;
        this.staffId = +params['staffId'];
        this.loadStaffById();
      }
    });
  }

  currentCompanyId: number | null = null;

  private resolveCompanyId(): void {
    this.companyService.getCurrentCompany().subscribe({
      next: (res: any) => {
        if (res && res.responseCode === 200 && res.data) {
          this.currentCompanyId = res.data.companyId ?? res.data.id ?? null;
          this.staffForm?.patchValue({ companyId: this.currentCompanyId });
        }
      },
      error: () => this.currentCompanyId = null
    });
  }

  initializeForm() {
    this.staffForm = this.fb.group({
      userName: ['', [Validators.required, Validators.minLength(3)]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]],
      mobileCode: ['+91'],
      mobileNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      country: ['India'],
      state: [''],
      city: [''],
      address: [''],
      pincode: [null, [Validators.pattern('^[0-9]{6}$')]],
      departmentId: [null],
      staffType: ['', Validators.required],
      isActive: [true],
      dob: [null]
    });
  }
  closeCreateForm(): void {
    this.showCreateForm = false;
  }
    closeUpdateForm(): void {
    this.showUpdateForm = false;
  }
  loadStaffData() {
    const savedData = localStorage.getItem('currentStaff');
    if (savedData) {
      const staffData = JSON.parse(savedData);
      this.staffForm.patchValue(staffData);
    }
  }


  getCountryFlag(code: string): string {
    return countryFlag(code);
  }


  citySuggestions: PlaceSuggestion[] = [];

  buildForm() {
    this.staffForm = this.fb.group({
      staffId: [null],
      uuid: [''],
      userName: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      mobileCode: ['+91'],
      mobileNumber: ['', [Validators.required]],

      alternateMobile: [''],

      address: [''],
      city: [''],
      state: [''],
      pincode: ['', [Validators.pattern('^[0-9]{6}$')]],

      roleId: ['', Validators.required],
      departmentId: ['', Validators.required],
      companyId: [null],

      staffType: ['', Validators.required],
      isActive: [true],
      salary: [null],

      licenseNumber: [''],
      licenseExpiryDate: [''],
      profileImageUrl: ['']
    });

    // Server-driven city lookup — no hardcoded city list.
    this.staffForm.get('city')?.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter(val => typeof val === 'string'),
      switchMap(val => this.placeLookup.searchCities(val))
    ).subscribe(suggestions => {
      this.citySuggestions = suggestions;
    });

    // Keep mobile validation in sync with the selected country code.
    this.staffForm.get('mobileCode')?.valueChanges.subscribe(() => {
      this.refreshMobileValidators();
      const code = this.staffForm.get('mobileCode')?.value;
      ['mobileNumber', 'alternateMobile'].forEach(field => {
        const control = this.staffForm.get(field);
        if (control?.value) {
          control.setValue(sanitizeMobileNumber(control.value, code), { emitEvent: false });
        }
      });
    });
  }

  get mobileDigits(): number {
    return getMobileDigits(this.staffForm?.get('mobileCode')?.value);
  }

  get mobilePlaceholder(): string {
    return '0'.repeat(this.mobileDigits);
  }

  getMobileInputPattern(): RegExp {
    return getMobilePattern(this.staffForm?.get('mobileCode')?.value);
  }

  private refreshMobileValidators(): void {
    const mobileControl = this.staffForm?.get('mobileNumber');
    if (!mobileControl) return;
    mobileControl.setValidators([
      Validators.required,
      Validators.pattern(this.getMobileInputPattern())
    ]);
    mobileControl.updateValueAndValidity();
    const alt = this.staffForm.get('alternateMobile');
    if (alt) {
      alt.setValidators([Validators.pattern(this.getMobileInputPattern())]);
      alt.updateValueAndValidity();
    }
  }

  selectCity(cityName: string): void {
    // The control already holds cityName via its own value accessor; only
    // the state needs to be looked up and patched in alongside it.
    const place = this.citySuggestions.find(p => p.name === cityName);
    if (place?.state) {
      this.staffForm.get('state')?.setValue(place.state, { emitEvent: false });
    }
    this.citySuggestions = [];
  }

  onMobileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = sanitizeMobileNumber(input.value, this.staffForm?.get('mobileCode')?.value);
    if (input.value !== digits) {
      input.value = digits;
      this.staffForm?.get('mobileNumber')?.setValue(digits);
    }
  }
  loadStaffById() {
    this.staffservice.getStaffById(this.staffId).subscribe({
      next: (res) => {

        const data = res.data || res;
        this.staffId = data.staffId ?? data.id ?? this.staffId;

        const parsedMobile = this.parsePhone(data.mobileNumber || (data.mobileCode + data.mobileNumber), data.mobileCode || '+91');
        const parsedAltMobile = this.parsePhone(data.alternateMobile, '+91');

        this.staffForm.patchValue({
          staffId: this.staffId,
          uuid: data.uuid,
          userName: data.userName,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          mobileCode: parsedMobile.code,
          mobileNumber: parsedMobile.number,

          alternateMobile: parsedAltMobile.number,

          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,

          roleId: data.roles?.[0]?.roleId ?? data.roleIds?.[0] ?? data.roles?.[0]?.rolesId,
          departmentId: data.department?.departmentId ?? data.department?.id,
          companyId: data.companyId ?? this.currentCompanyId,

          staffType: data.staffType,
          isActive: data.isActive,
          salary: data.salary,

          licenseNumber: data.licenseNumber,
          licenseExpiryDate: data.licenseExpiryDate,
          profileImageUrl: data.profileImageUrl
        });
        this.refreshMobileValidators();
      }
    });
  }

  onSubmit() {
    if (this.staffForm.valid) {
      this.isSubmitting = true;
      this.staffservice.updateStaff(this.staffForm).subscribe({
        next: (response: GenericDataDTO) => {
          this.shoepopup.showResponsePopup(response.responseMessege, response.responseCode)
        }
      })
      console.log('Updated Staff Data:', this.staffForm.value);

      // Simulate API call
      setTimeout(() => {
        this.isSubmitting = false;
        alert('Staff profile updated successfully!');
        // this.router.navigate(['/staff-list']);
      }, 1500);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.staffForm.controls).forEach(key => {
        this.staffForm.get(key)?.markAsTouched();
      });
    }
  }

  onReset() {
    if (confirm('Are you sure you want to reset the form? All unsaved changes will be lost.')) {
      this.staffForm.reset({
        mobileCode: '+91',
        country: 'India',
        isActive: true
      });
    }
  }

  goBackToStaffDetails(): void {
    this.router.navigate(['/staffdetails']);
  }

  // onFileSelected(event: any) {
  //   const file = event.target.files[0];

  //   if (file) {
  //     // Validate file type
  //     const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  //     if (!allowedTypes.includes(file.type)) {
  //       this.uploadError = 'Only JPG and PNG images are allowed';
  //       return;
  //     }

  //     // Validate file size (5MB max)
  //     const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  //     if (file.size > maxSize) {
  //       this.uploadError = 'File size must be less than 5MB';
  //       return;
  //     }

  //     this.selectedFile = file;
  //     this.uploadError = null;
  //     this.uploadSuccess = null;

  //     // Create preview
  //     const reader = new FileReader();
  //     reader.onload = (e: any) => {
  //       this.previewImageUrl = e.target.result;
  //     };
  //     reader.readAsDataURL(file);

  //     // Upload immediately
  //     this.uploadImage();
  //   }
  // }
  uploadImage() {
    if (!this.selectedFile) {
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.uploadProgress = 0;
    this.uploadError = null;
    this.uploadSuccess = null;
    this.staffservice.profileUpload(formData).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress) {
          // Calculate upload progress
          this.uploadProgress = Math.round((100 * event.loaded) / event.total);
        } else if (event.type === HttpEventType.Response) {
          // Upload completed
          this.uploadProgress = 100;
          this.uploadSuccess = 'Image uploaded successfully!';

          // Assuming the response contains the image URL
          // Adjust based on your API response structure
          if (event.body && event.body.imageUrl) {
            this.uploadedImageUrl = event.body.imageUrl;
            this.staffForm.patchValue({ profileImageUrl: this.uploadedImageUrl });
          } else if (event.body && event.body.url) {
            this.uploadedImageUrl = event.body.url;
            this.staffForm.patchValue({ profileImageUrl: this.uploadedImageUrl });
          }

          // Clear success message after 3 seconds
          setTimeout(() => {
            this.uploadSuccess = null;
            this.uploadProgress = 0;
          }, 3000);
        }
      },
      error: (error) => {
        console.error('Upload error:', error);
        this.uploadError = error.error?.message || 'Failed to upload image. Please try again.';
        this.uploadProgress = 0;
        this.previewImageUrl = null;
        this.selectedFile = null;
      }
    });
  }
  removeImage() {
    this.selectedFile = null;
    this.previewImageUrl = null;
    this.uploadedImageUrl = null;
    this.uploadProgress = 0;
    this.uploadError = null;
    this.uploadSuccess = null;
    this.staffForm.patchValue({ profileImageUrl: '' });

    // Reset file input
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
  patchStaffData(data: any) {
    const parsedMobile = this.parsePhone(data.mobileNumber || (data.mobileCode + data.mobileNumber), data.mobileCode || '+91');
    const parsedAltMobile = this.parsePhone(data.alternateMobile, '+91');

    // Map the API data to your Form Controls
    this.staffForm.patchValue({

      staffId: data.staffId,
      uuid: data.uuid,
      userName: data.userName,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      mobileCode: parsedMobile.code,
      mobileNumber: parsedMobile.number,
      alternateMobile: parsedAltMobile.number,
      state: data.state,
      city: data.city,
      address: data.address,
      pincode: data.pincode,
      roleId: data.roles?.[0]?.roleId ?? data.roleIds?.[0],
      departmentId: data.department?.departmentId ?? data.department?.id,
      companyId: data.companyId ?? this.currentCompanyId,
      staffType: data.staffType,
      isActive: data.isActive,
      salary: data.salary,
      licenseNumber: data.licenseNumber,
      licenseExpiryDate: data.licenseExpiryDate,
      profileImageUrl: data.profileImageUrl
    });
    this.refreshMobileValidators();
    this.cd.detectChanges(); // Force UI update


    // Set profile image preview if URL exists
    if (data.profileImageUrl) {
      this.imagePreview = `http://localhost:8080/images/${data.profileImageUrl}`;
    }
  }
  nFileSelected(event: any): void {
    this.imageChangedEvent = event;
    this.showCropper = true; // Show cropper UI
  }

  imageCropped(event: ImageCroppedEvent) {
    // 1. Set preview using the base64 string
    this.croppedImage = event.base64;

    // 2. Convert Base64 to a Blob/File for Spring Boot
    if (event.base64) {
      const blob = this.base64ToBlob(event.base64);
      this.selectedFile = new File([blob], "profile.png", { type: 'image/png' });
    }
  }

  confirmCrop() {
    this.showCropper = false;
    this.previewImageUrl = this.croppedImage; // Update UI avatar
    this.uploadImage(); // Call your existing Spring Boot upload method
  }
  // Helper method to convert base64 to Blob
  private base64ToBlob(base64: string): Blob {
    const byteString = atob(base64.split(',')[1]);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const int8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
      int8Array[i] = byteString.charCodeAt(i);
    }
    return new Blob([int8Array], { type: 'image/png' });
  }
  // Replace your old onFileSelected and add the handler
  onFileSelected(event: any) {
    if (event.target.files && event.target.files[0]) {
      this.imageChangedEvent = event;
      this.showCropper = true;
    }
  }

  handleCroppedImage(file: File) {
    this.showCropper = false;
    this.selectedFile = file;

    // Set local preview for the form
    const reader = new FileReader();
    reader.onload = (e: any) => this.previewImageUrl = e.target.result;
    reader.readAsDataURL(file);

    // Trigger your Spring Boot upload logic
    this.uploadImage();
  }

  submit() {

    if (this.staffForm.invalid) {
      this.staffForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const form = this.staffForm.value;

    const payload: any = {

      staffId: form.staffId,
      uuid: form.uuid,
      userName: form.userName,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password || undefined,
      mobileCode: form.mobileCode,
      mobileNumber: form.mobileNumber,
      alternateMobile: form.alternateMobile || undefined,

      // Roles: send ids only (backend StaffDTO uses roleIds)
      roles: [],
      roleIds: form.roleId ? [Number(form.roleId)] : [],

      department: {
        departmentId: form.departmentId,
        departmentName: ''
      },

      companyId: form.companyId ?? this.currentCompanyId,

      address: form.address,
      city: form.city,
      state: form.state,
      pincode: form.pincode,

      staffType: form.staffType,
      isActive: form.isActive,
      salary: form.salary ?? 0,

      licenseNumber: form.licenseNumber,
      licenseExpiryDate: form.licenseExpiryDate,
      profileImageUrl: form.profileImageUrl || undefined
    };

    if (this.isEditMode) {
      this.staffservice.updateStaffRecord(this.staffId, payload).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          if (res && res.responseMessege) {
            this.shoepopup.showResponsePopup(res.responseMessege, res.responseCode);
          } else if (res && res.responseMessage) {
            this.shoepopup.showResponsePopup(res.responseMessage, res.responseCode);
          } else {
            this.shoepopup.showSuccess('Staff Updated Successfully');
          }
          this.router.navigate(['/staffdetails']);
        },
        error: (err: any) => {
          this.isLoading = false;
          console.error(err);
          const errorMsg = err?.error?.responseMessage || err?.error?.responseMessege || err?.message || 'Failed to update staff';
          const errorCode = err?.error?.responseCode || err?.status || 400;
          this.shoepopup.showResponsePopup(errorMsg, errorCode);
        }
      });

    } else {

      this.staffservice.createStaffRecord(payload).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          if (res && res.responseMessege) {
            this.shoepopup.showResponsePopup(res.responseMessege, res.responseCode);
          } else if (res && res.responseMessage) {
            this.shoepopup.showResponsePopup(res.responseMessage, res.responseCode);
          } else {
            this.shoepopup.showSuccess('Staff Created Successfully');
          }
          this.router.navigate(['/staffdetails']);
        },
        error: (err: any) => {
          this.isLoading = false;
          console.error(err);
          const errorMsg = err?.error?.responseMessage || err?.error?.responseMessege || err?.message || 'Failed to create staff';
          const errorCode = err?.error?.responseCode || err?.status || 400;
          this.shoepopup.showResponsePopup(errorMsg, errorCode);
        }
      });

    }

  }

  loadRoles() {
  this.roleservice.getRole().subscribe({
    next: (res: any) => {
      const list = res?.dataList ?? res?.data ?? res ?? [];
      this.roles = (Array.isArray(list) ? list : []).map((role: any) => ({
        roleId: role.roleId ?? role.rolesId ?? role.id ?? null,
        roleName: role.roleName ?? role.name ?? role.code ?? ''
      }));
    },
    error: (err) => {
      console.error('Roles error', err);
      this.roles = [];
    }
  });
}
loadDepartments() {
    this.departmentservice.getAll().subscribe({
    next: (res: any) => {
      const list = res?.dataList ?? res?.data ?? res ?? [];
      this.departments = (Array.isArray(list) ? list : []).map((dept: any) => ({
        departmentId: dept.departmentId ?? dept.id ?? null,
        departmentName: dept.departmentName ?? dept.name ?? dept.code ?? ''
      }));
    },
    error: (err) => {
      console.error('Department error', err);
      this.departments = [];
    }
  });
}
getSelectedRoleName(): string {
  const role = this.roles.find((r: any) =>
    r.roleId == this.staffForm.value.roleId
  );
  return role?.roleName || '-';
}

getSelectedDepartmentName(): string {
  const dept = this.departments.find((d: any) =>
    d.departmentId == this.staffForm.value.departmentId
  );
  return dept?.departmentName || '-';
}

parsePhone(fullNo: any, defaultCode: string = '+91'): { code: string, number: string } {
  if (fullNo === null || fullNo === undefined) return { code: defaultCode, number: '' };
  let str = fullNo.toString().replace(/[^\d+]/g, '').trim();
  if (!str) return { code: defaultCode, number: '' };

  let code = defaultCode;
  if (!str.startsWith('+')) {
    const match = this.mobileCountries.find(c => {
      if (!c.code) return false;
      const cleanCode = c.code.replace('+', '');
      return str.startsWith(cleanCode) && str.length > 10;
    });
    if (match) {
      code = match.code;
      const cleanCode = match.code.replace('+', '');
      str = str.substring(cleanCode.length);
    }
  } else {
    const match = this.mobileCountries.find(c => c.code && str.startsWith(c.code));
    if (match) {
      code = match.code;
      str = str.substring(match.code.length);
    }
  }

  const codeDigits = code.replace('+', '');
  while (str.startsWith(codeDigits) && str.length > 10) {
    str = str.substring(codeDigits.length);
  }

  return { code: code, number: str };
}
}

