import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CompanyService } from 'src/app/services/company.service';
import { ShowpopupService } from 'src/app/services/showpopup.service';
import { LoginService } from 'src/app/services/login.service';
import { MOBILE_COUNTRIES, MobileCountry, DEFAULT_MOBILE_CODE, getMobileDigits, getMobilePattern, sanitizeMobileNumber } from 'src/app/models/mobile-codes';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { PlaceLookupService, PlaceSuggestion } from 'src/app/services/place-lookup.service';

@Component({
  selector: 'app-company',
  templateUrl: './company.component.html',
  styleUrls: ['./company.component.css']
})

export class CompanyComponent implements OnInit {
  @ViewChild('confirmDialog') confirmDialogTemplate!: TemplateRef<any>;
  @ViewChild('sameAs1') sameAs1Checkbox!: import('@angular/core').ElementRef<HTMLInputElement>;
  @ViewChild('sameAs2') sameAs2Checkbox!: import('@angular/core').ElementRef<HTMLInputElement>;

  companyList: any[] = [];
  assetTypes: string[] = ['LOGO', 'SEAL/Signature', 'STAMP'];
  /** Pre-selected asset type so the field is never left empty. */
  readonly defaultAssetType = 'LOGO';
  /** Backend message for a pending deletion request; null hides the notice. */
  deletionNotice: string | null = null;
  companyForm!: FormGroup;

  showForm = false;
  isEditMode = false;
  isLoading = false;
  selectedAssetFile: File | null = null;
  selectedAssetFileName = '';
  addedAssets: { assetType: string; file: File; fileName: string }[] = [];

  countryCodes: MobileCountry[] = MOBILE_COUNTRIES;

