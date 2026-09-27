import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LoaderComponent } from '../loader/loader.component';
import { VehiclePayload, VehicleService } from 'src/app/services/vehicle.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DialogboxComponent } from '../dialogbox/dialogbox.component';
import { VehicleTypePickerComponent } from '../shared/vehicle-type-picker/vehicle-type-picker.component';

@Component({
  selector: 'app-vehicle',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, LoaderComponent, MatDialogModule, VehicleTypePickerComponent],
  templateUrl: './vehicle.component.html',
  styleUrls: ['./vehicle.component.css']
})
export class VehicleComponent implements OnInit {
  vehicles: any[] = [];
  vehicleForm!: FormGroup;
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
  manufacturers: string[] = [];
  models: any[] = [];
  isLoadingModels = false;

  constructor(
    private fb: FormBuilder,
    private vehicleService: VehicleService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadVehicles();
    this.loadManufacturers();

    this.vehicleForm.get('manufacturer')?.valueChanges.subscribe(manufacturer => {
      this.vehicleForm.get('model')?.setValue('');
      this.models = [];
      if (manufacturer) {
        this.loadModelsForManufacturer(manufacturer);
      }
    });
  }

  loadManufacturers(): void {
    this.vehicleService.getManufacturers().subscribe({
      next: response => {
        this.manufacturers = this.extractList(response);
      },
      error: error => console.error('Failed to load manufacturers:', error)
    });
  }

  loadModelsForManufacturer(manufacturer: string): void {
    this.isLoadingModels = true;
    this.vehicleService.getModelsForManufacturer(manufacturer).subscribe({
      next: response => {
        this.models = this.extractList(response);
        this.isLoadingModels = false;
      },
      error: error => {
        console.error('Failed to load models:', error);
        this.isLoadingModels = false;
      }
    });
  }

  get isApiBusy(): boolean {
    return this.isLoading || this.isSaving || this.isDeleting;
  }

  get modelPlaceholder(): string {
    if (this.isLoadingModels) return 'Loading models...';
    if (!this.vehicleForm.get('manufacturer')?.value) return '-- Select manufacturer first --';
    return '-- Select Model --';
  }

