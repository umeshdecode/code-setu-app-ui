import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ManifestStatus, TripShipment } from 'src/app/models/trip-shipment';
import { Trip } from 'src/app/models/trip';
import { TripService } from 'src/app/services/trip.service';
import { TripShipmentService } from 'src/app/services/trip-shipment.service';
import { TripCapacityCardComponent } from '../../trip/trip-capacity-card/trip-capacity-card.component';

const NEXT_STATUSES: { [key: string]: ManifestStatus[] } = {
  CONFIRMED: ['CONFIRMED', 'LOADED', 'CANCELLED'],
  LOADED: ['LOADED', 'IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
  DELIVERED: ['DELIVERED'],
  CANCELLED: ['CANCELLED']
};

@Component({
  selector: 'app-trip-manifest',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TripCapacityCardComponent],
  templateUrl: './trip-manifest.component.html',
  styleUrls: ['./trip-manifest.component.css']
})
export class TripManifestComponent implements OnInit {
  tripId!: number;
  trip: Trip | null = null;
  entries: TripShipment[] = [];

  isLoading = false;
  loadError = '';
  rowError: { [tripShipmentId: number]: string } = {};
  rowBusy: { [tripShipmentId: number]: boolean } = {};

  constructor(
    private route: ActivatedRoute,
    private tripService: TripService,
    private tripShipmentService: TripShipmentService
  ) {}

  ngOnInit(): void {
    this.tripId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadTrip();
    this.loadManifest();
  }

  loadTrip(): void {
    this.tripService.getTrip(this.tripId).subscribe({
      next: res => { this.trip = res?.data || res; },
      error: err => console.error('Trip load failed:', err)
    });
  }

  loadManifest(): void {
    this.isLoading = true;
    this.loadError = '';
    this.tripShipmentService.getManifest(this.tripId).subscribe({
      next: response => {
        this.entries = this.extract(response);
        this.isLoading = false;
      },
      error: err => {
        console.error('Manifest load failed:', err);
        this.loadError = 'Unable to load the manifest for this trip.';
        this.isLoading = false;
      }
    });
  }

  onCapacityInitialized(): void {
    this.loadTrip();
  }

  statusClass(status: string | undefined): string {
    return 'manifest-status-' + (status || 'confirmed').toLowerCase().replace(/_/g, '-');
  }

  nextStatuses(entry: TripShipment): ManifestStatus[] {
    return NEXT_STATUSES[entry.manifestStatus || 'CONFIRMED'] || ['CONFIRMED', 'LOADED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];
  }

  onStatusChange(entry: TripShipment, newStatus: string): void {
    if (!entry.tripShipmentId || newStatus === entry.manifestStatus) return;
    this.updateEntry(entry, { manifestStatus: newStatus as ManifestStatus });
  }

  cancelEntry(entry: TripShipment): void {
    if (!entry.tripShipmentId) return;
    const ok = confirm(`Cancel this manifest entry (${entry.shipmentSourceCity} → ${entry.shipmentDestinationCity})? This releases the allocated capacity back to the trip.`);
    if (!ok) return;
    this.updateEntry(entry, { manifestStatus: 'CANCELLED' });
  }

  private updateEntry(entry: TripShipment, payload: Partial<TripShipment>): void {
    const id = entry.tripShipmentId!;
    delete this.rowError[id];
    this.rowBusy[id] = true;
    this.tripShipmentService.updateManifestEntry(this.tripId, id, payload).subscribe({
      next: () => {
        this.rowBusy[id] = false;
        this.loadManifest();
        this.loadTrip();
      },
      error: err => {
        this.rowBusy[id] = false;
        this.rowError[id] = err.error?.responseMessege || err.error?.message || 'Unable to update this manifest entry.';
      }
    });
  }

  private extract(response: any): TripShipment[] {
    if (!response) return [];
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.dataList)) return response.dataList;
    if (Array.isArray(response)) return response;
    return [];
  }
}
