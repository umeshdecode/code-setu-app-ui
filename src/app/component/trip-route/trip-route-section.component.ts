import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, takeUntil } from 'rxjs';
import {
  GeocodeCandidate, LatLngPoint, LocationSource, RouteEndpoint, RoutePoint, RouteStop, TripRoute, decodePolyline
} from 'src/app/models/trip-route';
import { GoogleMapsLoaderService } from 'src/app/services/google-maps-loader.service';
import { TripService } from 'src/app/services/trip.service';
import { RouteMapMarker, TripRouteMapComponent } from './trip-route-map.component';

type RouteViewState = 'loading' | 'ready' | 'missing' | 'no-route' | 'error';

interface LocationEditor {
  endpoint: RouteEndpoint;
  tripStopId?: number;
  label: string;
}

interface PendingPoint extends LatLngPoint {
  source: LocationSource;
  description: string;
  approximate: boolean;
}

/**
 * "Trip Route & Location" section of the Trip Details panel: loads the planned
 * route from the backend, renders it, and lets permitted staff confirm missing
 * or imprecise source/destination/stop locations. Never invents a coordinate:
 * a point is saved only after staff explicitly confirm it.
 */
@Component({
  selector: 'app-trip-route-section',
  standalone: true,
  imports: [CommonModule, FormsModule, TripRouteMapComponent],
  templateUrl: './trip-route-section.component.html',
  styleUrls: ['./trip-route-section.component.css'],
})
export class TripRouteSectionComponent implements OnInit, OnChanges, OnDestroy {
  @Input() tripId!: number;
  /** TRIP UPDATE permission: allows confirming locations. */
  @Input() canEdit = false;

  state: RouteViewState = 'loading';
  message = '';
  route: TripRoute | null = null;

  mapsReady = false;
  mapsError = '';

  sourceMarker: RouteMapMarker | null = null;
  destinationMarker: RouteMapMarker | null = null;
  stopMarkers: RouteMapMarker[] = [];
  path: LatLngPoint[] = [];

  editor: LocationEditor | null = null;
  searchQuery = '';
  searching = false;
  searchMessage = '';
  candidates: GeocodeCandidate[] = [];
  pinMode = false;
  pending: PendingPoint | null = null;
  pendingMarker: RouteMapMarker | null = null;
  saving = false;
  saveError = '';

  private routeSub: Subscription | null = null;
  private destroy$ = new Subject<void>();

  constructor(private tripService: TripService, private mapsLoader: GoogleMapsLoaderService) {}