  get filteredVehicles(): any[] {
    const search = this.searchText.trim().toLowerCase();

    return this.vehicles.filter(vehicle => {
      const matchesSearch = !search || [
        vehicle.registrationNumber,
        vehicle.vehicleType,
        vehicle.model,
        vehicle.manufacturer,
        vehicle.currentLocation
      ].join(' ').toLowerCase().includes(search);
      const matchesStatus = this.statusFilter === 'ALL' || vehicle.status === this.statusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  initForm(): void {
    this.vehicleForm = this.fb.group({
      chassisNumber: ['', Validators.required],
      engineNumber: ['', Validators.required],
      registrationNumber: ['', Validators.required],
      vehicleType: ['TRUCK', Validators.required],
      model: ['', Validators.required],
      manufacturer: ['', Validators.required],
      mileage: [0, [Validators.required, Validators.min(0)]],
      capacity: [0, [Validators.required, Validators.min(1)]],
      weightUnit: ['Kg', Validators.required],
      capacityCbm: [null],
      lengthCm: [null],
      widthCm: [null],
      heightCm: [null],
      bodyType: ['OPEN'],
      equipmentTags: [''],
      status: ['AVAILABLE', Validators.required],
      fuelType: ['DIESEL', Validators.required],
      registrationDate: [new Date().toISOString().slice(0, 10), Validators.required],
      insuranceExpiryDate: ['', Validators.required],
      pollutionExpiryDate: ['', Validators.required],
      currentLocation: ['', Validators.required]
    });
  }

  loadVehicles(): void {
    this.isLoading = true;
    this.error = '';

    this.vehicleService.getVehicles().subscribe({
      next: response => {
        this.vehicles = this.extractList(response);
        this.isLoading = false;
      },
      error: error => {
        console.error('Vehicle API failed:', error);
        this.error = this.getApiError(error, 'Unable to load vehicles.');
        this.isLoading = false;
      }
    });
  }

  submit(): void {
    if (this.vehicleForm.invalid) {
      this.vehicleForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.message = '';
    this.error = '';

    const formVal = this.vehicleForm.value;
    const computedCapacityKg = formVal.weightUnit === 'Ton' ? formVal.capacity * 1000 : formVal.capacity;

    const payload: VehiclePayload = {
      chassisNumber: formVal.chassisNumber,
      engineNumber: formVal.engineNumber,
      registrationNumber: formVal.registrationNumber,
      vehicleType: formVal.vehicleType,
      model: formVal.model,
      manufacturer: formVal.manufacturer,
      mileage: formVal.mileage,
      capacityKg: computedCapacityKg,
      capacityCbm: formVal.capacityCbm || undefined,
      lengthCm: formVal.lengthCm || undefined,
      widthCm: formVal.widthCm || undefined,
      heightCm: formVal.heightCm || undefined,
      bodyType: formVal.bodyType || undefined,
      equipmentTags: formVal.equipmentTags || undefined,
      status: formVal.status,
      fuelType: formVal.fuelType,
      registrationDate: formVal.registrationDate,
      insuranceExpiryDate: formVal.insuranceExpiryDate,
      pollutionExpiryDate: formVal.pollutionExpiryDate,
      currentLocation: formVal.currentLocation
    };

    const request = this.isEditMode && this.editId
      ? this.vehicleService.updateVehicle(this.editId, payload)
      : this.vehicleService.createVehicle(payload);

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.message = this.isEditMode ? 'Vehicle updated successfully.' : 'Vehicle created successfully.';
        this.reset();
      },
      error: error => {
        console.error('Save vehicle failed:', error);
        this.error = this.getApiError(error, 'Unable to save vehicle.');
        this.isSaving = false;
      }
    });
  }

  edit(vehicle: any): void {
    this.isEditMode = true;
    this.editId = vehicle.id || vehicle.vehicleId;
    
    const capKg = vehicle.capacityKg || 0;
    const isTon = capKg > 0 && capKg % 1000 === 0;

    if (vehicle.manufacturer) {
      this.loadModelsForManufacturer(vehicle.manufacturer);
    }

    // emitEvent: false - avoids the manufacturer valueChanges listener resetting
    // the model value we're patching in the same call.
    this.vehicleForm.patchValue({
      chassisNumber: vehicle.chassisNumber || '',
      engineNumber: vehicle.engineNumber || '',
      registrationNumber: vehicle.registrationNumber || '',
      vehicleType: vehicle.vehicleType || 'TRUCK',
      model: vehicle.model || '',
      manufacturer: vehicle.manufacturer || '',
      mileage: vehicle.mileage || 0,
      capacity: isTon ? capKg / 1000 : capKg,
      weightUnit: isTon ? 'Ton' : 'Kg',
      capacityCbm: vehicle.capacityCbm ?? null,
      lengthCm: vehicle.lengthCm ?? null,
      widthCm: vehicle.widthCm ?? null,
      heightCm: vehicle.heightCm ?? null,
      bodyType: vehicle.bodyType || 'OPEN',
      equipmentTags: vehicle.equipmentTags || '',
      status: vehicle.status || 'AVAILABLE',
      fuelType: vehicle.fuelType || 'DIESEL',
      registrationDate: vehicle.registrationDate || '',
      insuranceExpiryDate: vehicle.insuranceExpiryDate || '',
      pollutionExpiryDate: vehicle.pollutionExpiryDate || '',
      currentLocation: vehicle.currentLocation || ''
    }, { emitEvent: false });
  }

  delete(id: number): void {
    if (!id) return;

    const dialogRef = this.dialog.open(DialogboxComponent, {
      width: '420px',
      disableClose: true,
      data: {
        title: 'Delete Vehicle',
        message: 'Are you sure you want to delete this vehicle',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      this.isDeleting = true;
      this.message = '';
      this.error = '';

      this.vehicleService.deleteVehicle(id).subscribe({
        next: () => {
          this.isDeleting = false;
          this.message = 'Vehicle deleted successfully.';
          this.loadVehicles();
        },
        error: error => {
          console.error('Delete vehicle failed:', error);
          this.error = this.getApiError(error, 'Unable to delete vehicle.');
          this.isDeleting = false;
        }
      });
    });
  }

  reset(): void {
    this.vehicleForm.reset({
      vehicleType: 'TRUCK',
      mileage: 0,
      capacity: 0,
      weightUnit: 'Kg',
      capacityCbm: null,
      lengthCm: null,
      widthCm: null,
      heightCm: null,
      bodyType: 'OPEN',
      equipmentTags: '',
      status: 'AVAILABLE',
      fuelType: 'DIESEL',
      registrationDate: new Date().toISOString().slice(0, 10)
    });
    this.isEditMode = false;
    this.editId = null;
    this.loadVehicles();
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
}
