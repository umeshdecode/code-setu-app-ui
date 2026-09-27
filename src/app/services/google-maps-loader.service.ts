import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ENV } from 'src/assets/env';

/**
 * Single loader for the Google Maps JavaScript API (browser key only).
 * Every map in the app must go through this service so the script is added to
 * the page once, whatever screen loads first.
 */
@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private static readonly SCRIPT_ID = 'google-maps-js-api';
  private static readonly CALLBACK = '__cargoSetuGoogleMapsReady';

  private loadPromise: Promise<void> | null = null;

  /** Emits true if Google rejects the browser key (invalid key / referrer not allowed). */
  readonly authFailed$ = new BehaviorSubject<boolean>(false);

  constructor(private zone: NgZone) {
    (window as any).gm_authFailure = () => this.zone.run(() => this.authFailed$.next(true));
  }

  get isLoaded(): boolean {
    return typeof google !== 'undefined' && !!google.maps && !!google.maps.Map;
  }

  load(): Promise<void> {
    if (this.isLoaded) {
      return Promise.resolve();
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }

    const apiKey = ENV?.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return Promise.reject(new Error('Google Maps API key is missing.'));
    }

    this.loadPromise = new Promise<void>((resolve, reject) => {
      const fail = () => {
        this.loadPromise = null;
        document.getElementById(GoogleMapsLoaderService.SCRIPT_ID)?.remove();
        reject(new Error('Unable to load Google Maps.'));
      };

      (window as any)[GoogleMapsLoaderService.CALLBACK] = () => this.zone.run(() => resolve());

      const script = document.createElement('script');
      script.id = GoogleMapsLoaderService.SCRIPT_ID;
      script.src = 'https://maps.googleapis.com/maps/api/js'
        + `?key=${encodeURIComponent(apiKey)}`
        + '&v=weekly&loading=async'
        + `&callback=${GoogleMapsLoaderService.CALLBACK}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => this.zone.run(fail);
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }
}
