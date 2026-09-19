import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  AbstractControl, FormArray, FormBuilder, FormGroup, FormsModule,
  ReactiveFormsModule, Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Shipment, ShipmentItem, ShipmentPayload } from 'src/app/models/shipment';
import { ShipmentService } from 'src/app/services/shipment.service';
import { CustomersService } from 'src/app/services/customers.service';

@Component({
  selector: 'app-post-shipment',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './post-shipment.component.html',
  styleUrls: ['./post-shipment.component.css']
})
export class PostShipmentComponent implements OnInit {
  shipmentForm!: FormGroup;
  currentStep = 1;

  isEditMode = false;
  shipmentId: number | null = null;

  customerList: any[] = [];
  customerLoadError = '';

  isSubmitting = false;
  submitError = '';
  submitMessage = '';
  isLoadingDetail = false;

  readonly specialHandlingOptions: { key: string; label: string }[] = [
    { key: 'fragile', label: 'Fragile' },
    { key: 'keepUpright', label: 'Keep Upright' },
    { key: 'temperatureControlled', label: 'Temperature Controlled' },
    { key: 'hazardous', label: 'Hazardous' },
    { key: 'highValue', label: 'High Value' },
    { key: 'stackableHandling', label: 'Stackable' }
  ];

  constructor(
    private fb: FormBuilder,
    private shipmentService: ShipmentService,
    private customersService: CustomersService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadCustomers();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      this.shipmentId = Number(idParam);
      this.loadShipment(this.shipmentId);
    }
  }

  private buildForm(): void {
    this.shipmentForm = this.fb.group({
      customerInfo: this.fb.group({
        customerId: [null, Validators.required],
        sourceCity: ['', Validators.required],
        destinationCity: ['', Validators.required],
        pickupAddress: [''],
        dropAddress: ['']
      }),
      cargoInfo: this.fb.group({
        cargoType: [''],
        totalWeightKg: [null, [Validators.required, Validators.min(0.01)]],
        totalVolumeCbm: [null, [Validators.required, Validators.min(0.01)]],
        lengthCm: [null],
        widthCm: [null],
        heightCm: [null],
        items: this.fb.array([])
      }),
      scheduleInfo: this.fb.group({
        requiredPickupDate: ['', Validators.required],
        requiredDeliveryDate: ['', Validators.required],
        vehicleTypeRequired: [''],
        fragile: [false],
        keepUpright: [false],
        temperatureControlled: [false],
        hazardous: [false],
        highValue: [false],
        stackableHandling: [false]
      }),
      reviewInfo: this.fb.group({})
    });
  }

  // ── Steps ─────────────────────────────────────────────────────────────
  getStepClass(stepNum: number) {
    if (this.currentStep > stepNum) return 'step completed';
    if (this.currentStep === stepNum) return 'step active';
    return 'step';
  }

  getGroupForStep(step: number): AbstractControl | null {
    switch (step) {
      case 1: return this.shipmentForm.get('customerInfo');
      case 2: return this.shipmentForm.get('cargoInfo');
      case 3: return this.shipmentForm.get('scheduleInfo');
      case 4: return this.shipmentForm.get('reviewInfo');
      default: return null;
    }
  }

  nextStep(): void {
    const currentGroup = this.getGroupForStep(this.currentStep);

    if (currentGroup?.valid) {
      if (this.currentStep < 4) {
        this.currentStep++;
      } else {
        this.submit();
      }
    } else {
      currentGroup?.markAllAsTouched();
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) this.currentStep--;
  }

  isInvalid(groupName: string, controlName: string): boolean {
    const control = this.shipmentForm.get(`${groupName}.${controlName}`);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  // ── Customers ─────────────────────────────────────────────────────────
  loadCustomers(): void {
    this.customersService.getCustomers(0, 100).subscribe({
      next: res => { this.customerList = this.extract(res); },
      error: () => { this.customerLoadError = 'Unable to load customers.'; }
    });
  }

  onCustomerChange(): void {
    const customerId = this.shipmentForm.get('customerInfo.customerId')?.value;
    const customer = this.customerList.find((c: any) => c.customerId === customerId || c.id === customerId);
    if (!customer) return;
    if (!this.shipmentForm.get('customerInfo.pickupAddress')?.value && customer.address) {
      this.shipmentForm.get('customerInfo.pickupAddress')?.setValue(customer.address);
    }
  }

  getCustomerName(customer: any): string {
    return `${customer.firstName || customer.name || ''} ${customer.lastName || ''}`.trim() || `#${customer.customerId || customer.id}`;
  }

  // ── Item FormArray ────────────────────────────────────────────────────
  get itemsArray(): FormArray {
    return this.shipmentForm.get('cargoInfo.items') as FormArray;
  }

  newItemGroup(item?: ShipmentItem): FormGroup {
    return this.fb.group({
      shipmentItemId: [item?.shipmentItemId || null],
      itemName: [item?.itemName || '', Validators.required],
      weightKg: [item?.weightKg ?? null, [Validators.required, Validators.min(0.01)]],
      volumeCbm: [item?.volumeCbm ?? null, [Validators.required, Validators.min(0.01)]],
      lengthCm: [item?.lengthCm ?? null],
      widthCm: [item?.widthCm ?? null],
      heightCm: [item?.heightCm ?? null],
      quantity: [item?.quantity ?? 1, [Validators.required, Validators.min(1)]],
      fragile: [item?.fragile || false],
      stackable: [item?.stackable || false]
    });
  }

  addItemRow(): void {
    this.itemsArray.push(this.newItemGroup());
  }

  removeItemRow(index: number): void {
    this.itemsArray.removeAt(index);
  }

  // ── Review helpers ────────────────────────────────────────────────────
  get selectedCustomerName(): string {
    const customerId = this.shipmentForm.get('customerInfo.customerId')?.value;
    const customer = this.customerList.find((c: any) => c.customerId === customerId || c.id === customerId);
    return customer ? this.getCustomerName(customer) : '—';
  }

  get selectedSpecialHandling(): string {
    return this.buildSpecialHandling() || 'None';
  }

  private buildSpecialHandling(): string {
    const schedule = this.shipmentForm.get('scheduleInfo')?.value || {};
    return this.specialHandlingOptions
      .filter(opt => schedule[opt.key])
      .map(opt => opt.label)
      .join(', ');
  }

  // ── Load existing shipment (edit mode) ───────────────────────────────
  loadShipment(id: number): void {
    this.isLoadingDetail = true;
    this.shipmentService.getShipment(id).subscribe({
      next: res => {
        const shipment: Shipment = res?.data || res;
        this.patchFromShipment(shipment);
        this.isLoadingDetail = false;
      },
      error: () => {
        this.submitError = 'Unable to load shipment.';
        this.isLoadingDetail = false;
      }
    });
  }

  private patchFromShipment(shipment: Shipment): void {
    this.shipmentForm.get('customerInfo')?.patchValue({
      customerId: shipment.customerId ?? null,
      sourceCity: shipment.sourceCity || '',
      destinationCity: shipment.destinationCity || '',
      pickupAddress: shipment.pickupAddress || '',
      dropAddress: shipment.dropAddress || ''
    });

    this.shipmentForm.get('cargoInfo')?.patchValue({
      cargoType: shipment.cargoType || '',
      totalWeightKg: shipment.totalWeightKg ?? null,
      totalVolumeCbm: shipment.totalVolumeCbm ?? null,
      lengthCm: shipment.lengthCm ?? null,
      widthCm: shipment.widthCm ?? null,
      heightCm: shipment.heightCm ?? null
    });

    this.itemsArray.clear();
    (shipment.items || []).forEach(item => this.itemsArray.push(this.newItemGroup(item)));

    const handling = (shipment.specialHandling || '').split(',').map(s => s.trim().toLowerCase());
    const scheduleGroup = this.shipmentForm.get('scheduleInfo');
    scheduleGroup?.patchValue({
      requiredPickupDate: shipment.requiredPickupDate || '',
      requiredDeliveryDate: shipment.requiredDeliveryDate || '',
      vehicleTypeRequired: shipment.vehicleTypeRequired || '',
      fragile: handling.includes('fragile'),
      keepUpright: handling.includes('keep upright'),
      temperatureControlled: handling.includes('temperature controlled'),
      hazardous: handling.includes('hazardous'),
      highValue: handling.includes('high value'),
      stackableHandling: handling.includes('stackable')
    });
  }

  // ── Submit ────────────────────────────────────────────────────────────
  submit(): void {
    if (!this.shipmentForm.valid) {
      this.shipmentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.submitError = '';
    this.submitMessage = '';

    const customerInfo = this.shipmentForm.value.customerInfo;
    const cargoInfo = this.shipmentForm.value.cargoInfo;
    const scheduleInfo = this.shipmentForm.value.scheduleInfo;

    const payload: ShipmentPayload = {
      customerId: customerInfo.customerId,
      sourceCity: customerInfo.sourceCity,
      destinationCity: customerInfo.destinationCity,
      pickupAddress: customerInfo.pickupAddress || undefined,
      dropAddress: customerInfo.dropAddress || undefined,
      cargoType: cargoInfo.cargoType || undefined,
      totalWeightKg: cargoInfo.totalWeightKg,
      totalVolumeCbm: cargoInfo.totalVolumeCbm,
      lengthCm: cargoInfo.lengthCm || undefined,
      widthCm: cargoInfo.widthCm || undefined,
      heightCm: cargoInfo.heightCm || undefined,
      requiredPickupDate: scheduleInfo.requiredPickupDate,
      requiredDeliveryDate: scheduleInfo.requiredDeliveryDate,
      specialHandling: this.buildSpecialHandling() || undefined,
      vehicleTypeRequired: scheduleInfo.vehicleTypeRequired || undefined,
      status: 'DRAFT',
      items: (cargoInfo.items || []).map((item: any) => ({
        shipmentItemId: item.shipmentItemId || undefined,
        itemName: item.itemName,
        weightKg: item.weightKg,
        volumeCbm: item.volumeCbm,
        lengthCm: item.lengthCm || undefined,
        widthCm: item.widthCm || undefined,
        heightCm: item.heightCm || undefined,
        quantity: item.quantity,
        fragile: item.fragile,
        stackable: item.stackable
      }))
    };

    const request = this.isEditMode && this.shipmentId
      ? this.shipmentService.updateShipment(this.shipmentId, payload)
      : this.shipmentService.createShipment(payload);

    request.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.submitMessage = this.isEditMode ? 'Shipment updated successfully.' : 'Shipment created successfully.';
        this.router.navigate(['/shipments']);
      },
      error: err => {
        console.error('Save shipment failed:', err);
        this.isSubmitting = false;
        this.submitError = err.error?.responseMessege || err.error?.message || 'Unable to save shipment.';
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/shipments']);
  }

  private extract(response: any): any[] {
    if (!response) return [];
    if (Array.isArray(response?.data?.content)) return response.data.content;
    if (Array.isArray(response?.dataList)) return response.dataList;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response)) return response;
    return [];
  }
}
