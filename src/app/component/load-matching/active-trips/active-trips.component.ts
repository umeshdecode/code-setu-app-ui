import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Trip } from 'src/app/models/trip';
import { TripService } from 'src/app/services/trip.service';
import { TripCapacityCardComponent } from '../../trip/trip-capacity-card/trip-capacity-card.component';

const ACTIVE_STATUSES = new Set([
  'CREATED', 'DRIVER_ASSIGNED', 'VEHICLE_ASSIGNED', 'READY_FOR_DISPATCH',
  'STARTED', 'REACHED_PICKUP', 'LOADING', 'IN_TRANSIT',
  'REACHED_DESTINATION', 'UNLOADING', 'ON_HOLD', 'BREAKDOWN', 'DELAYED'
]);

@Component({
  selector: 'app-active-trips',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TripCapacityCardComponent],
  templateUrl: './active-trips.component.html',
  styleUrls: ['./active-trips.component.css']
})
export class ActiveTripsComponent implements OnInit {
  trips: Trip[] = [];
  isLoading = false;
  loadError = '';

  // ── Pagination ────────────────────────────────────────────────────────
  pageSize = 10;
  currentPageNumber = 0;
  totalRecords = 0;
  totalPages = 0;

  constructor(private tripService: TripService) {}

  ngOnInit(): void {
    this.loadTrips();
  }

  loadTrips(pageNumber = this.currentPageNumber): void {
    this.isLoading = true;
    this.loadError = '';
    this.tripService.getTrips(pageNumber, this.pageSize).subscribe({
      next: response => {
        const list = this.extract(response).filter((t: Trip) => ACTIVE_STATUSES.has((t.status || '').toUpperCase()));
        this.updatePagination(response, list.length);
        this.trips = list;
        this.isLoading = false;
      },
      error: err => {
        console.error('Trip load failed:', err);
        this.loadError = 'Unable to load active trips.';
        this.isLoading = false;
      }
    });
  }

  onCapacityInitialized(trip: Trip): void {
    if (!trip.tripId) return;
    this.tripService.getTrip(trip.tripId).subscribe({
      next: res => {
        const updated = res?.data || res;
        const idx = this.trips.findIndex(t => t.tripId === trip.tripId);
        if (idx > -1 && updated) this.trips[idx] = { ...this.trips[idx], ...updated };
      }
    });
  }

  // ── Pagination ────────────────────────────────────────────────────────
  goToPage(page: number): void {
    const total = this.getDisplayTotalPages();
    if (page < 0 || page >= total || page === this.currentPageNumber) return;
    this.currentPageNumber = page;
    this.loadTrips(page);
  }

  changePageSize(): void {
    this.currentPageNumber = 0;
    this.loadTrips(0);
  }

  get visiblePageNumbers(): number[] {
    const total = this.getDisplayTotalPages();
    const current = this.getDisplayCurrentPage();
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  getDisplayCurrentPage(): number { return this.currentPageNumber + 1; }
  getDisplayTotalPages(): number { return this.totalPages || (this.trips.length > 0 ? 1 : 0); }
  getDisplayTotalRecords(): number { return this.totalRecords || this.trips.length; }

  // ── Privates ──────────────────────────────────────────────────────────
  private extract(response: any): any[] {
    if (!response) return [];
    if (Array.isArray(response?.data?.content)) return response.data.content;
    if (Array.isArray(response?.dataList)) return response.dataList;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response)) return response;
    return [];
  }

  private updatePagination(response: any, loadedCount: number): void {
    const p = response?.data;
    this.totalRecords = p?.totalElements ?? loadedCount;
    this.currentPageNumber = p?.number ?? 0;
    this.totalPages = p?.totalPages ?? 1;
  }
}