  ngOnInit(): void {
    this.mapsLoader.load()
      .then(() => { this.mapsReady = true; })
      .catch((err: Error) => { this.mapsError = err.message || 'Unable to load Google Maps.'; });

    this.mapsLoader.authFailed$
      .pipe(takeUntil(this.destroy$))
      .subscribe(failed => {
        if (failed) {
          this.mapsReady = false;
          this.mapsError = 'The map could not be displayed (map key rejected). Route details are still shown below.';
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tripId'] && this.tripId) {
      this.closeEditor();
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Loading ──────────────────────────────────────────────────────────
  load(refresh = false): void {
    this.routeSub?.unsubscribe();
    this.state = 'loading';
    this.message = '';
    this.routeSub = this.tripService.getTripRoute(this.tripId, refresh).subscribe({
      next: res => this.applyResponse(res),
      error: () => {
        this.route = null;
        this.rebuildMapData();
        this.state = 'error';
        this.message = 'The trip route could not be loaded. Please try again.';
      },
    });
  }

  private applyResponse(res: any): void {
    const data: TripRoute | null = res?.data && typeof res.data === 'object' && 'source' in res.data ? res.data : null;
    this.route = data;
    this.message = data?.message || res?.responseMessege || '';
    this.rebuildMapData();

    if (!data) {
      this.state = 'error';
      this.message = res?.responseCode === 404
        ? 'Trip not found or you do not have access to it.'
        : (this.message || 'The trip route could not be loaded.');
      return;
    }
    switch (data.routeStatus) {
      case 'READY': this.state = 'ready'; break;
      case 'MISSING_LOCATION': this.state = 'missing'; break;
      case 'NO_ROUTE': this.state = 'no-route'; break;
      default: this.state = 'error';
    }
  }

  private rebuildMapData(): void {
    const r = this.route;
    this.sourceMarker = r && this.hasPoint(r.source)
      ? { position: { lat: r.source.latitude!, lng: r.source.longitude! }, title: 'Source: ' + this.pointLabel(r.source), label: 'A' }
      : null;
    this.destinationMarker = r && this.hasPoint(r.destination)
      ? { position: { lat: r.destination.latitude!, lng: r.destination.longitude! }, title: 'Destination: ' + this.pointLabel(r.destination), label: 'B' }
      : null;
    this.stopMarkers = (r?.stops || [])
      .filter(s => s.latitude != null && s.longitude != null)
      .map(s => ({
        position: { lat: s.latitude!, lng: s.longitude! },
        title: `Stop ${s.sequenceOrder ?? ''}: ${s.city || ''}`.trim(),
        label: String(s.sequenceOrder ?? ''),
      }));
    this.path = r?.routeStatus === 'READY' && r.encodedPolyline ? decodePolyline(r.encodedPolyline) : [];
  }

  // ── Location confirmation ────────────────────────────────────────────
  openEditor(endpoint: RouteEndpoint, stop?: RouteStop): void {
    if (!this.canEdit || !this.route) return;
    const point = endpoint === 'SOURCE' ? this.route.source : endpoint === 'DESTINATION' ? this.route.destination : null;
    this.editor = {
      endpoint,
      tripStopId: stop?.tripStopId,
      label: endpoint === 'SOURCE' ? 'source' : endpoint === 'DESTINATION' ? 'destination' : `stop ${stop?.sequenceOrder ?? ''} (${stop?.city || ''})`,
    };
    this.searchQuery = point
      ? [point.address, point.city].filter(Boolean).join(', ')
      : (stop?.city || '');
    this.candidates = [];
    this.searchMessage = '';
    this.saveError = '';
    this.setPending(null);
    this.pinMode = false;
  }

  closeEditor(): void {
    this.editor = null;
    this.candidates = [];
    this.searchMessage = '';
    this.saveError = '';
    this.pinMode = false;
    this.setPending(null);
  }

  search(): void {
    const query = this.searchQuery.trim();
    if (!query || !this.editor) return;
    this.searching = true;
    this.searchMessage = '';
    this.candidates = [];
    this.setPending(null);
    this.tripService.geocodeTripLocation(this.tripId, query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.searching = false;
          this.candidates = Array.isArray(res?.data) ? res.data : [];
          this.searchMessage = res?.responseMessege || '';
        },
        error: () => {
          this.searching = false;
          this.searchMessage = 'Location search is unavailable right now. You can place the pin on the map instead.';
        },
      });
  }

  selectCandidate(candidate: GeocodeCandidate): void {
    this.pinMode = false;
    this.setPending({
      lat: candidate.latitude,
      lng: candidate.longitude,
      source: 'GEOCODE_CONFIRMED',
      description: candidate.formattedAddress || `${candidate.latitude.toFixed(5)}, ${candidate.longitude.toFixed(5)}`,
      approximate: candidate.approximate,
    });
  }

  togglePinMode(): void {
    this.pinMode = !this.pinMode;
  }

  onMapClicked(point: LatLngPoint): void {
    if (!this.editor || !this.pinMode) return;
    this.setPending({
      ...point,
      source: 'MAP_PIN',
      description: `Pin at ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
      approximate: false,
    });
  }

  confirmPending(): void {
    if (!this.editor || !this.pending) return;
    this.saving = true;
    this.saveError = '';
    this.tripService.confirmTripLocation(this.tripId, {
      endpoint: this.editor.endpoint,
      tripStopId: this.editor.tripStopId,
      latitude: this.pending.lat,
      longitude: this.pending.lng,
      locationSource: this.pending.source,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        this.saving = false;
        if (res?.responseCode && res.responseCode !== 200) {
          this.saveError = res.responseMessege || 'The location could not be saved.';
          return;
        }
        this.closeEditor();
        this.load();
      },
      error: () => {
        this.saving = false;
        this.saveError = 'The location could not be saved. Please try again.';
      },
    });
  }

  private setPending(point: PendingPoint | null): void {
    this.pending = point;
    this.pendingMarker = point ? { position: { lat: point.lat, lng: point.lng }, title: 'New location (not saved)' } : null;
  }

  // ── View helpers ─────────────────────────────────────────────────────
  hasPoint(point?: RoutePoint | null): boolean {
    return !!point && point.latitude != null && point.longitude != null;
  }

  pointLabel(point?: RoutePoint | null): string {
    if (!point) return '—';
    return [point.address, point.city].filter(Boolean).join(', ') || '—';
  }

  formatDistance(meters?: number): string {
    if (meters == null) return '—';
    const km = meters / 1000;
    return `${km >= 100 ? km.toFixed(0) : km.toFixed(1)} km`;
  }

  formatDuration(seconds?: number): string {
    if (seconds == null) return '—';
    const totalMinutes = Math.round(seconds / 60);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const parts: string[] = [];
    if (days) parts.push(`${days} d`);
    if (hours) parts.push(`${hours} h`);
    if (minutes || parts.length === 0) parts.push(`${minutes} min`);
    return parts.join(' ');
  }

  get isRetryable(): boolean {
    return this.state === 'error' && this.route?.routeStatus !== 'NOT_CONFIGURED';
  }
}
