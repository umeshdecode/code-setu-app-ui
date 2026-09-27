import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { GoogleMapsModule } from '@angular/google-maps';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { GoogleMapsLoaderService } from 'src/app/services/google-maps-loader.service';
import { VehicleLocationService } from 'src/app/services/vehicle-location.service';

@Component({
  selector: 'app-driver-location',
  standalone: true,
  imports: [GoogleMapsModule, CommonModule, MatIconModule],
  templateUrl: './driver-location.component.html',
  styleUrls: ['./driver-location.component.css']
})
export class DriverLocationComponent implements OnInit, OnDestroy {


  vehicleId = 1; // 🔥 replace with route param later

  mapsLoaded = false;
  mapsLoadError = '';

  private destroy$ = new Subject<void>();
  private animation: ReturnType<typeof setInterval> | null = null;

  center: google.maps.LatLngLiteral = {
    lat: 21.1702,
    lng: 72.8311
  };

  markerPosition: google.maps.LatLngLiteral = {
    lat: 21.1702,
    lng: 72.8311
  };

  vehicleIcon = 'assets/images/APP_Icon.png';

  path: google.maps.LatLngLiteral[] = [];

  polylineOptions: google.maps.PolylineOptions = {
    strokeColor: '#f97316',
    strokeOpacity: 0.9,
    strokeWeight: 4
  };

  constructor(
    private vehicleService: VehicleLocationService,
    private mapsLoader: GoogleMapsLoaderService
  ) {}

  ngOnInit(): void {
    this.mapsLoader.load()
      .then(() => this.mapsLoaded = true)
      .catch((err: Error) => this.mapsLoadError = err.message || 'Unable to load Google Maps.');
    this.loadInitialLocation();

    this.vehicleService.connect(this.vehicleId);

    this.vehicleService.location$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        if (!data) return;

        this.animateMarker(data.latitude, data.longitude);
      });
  }

  ngOnDestroy(): void {
    this.stopAnimation();
    this.destroy$.next();
    this.destroy$.complete();
    this.vehicleService.disconnect();
  }

  loadInitialLocation() {
    this.vehicleService.loadInitialLocation(this.vehicleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        if (res) {
          this.animateMarker(res.latitude, res.longitude);
        }
      });
  }

  animateMarker(targetLat: number, targetLng: number) {
    this.stopAnimation();

    const startLat = this.markerPosition.lat;
    const startLng = this.markerPosition.lng;

    const frames = 60;
    const duration = 1000;
    const interval = duration / frames;

    let frame = 0;

    const deltaLat = (targetLat - startLat) / frames;
    const deltaLng = (targetLng - startLng) / frames;

    this.animation = setInterval(() => {
      frame++;

      this.markerPosition = {
        lat: startLat + deltaLat * frame,
        lng: startLng + deltaLng * frame
      };

      this.center = this.markerPosition;

      if (frame >= frames) {
        this.stopAnimation();

        this.markerPosition = { lat: targetLat, lng: targetLng };
        this.addToPath(this.markerPosition);
      }
    }, interval);
  }

  addToPath(position: google.maps.LatLngLiteral) {
    this.path.push(position);

    if (this.path.length > 200) {
      this.path.shift();
    }
  }

  private stopAnimation(): void {
    if (this.animation) {
      clearInterval(this.animation);
      this.animation = null;
    }
  }
}
