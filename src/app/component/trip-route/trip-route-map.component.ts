import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output
} from '@angular/core';
import { GoogleMapsModule } from '@angular/google-maps';
import { LatLngPoint } from 'src/app/models/trip-route';

export interface RouteMapMarker {
  position: LatLngPoint;
  title: string;
  label?: string;
}

/**
 * Presentational route map: markers, planned-route polyline and fit-to-bounds.
 * Must only be rendered after GoogleMapsLoaderService.load() has resolved.
 * The <google-map> wrapper owns the map instance and its listeners and removes
 * them on destroy; this component only keeps a reference to fit bounds.
 */
@Component({
  selector: 'app-trip-route-map',
  standalone: true,
  imports: [CommonModule, GoogleMapsModule],
  templateUrl: './trip-route-map.component.html',
  styleUrls: ['./trip-route-map.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripRouteMapComponent implements OnInit, OnChanges, OnDestroy {
  @Input() source: RouteMapMarker | null = null;
  @Input() destination: RouteMapMarker | null = null;
  @Input() stops: RouteMapMarker[] = [];
  @Input() path: LatLngPoint[] = [];
  /** Unconfirmed point being previewed while staff choose a location. */
  @Input() pending: RouteMapMarker | null = null;
  /** When true, clicking the map emits the clicked point (pin placement). */
  @Input() pinMode = false;

  @Output() mapClicked = new EventEmitter<LatLngPoint>();

  private map: google.maps.Map | null = null;

  // India-wide default view until there is something to fit.
  readonly defaultCenter: google.maps.LatLngLiteral = { lat: 22.5, lng: 79 };
  readonly mapOptions: google.maps.MapOptions;

  sourceOptions!: google.maps.MarkerOptions;
  destinationOptions!: google.maps.MarkerOptions;
  stopOptions!: google.maps.MarkerOptions;
  pendingOptions!: google.maps.MarkerOptions;
  polylineOptions!: google.maps.PolylineOptions;

  constructor(private host: ElementRef<HTMLElement>) {
    this.mapOptions = {
      center: this.defaultCenter,
      zoom: 5,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
      gestureHandling: 'cooperative',
    };
  }

  ngOnInit(): void {
    this.buildStyles();
  }

  ngOnChanges(): void {
    this.fitToContent();
  }

  ngOnDestroy(): void {
    this.map = null;
  }

  onMapReady(map: google.maps.Map): void {
    this.map = map;
    this.fitToContent();
  }

  onMapClick(event: google.maps.MapMouseEvent | google.maps.IconMouseEvent): void {
    if (!this.pinMode || !event.latLng) return;
    this.mapClicked.emit({ lat: event.latLng.lat(), lng: event.latLng.lng() });
  }

  private fitToContent(): void {
    if (!this.map) return;
    const points: LatLngPoint[] = [
      ...this.path,
      ...[this.source, this.destination, this.pending, ...this.stops]
        .filter((m): m is RouteMapMarker => !!m)
        .map(m => m.position),
    ];
    if (points.length === 0) {
      this.map.setCenter(this.defaultCenter);
      this.map.setZoom(5);
      return;
    }
    if (points.length === 1) {
      this.map.setCenter(points[0]);
      this.map.setZoom(13);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach(p => bounds.extend(p));
    this.map.fitBounds(bounds, 48);
  }

  /** Reads CargoSetu theme tokens so the map follows light/dark theme colours. */
  private buildStyles(): void {
    const css = getComputedStyle(this.host.nativeElement);
    const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const primary = token('--app-primary', '#4663ac');
    const success = token('--app-success', '#1b7f4b');
    const error = token('--app-error', '#c02626');
    const warning = token('--app-warning', '#b4690e');
    const surface = token('--app-surface', '#ffffff');

    const pin = (color: string, scale = 9): google.maps.MarkerOptions => ({
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: surface,
        strokeWeight: 2,
      },
    });
    this.sourceOptions = pin(success, 10);
    this.destinationOptions = pin(error, 10);
    this.stopOptions = pin(primary, 8);
    this.pendingOptions = { ...pin(warning, 10), zIndex: 999 };
    this.polylineOptions = { strokeColor: primary, strokeOpacity: 0.9, strokeWeight: 5 };
  }

  markerLabel(marker: RouteMapMarker, fallback: string): google.maps.MarkerLabel {
    return { text: marker.label || fallback, color: '#ffffff', fontSize: '11px', fontWeight: '600' };
  }

  trackByTitle(_: number, marker: RouteMapMarker): string {
    return marker.title;
  }
}
