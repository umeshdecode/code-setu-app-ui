import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { VEHICLE_TYPES, VehicleTypeOption } from 'src/app/models/vehicle-type';

@Component({
  selector: 'app-vehicle-type-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vehicle-type-picker.component.html',
  styleUrls: ['./vehicle-type-picker.component.css']
})
export class VehicleTypePickerComponent {
  @Input() selected: string | null | undefined;
  @Input() allowClear = false;
  @Output() selectionChange = new EventEmitter<string | null>();

  readonly vehicleTypes: VehicleTypeOption[] = VEHICLE_TYPES;

  select(code: string | null): void {
    this.selectionChange.emit(code);
  }
}
