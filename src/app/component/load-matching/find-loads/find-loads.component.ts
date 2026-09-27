import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PlaceLookupService, PlaceSuggestion } from 'src/app/services/place-lookup.service';
import { ShipmentService } from 'src/app/services/shipment.service';
import { TripService } from 'src/app/services/trip.service';
import { Shipment } from 'src/app/models/shipment';
import { Trip } from 'src/app/models/trip';
import { vehicleTypeLabel } from 'src/app/models/vehicle-type';
import { VehicleTypePickerComponent } from '../../shared/vehicle-type-picker/vehicle-type-picker.component';

interface SearchCriteria {
  sourceCity: string;
  destinationCity: string;
}

@Component({
  selector: 'app-find-loads',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, VehicleTypePickerComponent],
  templateUrl: './find-loads.component.html',
  styleUrls: ['./find-loads.component.css']
})
export class FindLoadsComponent implements OnInit {
  // ── Search form state ─────────────────────────────────────────────────
  criteria: SearchCriteria = { sourceCity: '', destinationCity: '' };
  vehicleTypeRequired: string | null = null;
  showVehicleTypeFilter = false;

  // ── City autocomplete (pattern copied from customer.component.ts) ──────
  citySuggestions: PlaceSuggestion[] = [];
  private activeCityTarget: { model: any; field: 'sourceCity' | 'destinationCity' } | null = null;
  private citySearchTimer: any = null;

  // ── Results ──────────────────────────────────────────────────────────
  results: Shipment[] = [];
  isSearching = false;
  searchError = '';
  hasSearched = false;

  // ── Pagination (same shape as matching-trucks/active-trips) ────────────
  pageSize = 10;
  currentPageNumber = 0;
  totalRecords = 0;
  totalPages = 0;

  // ── Loads For You ────────────────────────────────────────────────────
  myTrips: Trip[] = [];
  isLoadingTrips = false;

  constructor(
    private placeLookup: PlaceLookupService,
    private shipmentService: ShipmentService,
    private tripService: TripService
  ) {}

  ngOnInit(): void {
    this.loadMyTrips();
  }

  // ── Loads For You ────────────────────────────────────────────────────
  loadMyTrips(): void {
    this.isLoadingTrips = true;
    this.tripService.getTrips(0, 5).subscribe({
      next: response => {
        this.myTrips = this.extractList(response);
        this.isLoadingTrips = false;
      },
      error: () => {
        this.isLoadingTrips = false;
      }
    });
  }

  selectTripChip(trip: Trip): void {
    this.criteria.sourceCity = trip.sourceCity || '';
    this.criteria.destinationCity = trip.destinationCity || '';
    this.search(0);
  }

  // ── City autocomplete ────────────────────────────────────────────────
  onCityInput(model: any, field: 'sourceCity' | 'destinationCity'): void {
    this.activeCityTarget = { model, field };
    clearTimeout(this.citySearchTimer);
    const term = model?.[field];
    this.citySearchTimer = setTimeout(() => {
      this.placeLookup.searchCities(term).subscribe(suggestions => {
        if (this.activeCityTarget?.model === model && this.activeCityTarget?.field === field) {
          this.citySuggestions = suggestions;
        }
      });
    }, 400);
  }

  selectCity(place: PlaceSuggestion): void {
    if (!this.activeCityTarget) return;
    const { model, field } = this.activeCityTarget;
    model[field] = place.name;
    this.citySuggestions = [];
    this.activeCityTarget = null;
  }

  isActiveCityField(model: any, field: 'sourceCity' | 'destinationCity'): boolean {
    return this.activeCityTarget?.model === model && this.activeCityTarget?.field === field && this.citySuggestions.length > 0;
  }

  hideCitySuggestionsSoon(): void {
    setTimeout(() => { this.citySuggestions = []; this.activeCityTarget = null; }, 150);
  }

  // ── Vehicle type filter ──────────────────────────────────────────────
  toggleVehicleTypeFilter(): void {
    this.showVehicleTypeFilter = !this.showVehicleTypeFilter;
  }

  onVehicleTypeChange(code: string | null): void {
    this.vehicleTypeRequired = code;
  }

  vehicleTypeLabelFor(code: string | undefined): string {
    return vehicleTypeLabel(code);
  }

  // ── Search ───────────────────────────────────────────────────────────
  search(pageNumber = 0): void {
    this.isSearching = true;
    this.searchError = '';
    this.hasSearched = true;
    this.shipmentService.searchOpenShipments({
      sourceCity: this.criteria.sourceCity || undefined,
      destinationCity: this.criteria.destinationCity || undefined,
      vehicleTypeRequired: this.vehicleTypeRequired || undefined
    }, pageNumber, this.pageSize).subscribe({
      next: response => {
        this.results = this.extractList(response);
        this.updatePagination(response, this.results.length);
        this.isSearching = false;
      },
      error: err => {
        console.error('Shipment search failed:', err);
        this.searchError = 'Unable to search open loads right now.';
        this.isSearching = false;
      }
    });
  }

  // ── "Find Loads From" chip row ──────────────────────────────────────
  get sourceCityChips(): string[] {
    return [...new Set(this.results.map(r => r.sourceCity).filter(Boolean))] as string[];
  }

  filterBySourceCity(city: string): void {
    this.criteria.sourceCity = city;
    this.search(0);
  }

  // ── Pagination ───────────────────────────────────────────────────────
  goToPage(page: number): void {
    const total = this.getDisplayTotalPages();
    if (page < 0 || page >= total || page === this.currentPageNumber) return;
    this.currentPageNumber = page;
    this.search(page);
  }

  get visiblePageNumbers(): number[] {
    const total = this.getDisplayTotalPages();
    const current = this.getDisplayCurrentPage();
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
  }

  getDisplayCurrentPage(): number { return this.currentPageNumber + 1; }
  getDisplayTotalPages(): number { return this.totalPages || (this.results.length > 0 ? 1 : 0); }
  getDisplayTotalRecords(): number { return this.totalRecords || this.results.length; }

  // ── Privates ─────────────────────────────────────────────────────────
  private extractList(response: any): any[] {
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
    this.currentPageNumber = p?.number ?? this.currentPageNumber;
    this.totalPages = p?.totalPages ?? 1;
  }
}
