import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface PlaceSuggestion {
  name: string;
  state: string;
  country: string;
}

/**
 * Server-driven city/place lookup shared by every screen with an address
 * field, so none of them fall back to a hand-typed or hardcoded city list.
 * Backed by Photon (photon.komoot.io) — a free OpenStreetMap-based
 * geocoding API — until a first-party place-lookup endpoint exists.
 */
@Injectable({
  providedIn: 'root'
})
export class PlaceLookupService {
  private readonly SEARCH_URL = 'https://photon.komoot.io/api/';
  private readonly MIN_QUERY_LENGTH = 3;

  constructor(private http: HttpClient) { }

  searchCities(query: string): Observable<PlaceSuggestion[]> {
    const term = (query || '').trim();
    if (term.length < this.MIN_QUERY_LENGTH) {
      return of([]);
    }

    return this.http.get<any>(this.SEARCH_URL, { params: { q: term, layer: 'city' } }).pipe(
      map(response => this.toSuggestions(response)),
      catchError(() => of([]))
    );
  }

  private toSuggestions(response: any): PlaceSuggestion[] {
    const features = Array.isArray(response?.features) ? response.features : [];
    const seen = new Set<string>();
    const suggestions: PlaceSuggestion[] = [];

    for (const feature of features) {
      const props = feature?.properties || {};
      const name = props.name || props.city || '';
      if (!name) continue;

      const state = props.state || '';
      const country = props.country || '';
      const key = `${name}|${state}|${country}`;
      if (seen.has(key)) continue;

      seen.add(key);
      suggestions.push({ name, state, country });
    }

    return suggestions;
  }
}
