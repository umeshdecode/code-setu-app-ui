import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { CompanyService } from 'src/app/services/company.service';
import { ShowpopupService } from 'src/app/services/showpopup.service';
import { LoginService } from 'src/app/services/login.service';
import { ViewcomponentComponent } from '../viewcomponent/viewcomponent.component';

@Component({
  selector: 'app-company',
  templateUrl: './company.component.html',
  styleUrls: ['./company.component.css']
})

export class CompanyComponent implements OnInit {
  @ViewChild('confirmDialog') confirmDialogTemplate!: TemplateRef<any>;
  @ViewChild('viewDialog') viewDialogTemplate!: TemplateRef<any>;

  companyList: any[] = [];
  selectedCompany: any = null;
  assetTypes: string[] = ['LOGO', 'SEAL/Signature', 'STAMP'];
  companyForm!: FormGroup;

  showForm = false;
  isEditMode = false;
  searchText = '';
  isLoading = false;
  selectedAssetFile: File | null = null;
  selectedAssetFileName = '';
  currentPageNumber = 0;
  pageSize = 5;
  addedAssets: { assetType: string; file: File; fileName: string }[] = [];

  countryCodes: any[] = [
    { name: 'India', code: '+91', cca2: 'IN' },
    { name: 'USA', code: '+1', cca2: 'US' },
    { name: 'UK', code: '+44', cca2: 'GB' },
    { name: 'UAE', code: '+971', cca2: 'AE' }
  ];

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private shoepopup: ShowpopupService,
    private dialog: MatDialog,
    private http: HttpClient,
    private loginService: LoginService
  ) { }

  ngOnInit(): void {
    this.loadCountryCodes();
    this.buildForm();
    this.loadCompanies();
  }

  buildForm() {
    const codePattern = '^\\+\\d{1,4}$';
    const numberPattern = '^\\d{10}$';
    const panPattern = '^[A-Z]{5}[0-9]{4}[A-Z]{1}$';
    // GST: 2 digits, 10 PAN chars, 1 entity digit, 'Z', 1 checksum char
    const gstPattern = '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$';

    this.companyForm = this.fb.group({
      companyId: [null],
      companyName: ['', Validators.required],
      companyEmail: ['', [Validators.required, Validators.email]],
      whatsappCode: ['+91', [Validators.pattern(codePattern)]],
      whatsappNumber: ['', [Validators.pattern(numberPattern)]],
      contactNo1Code: ['+91', [Validators.required, Validators.pattern(codePattern)]],
      contactNo1Number: ['', [Validators.required, Validators.pattern(numberPattern)]],
      contactNo2Code: ['+91', [Validators.pattern(codePattern)]],
      contactNo2Number: ['', [Validators.pattern(numberPattern)]],
      landlineNo: [''],
      tollFreeNumber: [''],
      panNumber: ['', [Validators.pattern(panPattern)]],
      gstNumber: ['', [Validators.pattern(gstPattern)]],
      address: [''],
      country: ['India'],
      state: [''],
      city: [''],
      branch: [''],
      mainBranch: [''],
      website: [''],
      isActive: [true],
      assetType: [''],
      assetFile: [null]
    });
  }

  loadCompanies() {
    this.companyService.getCompany().subscribe({
      next: (res: any) => {
        this.companyList = res.dataList || res.data || [];
        this.syncCurrentPage();
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  openCreateForm() {
    this.showForm = true;
    this.isEditMode = false;
    this.companyForm.reset();
    this.companyForm.patchValue({
      country: 'India',
      whatsappCode: '+91',
      contactNo1Code: '+91',
      contactNo2Code: '+91',
      isActive: true
    });
    this.clearAssetFile();
    this.addedAssets = [];
  }

  cancelForm() {
    this.showForm = false;
    this.companyForm.reset();
    this.clearAssetFile();
    this.addedAssets = [];
  }

  submitForm() {

    if (this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      return;
    }

    if (this.isEditMode) {

      const payload = this.getCompanyPayload();
      this.companyService.updateCompany(payload).subscribe({
        next: (response: any) => {
          this.shoepopup.showResponsePopup(response.responseMessege, response.responseCode)

          this.loadCompanies();
          this.cancelForm();
        },
        error: err => console.error(err)
      });

    } else {

      const payload = this.buildCreateCompanyFormData();
      this.companyService.createCompany(payload).subscribe({
        next: (response: any) => {
          this.shoepopup.showResponsePopup(response.responseMessege, response.responseCode)
          
          // Refresh JWT token after company creation
          this.loginService.refereseToken().subscribe({
            next: (tokenResponse: any) => {
              console.log('Token refreshed successfully', tokenResponse);
              if (tokenResponse?.token) {
                localStorage.setItem('token', tokenResponse.token);
              }
            },
            error: (err) => console.error('Token refresh failed:', err)
          });
          
          this.loadCompanies();
          this.cancelForm();
        },
        error: err => console.error(err)
      });

    }
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
        contactNo2Number: parsedContact2.number
      });
      this.clearAssetFile();
      this.addedAssets = [];
    } catch (e) {
      console.error("Error patching company form:", e);
    }
  }

  onAssetFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    this.selectedAssetFile = file;
    this.selectedAssetFileName = file?.name || '';
    this.companyForm.patchValue({ assetFile: file });
    this.companyForm.get('assetFile')?.updateValueAndValidity();
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

  addAssetToList(): void {
    const type = this.companyForm.get('assetType')?.value;
    if (type && this.selectedAssetFile) {
      if (this.addedAssets.some(x => x.assetType === type)) {
        this.shoepopup.showResponsePopup(`An asset of type ${type} has already been added.`, 400);
        return;
      }
      this.addedAssets.push({
        assetType: type,
        file: this.selectedAssetFile,
        fileName: this.selectedAssetFileName
      });
      this.companyForm.patchValue({ assetType: '' });
      this.clearAssetFile();
    }
  }

  removeAssetFromList(index: number): void {
    this.addedAssets.splice(index, 1);
  }

  private buildCreateCompanyFormData(): FormData {
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

  get filteredCompanyList() {

    if (!this.searchText) return this.companyList;

    return this.companyList.filter(x =>
      x.companyName?.toLowerCase().includes(this.searchText.toLowerCase()) ||
      x.companyEmail?.toLowerCase().includes(this.searchText.toLowerCase()) ||
      x.city?.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  filteredCompanies() {
    return this.filteredCompanyList;
  }

  get totalRecords(): number {
    return this.filteredCompanyList.length;
  }

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize);
  }

  get paginatedCompanies() {
    const start = this.currentPageNumber * this.pageSize;
    return this.filteredCompanyList.slice(start, start + this.pageSize);
  }

  get pageRecords(): number {
    return this.paginatedCompanies.length;
  }

  goToPage(pageNumber: number): void {
    this.currentPageNumber = pageNumber;
    this.syncCurrentPage();
  }

  changePageSize(newSize: number): void {
    this.pageSize = newSize;
    this.currentPageNumber = 0;
  }

  onSearchChange(): void {
    this.currentPageNumber = 0;
  }

  private syncCurrentPage(): void {
    const lastPage = Math.max(this.totalPages - 1, 0);
    if (this.currentPageNumber > lastPage) {
      this.currentPageNumber = lastPage;
    }
  }

  focusSearch(): void {
    setTimeout(() => {
      const searchInput = document.querySelector('.search-box input') as HTMLInputElement;
      searchInput?.focus();
    }, 100);
  }

  deleteCompany(id: number) {
    // Open the inline template as a dialog
    const dialogRef = this.dialog.open(this.confirmDialogTemplate, {
      width: '350px'
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.companyService.deleteCompany(id).subscribe({
          next: (response: any) => {
            this.shoepopup.showResponsePopup(response.responseMessege, response.responseCode);
            this.loadCompanies();
          },
          error: err => console.error(err)
        });
      }
    });
  }

  viewCompany(company: any) {
    if (!company) {
      return;
    }
    this.selectedCompany = company;
    this.dialog.open(ViewcomponentComponent, {
      width: '600px',
      data: {
        title: 'Company Details',
        details: [
          { label: 'Name', value: company.companyName },
          { label: 'Email', value: company.companyEmail, type: 'email' },
          { label: 'WhatsApp', value: company.whatsappNumber },
          { label: 'Contact 1', value: company.contactNo1 },
          { label: 'Contact 2', value: company.contactNo2 },
          { label: 'City', value: company.city },
          { label: 'State', value: company.state },
          { label: 'Country', value: company.country },
          { label: 'Branch', value: company.branch },
          { label: 'Main Branch', value: company.mainBranch },
          { label: 'PAN', value: company.panNumber },
          { label: 'GST', value: company.gstNumber },
          { label: 'Website', value: company.website, type: 'link' },
          { label: 'Status', value: company.isActive ? 'Active' : 'Inactive', type: 'status' }
        ]
      }
    });
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

  parsePhoneNumber(fullNo: any): { code: string, number: string } {
    if (fullNo === null || fullNo === undefined) return { code: '+91', number: '' };
    const str = fullNo.toString().trim();
    if (!str) return { code: '+91', number: '' };
    if (str.startsWith('+')) {
      const match = this.countryCodes.find(c => c.code && typeof c.code === 'string' && str.startsWith(c.code));
      if (match) {
        return {
          code: match.code,
          number: str.substring(match.code.length)
        };
      }
      const matchRegex = str.match(/^(\+\d{1,4})(\d+)$/);
      if (matchRegex) {
        return {
          code: matchRegex[1],
          number: matchRegex[2]
        };
      }
    }
    return { code: '+91', number: str };
  }
}