  /** Phone fields that carry their own country code (`<field>Code` + `<field>Number`). */
  readonly phoneFields = ['whatsapp', 'contactNo1', 'contactNo2'];
  citySuggestions: PlaceSuggestion[] = [];

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private shoepopup: ShowpopupService,
    private dialog: MatDialog,
    private loginService: LoginService,
    private placeLookup: PlaceLookupService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.buildForm();
    this.loadCompanies();
  }

  buildForm() {
    const codePattern = '^\\+?\\d{1,4}$';
    const defaultNumberPattern = getMobilePattern(DEFAULT_MOBILE_CODE);
    const panPattern = '^[a-zA-Z]{5}[0-9]{4}[a-zA-Z]{1}$';
    const gstPattern = '^[0-9]{2}[a-zA-Z]{5}[0-9]{4}[a-zA-Z]{1}[1-9a-zA-Z]{1}[zZ][0-9a-zA-Z]{1}$';

    this.companyForm = this.fb.group({
      companyId: [null],
      companyName: ['', Validators.required],
      companyEmail: ['', [Validators.required, Validators.email]],
      whatsappCode: [DEFAULT_MOBILE_CODE, [Validators.pattern(codePattern)]],
      whatsappNumber: ['', [Validators.pattern(defaultNumberPattern)]],
      contactNo1Code: [DEFAULT_MOBILE_CODE, [Validators.required, Validators.pattern(codePattern)]],
      contactNo1Number: ['', [Validators.required, Validators.pattern(defaultNumberPattern)]],
      contactNo2Code: [DEFAULT_MOBILE_CODE, [Validators.pattern(codePattern)]],
      contactNo2Number: ['', [Validators.pattern(defaultNumberPattern)]],
      landlineNo: [''],
      tollFreeNumber: [''],
      panNumber: ['', [Validators.pattern(panPattern)]],
      gstNumber: ['', [Validators.pattern(gstPattern)]],
      address: [''],
      country: ['India'],
      state: [''],
      city: [''],
      website: [''],
      isActive: [true],
      assetType: [this.defaultAssetType],
      assetFile: [null]
    });

    // Each country code drives the digit count of its own number field.
    this.phoneFields.forEach(field => {
      this.companyForm.get(`${field}Code`)?.valueChanges.subscribe(() => {
        this.refreshPhoneValidators(field);
        const numberControl = this.companyForm.get(`${field}Number`);
        numberControl?.setValue(sanitizeMobileNumber(numberControl.value, this.codeOf(field)), { emitEvent: false });
      });
    });

    // Server-driven city lookup — no hardcoded city list.
    this.companyForm.get('city')?.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter(val => typeof val === 'string'),
      switchMap(val => this.placeLookup.searchCities(val))
    ).subscribe(suggestions => {
      this.citySuggestions = suggestions;
    });
    this.companyForm.get('whatsappNumber')?.valueChanges.subscribe(() => {
      if (this.sameAs1Checkbox?.nativeElement) this.sameAs1Checkbox.nativeElement.checked = false;
      if (this.sameAs2Checkbox?.nativeElement) this.sameAs2Checkbox.nativeElement.checked = false;
    });

    this.companyForm.get('whatsappCode')?.valueChanges.subscribe(() => {
      if (this.sameAs1Checkbox?.nativeElement) this.sameAs1Checkbox.nativeElement.checked = false;
      if (this.sameAs2Checkbox?.nativeElement) this.sameAs2Checkbox.nativeElement.checked = false;
    });

    // Monitor and log invalid controls for easier troubleshooting
    this.companyForm.statusChanges.subscribe(status => {
      if (status === 'INVALID') {
        const errorsList: string[] = [];
        const controls = this.companyForm.controls;
        for (const name in controls) {
          if (controls[name].invalid) {
            errorsList.push(`${name}: invalid (errors: ${JSON.stringify(controls[name].errors)}, value: "${controls[name].value}")`);
          }
        }
        console.warn('❌ Company form is INVALID. Reasons:\n' + errorsList.join('\n'));
      }
    });
  }

  loadCompanies() {
    this.isLoading = true;
    this.companyService.getCurrentCompany().subscribe({
      next: (res: any) => {
        let data = res.dataList || res.data;
        this.companyList = Array.isArray(data) ? data : (data ? [data] : []);
        if (this.companyList.length > 0) {
          this.companyList = this.companyList.slice(0, 1);
          this.companyService.setCompanyStatus(true);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  openCreateForm() {
    this.showForm = true;
    this.isEditMode = false;
    this.clearAssetFile();
    this.addedAssets = [];
    this.companyForm.reset();
    this.companyForm.patchValue({
      country: 'India',
      whatsappCode: DEFAULT_MOBILE_CODE,
      contactNo1Code: DEFAULT_MOBILE_CODE,
      contactNo2Code: DEFAULT_MOBILE_CODE,
      isActive: true,
      assetType: this.nextAssetType()
    });
  }

  cancelForm() {
    this.showForm = false;
    this.companyForm.reset();
    this.companyForm.patchValue({ assetType: this.defaultAssetType });
    this.clearAssetFile();
    this.addedAssets = [];
    if (this.sameAs1Checkbox?.nativeElement) this.sameAs1Checkbox.nativeElement.checked = false;
    if (this.sameAs2Checkbox?.nativeElement) this.sameAs2Checkbox.nativeElement.checked = false;
  }

  submitForm() {

    if (this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      return;
    }

    if (this.isEditMode) {

      const payload = this.buildCompanyFormData();
      this.companyService.updateCompany(payload).subscribe({
        next: (response: any) => {
          this.shoepopup.showResponsePopup(response.responseMessege, response.responseCode)

          this.companyService.setCompanyStatus(true);
          this.applyCompanyResponse(response);
          this.refreshSessionAfterCompanyChange();

          this.cancelForm();
        },
        error: err => {
          console.error(err);
          this.shoepopup.showApiError(err, 'Failed to update the company.');
        }
      });

    } else {

      const payload = this.buildCompanyFormData();
      this.companyService.createCompany(payload).subscribe({
        next: (response: any) => {
          this.shoepopup.showResponsePopup(response.responseMessege, response.responseCode)

          this.companyService.setCompanyStatus(true);
          this.applyCompanyResponse(response);
          this.refreshSessionAfterCompanyChange();

          this.cancelForm();

          // Only send the user on to plan selection on a genuine success — this
          // backend answers HTTP 200 even for a validation failure (e.g. a
          // duplicate company email), with the real outcome in responseCode.
          const isSuccess = response?.responseCode === 200 || response?.responseCode === 201;
          const companyId = response?.data?.companyId;
          if (isSuccess && companyId) {
            this.router.navigate(['/select-plan'], { queryParams: { companyId } });
          }
        },
        error: err => {
          console.error(err);
          this.shoepopup.showApiError(err, 'Failed to create the company.');
        }
      });

    }
  }

  // Show the company profile immediately from the create/update response data.
  private applyCompanyResponse(response: any): void {
    const data = response?.data || response?.dataList?.[0];
    if (data && typeof data === 'object') {
      this.companyList = [data];
    }
  }

  // Refresh the JWT and rebuild the session (token, user_session, user) so the
  // newly created/updated company is bound to the current logged-in session.
  private refreshSessionAfterCompanyChange(): void {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) return;

    this.loginService.refreshSession().subscribe({
      next: (userDetails: any) => {
        console.log('Session refreshed successfully after company change', userDetails);
        // Re-pull the current company so the profile reflects the fresh token/data.
        this.loadCurrentCompany();
      },
      error: (err) => console.error('Session refresh failed:', err)
    });
  }

  private loadCurrentCompany(): void {
    this.companyService.getCurrentCompany().subscribe({
      next: (res: any) => {
        if (res && res.responseCode === 200 && res.data) {
          this.companyList = [res.data];
          this.companyService.setCompanyStatus(true);
        }
      },
      error: (err) => console.warn('getCurrentCompany failed:', err)
    });
  }

  getCompanyLogoUrl(company: any): string | null {
    if (company?.assets && Array.isArray(company.assets)) {
      const logoAsset = company.assets.find((a: any) => a.assetType === 'LOGO');
      if (logoAsset && logoAsset.fileUrl) {
        return logoAsset.fileUrl;
      }
    }
    return company?.logoBase64 || null;
  }

  /** Persistent entry point back to plan selection — reusable any time, not just right after creation. */
  goToPlanSelection(companyId: number): void {
    this.router.navigate(['/select-plan'], { queryParams: { companyId } });
  }

  editCompany(company: any) {
    console.log("Editing company:", company);
    if (!company || !this.companyForm) {
      console.warn("Company object or companyForm is not defined.");
      return;
    }
    try {
      this.showForm = true;
      this.isEditMode = true;
      this.clearAssetFile();
      this.addedAssets = [];

      const parsedWhatsapp = this.parsePhoneNumber(company.whatsappNumber);
      const parsedContact1 = this.parsePhoneNumber(company.contactNo1);
      const parsedContact2 = this.parsePhoneNumber(company.contactNo2);

      this.companyForm.patchValue({
        ...company,
        whatsappCode: parsedWhatsapp.code,
        whatsappNumber: parsedWhatsapp.number,
        contactNo1Code: parsedContact1.code,
        contactNo1Number: parsedContact1.number,
        contactNo2Code: parsedContact2.code,
        contactNo2Number: parsedContact2.number,
        assetType: this.nextAssetType()
      });
    } catch (e) {
      console.error("Error patching company form:", e);
    }
  }
  confirmWebsiteRedirect(url: string) {
    if (!url) return;
    const finalUrl = url.startsWith('http') ? url : `https://${url}`;
    const wantToRedirect = window.confirm(`Do you want to visit ${finalUrl}? This will open in a new tab.`);
    if (wantToRedirect) {
      window.open(finalUrl, '_blank');
    }
  }

  copyWhatsAppTo(targetField: string, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      const whatsappCode = this.companyForm.get('whatsappCode')?.value;
      const whatsappNumber = this.companyForm.get('whatsappNumber')?.value;
      
      this.companyForm.patchValue({
        [`${targetField}Code`]: whatsappCode,
        [`${targetField}Number`]: whatsappNumber
      });
    }
  }

  toUpperCase(controlName: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const upperValue = input.value.toUpperCase();
    this.companyForm.get(controlName)?.setValue(upperValue, { emitEvent: false });
    input.value = upperValue;
  }

  onAssetFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    this.selectedAssetFile = file;
    this.selectedAssetFileName = file?.name || '';
    this.companyForm.patchValue({ assetFile: file });
    this.companyForm.get('assetFile')?.updateValueAndValidity();
    
    this.checkAndAutoAddAsset();
  }

  clearAssetFile(): void {
    this.selectedAssetFile = null;
    this.selectedAssetFileName = '';
    this.companyForm?.patchValue({ assetFile: null });
    this.companyForm?.get('assetFile')?.updateValueAndValidity();
  }

  private getCompanyPayload(): any {
    const { assetFile, whatsappCode, whatsappNumber, contactNo1Code, contactNo1Number, contactNo2Code, contactNo2Number, ...payload } = this.companyForm.value;
    payload.whatsappNumber = whatsappNumber ? (whatsappCode || '') + whatsappNumber : '';
    payload.contactNo1 = contactNo1Number ? (contactNo1Code || '') + contactNo1Number : '';
    payload.contactNo2 = contactNo2Number ? (contactNo2Code || '') + contactNo2Number : '';
    return payload;
  }

  /**
   * Default selection for the Asset Type field: the first type not already
   * added, so the field is pre-filled without immediately clashing with an
   * asset the user has queued. Falls back to the first configured type.
   */
  nextAssetType(): string {
    const unused = this.assetTypes.find(type => !this.addedAssets.some(a => a.assetType === type));
    return unused || this.assetTypes[0] || this.defaultAssetType;
  }

  checkAndAutoAddAsset(): void {
    const type = this.companyForm.get('assetType')?.value;
    if (type && this.selectedAssetFile) {
      if (this.addedAssets.some(x => x.assetType === type)) {
        this.shoepopup.showResponsePopup(`An asset of type ${type} has already been added.`, 400);
        this.companyForm.patchValue({ assetType: this.nextAssetType() });
        this.clearAssetFile();
        return;
      }
      this.addedAssets.push({
        assetType: type,
        file: this.selectedAssetFile,
        fileName: this.selectedAssetFileName
      });
      this.companyForm.patchValue({ assetType: this.nextAssetType() });
      this.clearAssetFile();
    }
  }

  removeAssetFromList(index: number): void {
    this.addedAssets.splice(index, 1);
  }

  private buildCompanyFormData(): FormData {
    const formData = new FormData();
    const payload = this.getCompanyPayload();

    Object.keys(payload).forEach((key) => {
      if (key === 'assetType') {
        return;
      }

      const value = payload[key];
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value);
      }
    });

    this.addedAssets.forEach((asset, index) => {
      formData.append(`assets[${index}].assetType`, asset.assetType);
      formData.append(`assets[${index}].file`, asset.file, asset.fileName);
    });

    return formData;
  }

  // deleteCompany(id: number) {

  //   if (!confirm('Delete this company?')) return;

  //   this.companyService.deleteCompany(id).subscribe({
  //     next: (response:any) => {
  //       this.shoepopup.showResponsePopup(response.responseMessege, response.responseCode);
  //       this.loadCompanies();
  //     },
  //     error: err => console.error(err)
  //   });
  // }

  get hasCompany(): boolean {
    return this.companyList.length > 0;
  }

  get currentCompany(): any {
    return this.companyList[0] || null;
  }

  joinAddressParts(parts: any[]): string {
    return parts.filter(Boolean).join(', ');
  }

  deleteCompany(id: number) {
    // Open the inline template as a dialog
    const dialogRef = this.dialog.open(this.confirmDialogTemplate, {
      width: '380px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.companyService.deleteCompany(id).subscribe({
          next: (response: any) => {
            // Show whatever the backend reported, whichever spelling it used.
            const backendMessage =
              response?.responseMessage ||
              response?.responseMessege ||
              response?.message ||
              'Your company deletion request has been submitted.';
            this.shoepopup.showResponsePopup(backendMessage, response?.responseCode ?? 200);
            this.deletionNotice = backendMessage;
            this.companyList = [];
            this.companyService.setCompanyStatus(false);
            this.refreshSessionAfterCompanyChange();
          },
          error: err => {
            console.error(err);
            this.shoepopup.showApiError(err, 'Failed to submit the company deletion request.');
          }
        });
      }
    });
  }

  dismissDeletionNotice(): void {
    this.deletionNotice = null;
  }

  /** Lets a mousedown-selected suggestion register before the list is cleared on blur. */
  hideCitySuggestionsSoon(): void {
    setTimeout(() => this.citySuggestions = [], 150);
  }

  selectCity(place: PlaceSuggestion): void {
    this.companyForm.patchValue({
      city: place.name,
      state: place.state || this.companyForm.get('state')?.value
    }, { emitEvent: false });
    this.citySuggestions = [];
  }

  /** Currently selected country code for a phone field. */
  codeOf(field: string): string {
    return this.companyForm?.get(`${field}Code`)?.value || DEFAULT_MOBILE_CODE;
  }

  /** Allowed number of digits for a phone field, per the selected country code. */
  digitsOf(field: string): number {
    return getMobileDigits(this.codeOf(field));
  }

  placeholderOf(field: string): string {
    return '0'.repeat(this.digitsOf(field));
  }

  private refreshPhoneValidators(field: string): void {
    const numberControl = this.companyForm?.get(`${field}Number`);
    if (!numberControl) return;
    const validators = [Validators.pattern(getMobilePattern(this.codeOf(field)))];
    if (field === 'contactNo1') validators.unshift(Validators.required);
    numberControl.setValidators(validators);
    numberControl.updateValueAndValidity({ emitEvent: false });
  }

  onPhoneInput(field: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = sanitizeMobileNumber(input.value, this.codeOf(field));
    if (input.value !== digits) {
      input.value = digits;
      this.companyForm.get(`${field}Number`)?.setValue(digits);
    }
  }

  parsePhoneNumber(fullNo: any): { code: string, number: string } {
    if (fullNo === null || fullNo === undefined) return { code: '+91', number: '' };
    let str = fullNo.toString().replace(/[^\d+]/g, '').trim();
    if (!str) return { code: '+91', number: '' };

    let code = '+91';
    if (!str.startsWith('+')) {
      const match = this.countryCodes.find(c => {
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
      const match = this.countryCodes.find(c => c.code && str.startsWith(c.code));
      if (match) {
        code = match.code;
        str = str.substring(match.code.length);
      }
    }

    // Recursively strip duplicate country code digits from the front if str length is greater than 10
    const codeDigits = code.replace('+', '');
    while (str.startsWith(codeDigits) && str.length > 10) {
      str = str.substring(codeDigits.length);
    }

    return { code: code, number: str };
  }
}


