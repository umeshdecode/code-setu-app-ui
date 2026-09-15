import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LoaderComponent } from '../loader/loader.component';
import { DriverPayload, DriverService } from 'src/app/services/driver.service';
import { MOBILE_COUNTRIES, MobileCountry, DEFAULT_MOBILE_CODE, getMobileDigits, getMobilePattern, sanitizeMobileNumber } from 'src/app/models/mobile-codes';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DialogboxComponent } from '../dialogbox/dialogbox.component';

@Component({
  selector: 'app-driver',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, LoaderComponent, MatDialogModule],
  templateUrl: './driver.component.html',
  styleUrls: ['./driver.component.css']
})
export class DriverComponent implements OnInit {
  drivers: any[] = [];
  driverForm!: FormGroup;
  isEditMode = false;
  editId: number | null = null;
  searchText = '';
  statusFilter = 'ALL';
  isLoading = false;
  isSaving = false;
  isDeleting = false;
  message = '';
  error = '';
  showForm = true;

  countryCodes: MobileCountry[] = MOBILE_COUNTRIES;

  constructor(
    private fb: FormBuilder,
    private driverService: DriverService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadDrivers();
  }

  get isApiBusy(): boolean {
    return this.isLoading || this.isSaving || this.isDeleting;
  }

  get filteredDrivers(): any[] {
    const search = this.searchText.trim().toLowerCase();

    return this.drivers.filter(driver => {
      const matchesSearch = !search || [
        driver.name,
        driver.phoneNumber,
        driver.email,
        driver.licenseNumber
      ].join(' ').toLowerCase().includes(search);
      const matchesStatus = this.statusFilter === 'ALL' || driver.status === this.statusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  initForm(): void {
    const codePattern = '^\\+\\d{1,4}$';

    this.driverForm = this.fb.group({
      name: ['', Validators.required],
      phoneCode: [DEFAULT_MOBILE_CODE, [Validators.required, Validators.pattern(codePattern)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(getMobilePattern(DEFAULT_MOBILE_CODE))]],
      email: ['', [Validators.required, Validators.email]],
      licenseNumber: ['', Validators.required],
      licenseExpiryDate: ['', Validators.required],
      experienceYears: [0, [Validators.required, Validators.min(0)]],
      address: ['', Validators.required],
      status: ['AVAILABLE', Validators.required],
      joiningDate: [new Date().toISOString().slice(0, 10), Validators.required]
    });

    // Keep the phone-number length rule in sync with the selected country code.
    this.driverForm.get('phoneCode')?.valueChanges.subscribe(() => {
      this.refreshPhoneValidators();
      const phone = this.driverForm.get('phoneNumber');
      phone?.setValue(sanitizeMobileNumber(phone.value, this.driverForm.get('phoneCode')?.value), { emitEvent: false });
    });
  }

  get phoneDigits(): number {
    return getMobileDigits(this.driverForm?.get('phoneCode')?.value);
  }

  get phonePlaceholder(): string {
    return '0'.repeat(this.phoneDigits);
  }

  private refreshPhoneValidators(): void {
    const phone = this.driverForm?.get('phoneNumber');
    if (!phone) return;
    phone.setValidators([
      Validators.required,
      Validators.pattern(getMobilePattern(this.driverForm.get('phoneCode')?.value))
    ]);
    phone.updateValueAndValidity({ emitEvent: false });
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = sanitizeMobileNumber(input.value, this.driverForm?.get('phoneCode')?.value);
    if (input.value !== digits) {
      input.value = digits;
      this.driverForm.get('phoneNumber')?.setValue(digits);
    }
  }

  loadDrivers(): void {
    this.isLoading = true;
    this.error = '';

    this.driverService.getDrivers().subscribe({
      next: response => {
        this.drivers = this.extractList(response);
        this.isLoading = false;
      },
      error: error => {
        console.error('Driver API failed:', error);
        this.error = this.getApiError(error, 'Unable to load drivers.');
        this.isLoading = false;
      }
    });
  }

  submit(): void {
    if (this.driverForm.invalid) {
      this.driverForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.message = '';
    this.error = '';

    const formVal = this.driverForm.value;
    const payload = {
      ...formVal,
      phoneNumber: (formVal.phoneCode || '') + (formVal.phoneNumber || '')
    };
    delete (payload as any).phoneCode;

    const request = this.isEditMode && this.editId
      ? this.driverService.updateDriver(this.editId, payload as any)
      : this.driverService.createDriver(payload as any);

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.message = this.isEditMode ? 'Driver updated successfully.' : 'Driver created successfully.';
        this.reset();
      },
      error: error => {
        console.error('Save driver failed:', error);
        this.error = this.getApiError(error, 'Unable to save driver.');
        this.isSaving = false;
      }
    });
  }

  edit(driver: any): void {
    this.isEditMode = true;
    this.editId = driver.id || driver.driverId;
    const parsedPhone = this.parsePhoneNumber(driver.phoneNumber || '');
    this.driverForm.patchValue({
      name: driver.name || '',
      phoneCode: parsedPhone.code,
      phoneNumber: parsedPhone.number,
      email: driver.email || '',
      licenseNumber: driver.licenseNumber || '',
      licenseExpiryDate: driver.licenseExpiryDate || '',
      experienceYears: driver.experienceYears || 0,
      address: driver.address || '',
      status: driver.status || 'AVAILABLE',
      joiningDate: driver.joiningDate || ''
    });
  }

  delete(id: number): void {
    if (!id) return;

    const dialogRef = this.dialog.open(DialogboxComponent, {
      width: '420px',
      disableClose: true,
      data: {
        title: 'Delete Driver',
        message: 'Are you sure you want to delete this driver?',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      this.isDeleting = true;
      this.message = '';
      this.error = '';

      this.driverService.deleteDriver(id).subscribe({
        next: () => {
          this.isDeleting = false;
          this.message = 'Driver deleted successfully.';
          this.loadDrivers();
        },
        error: error => {
          console.error('Delete driver failed:', error);
          this.error = this.getApiError(error, 'Unable to delete driver.');
          this.isDeleting = false;
        }
      });
    });
  }

  reset(): void {
    this.driverForm.reset({
      phoneCode: DEFAULT_MOBILE_CODE,
      experienceYears: 0,
      status: 'AVAILABLE',
      joiningDate: new Date().toISOString().slice(0, 10)
    });
    this.isEditMode = false;
    this.editId = null;
    this.loadDrivers();
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (this.showForm) {
      this.reset();
    }
  }

  private extractList(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data?.content)) return response.data.content;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.dataList)) return response.dataList;
    return [];
  }

  private getApiError(error: any, fallback: string): string {
    return error?.error?.responseMessege || error?.error?.message || error?.message || fallback;
  }

  parsePhoneNumber(fullNo: string): { code: string, number: string } {
    if (!fullNo) return { code: '+91', number: '' };
    if (fullNo.startsWith('+')) {
      const match = this.countryCodes.find(c => fullNo.startsWith(c.code));
      if (match) {
        return {
          code: match.code,
          number: fullNo.substring(match.code.length)
        };
      }
      const matchRegex = fullNo.match(/^(\+\d{1,4})(\d+)$/);
      if (matchRegex) {
        return {
          code: matchRegex[1],
          number: matchRegex[2]
        };
      }
    }
    return { code: '+91', number: fullNo };
  }
}
