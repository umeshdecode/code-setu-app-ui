import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Trip } from 'src/app/models/trip';
import { TripService } from 'src/app/services/trip.service';
import { vehicleTypeLabel } from 'src/app/models/vehicle-type';
import { VehicleTypePickerComponent } from '../../shared/vehicle-type-picker/vehicle-type-picker.component';

@Component({
  selector: 'app-trip-capacity-card',
  standalone: true,
  imports: [CommonModule, VehicleTypePickerComponent],
  templateUrl: './trip-capacity-card.component.html',
  styleUrls: ['./trip-capacity-card.component.css']
})
export class TripCapacityCardComponent implements OnChanges {
  @Input() trip!: Trip;
  @Output() capacityInitialized = new EventEmitter<Trip>();

  isInitializing = false;
  initError = '';

  capacityKnown = false;

  showVehicleTypePicker = false;
  isUpdatingVehicleType = false;
  vehicleTypeError = '';

  constructor(private tripService: TripService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['trip']) {
      this.capacityKnown = this.trip?.totalWeightKg != null && this.trip?.totalVolumeCbm != null;
    }
  }

  get vehicleTypeCategoryLabel(): string {
    return vehicleTypeLabel(this.trip?.vehicleTypeCategory);
  }

  toggleVehicleTypePicker(): void {
    this.showVehicleTypePicker = !this.showVehicleTypePicker;
    this.vehicleTypeError = '';
  }

  setVehicleType(code: string | null): void {
    if (!this.trip?.tripId || !code) return;
    this.isUpdatingVehicleType = true;
    this.vehicleTypeError = '';
    this.tripService.updateCapacity(this.trip.tripId, { vehicleTypeCategory: code }).subscribe({
      next: () => {
        this.isUpdatingVehicleType = false;
        this.showVehicleTypePicker = false;
        this.capacityInitialized.emit(this.trip);
      },
      error: err => {
        this.isUpdatingVehicleType = false;
        this.vehicleTypeError = err.error?.message || 'Unable to update vehicle type.';
      }
    });
  }

  get weightUsedPct(): number {
    return this.usedPct(this.trip?.totalWeightKg, this.trip?.remainingWeightKg);
  }

  get volumeUsedPct(): number {
    return this.usedPct(this.trip?.totalVolumeCbm, this.trip?.remainingVolumeCbm);
  }

  get weightUsedKg(): number {
    return this.used(this.trip?.totalWeightKg, this.trip?.remainingWeightKg);
  }

  get volumeUsedCbm(): number {
    return this.used(this.trip?.totalVolumeCbm, this.trip?.remainingVolumeCbm);
  }

  initializeCapacity(): void {
    if (!this.trip?.tripId) return;
    this.isInitializing = true;
    this.initError = '';
    this.tripService.initializeCapacity(this.trip.tripId).subscribe({
      next: () => {
        this.isInitializing = false;
        this.capacityInitialized.emit(this.trip);
      },
      error: err => {
        this.isInitializing = false;
        this.initError = err.error?.message || 'Unable to initialize capacity.';
      }
    });
  }

  private used(total: number | undefined | null, remaining: number | undefined | null): number {
    if (total == null || remaining == null) return 0;
    const used = total - remaining;
    return used < 0 ? 0 : used;
  }

  private usedPct(total: number | undefined | null, remaining: number | undefined | null): number {
    if (!total) return 0;
    const pct = (this.used(total, remaining) / total) * 100;
    return Math.min(100, Math.max(0, Math.round(pct)));
  }
}
