export type RouteStatus =
  | 'READY'
  | 'MISSING_LOCATION'
  | 'NO_ROUTE'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'NOT_CONFIGURED';

export type RouteEndpoint = 'SOURCE' | 'DESTINATION' | 'STOP';

export type LocationSource = 'GEOCODE_CONFIRMED' | 'MAP_PIN' | 'MANUAL';

export interface RoutePoint {
  city?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  confirmed: boolean;
  locationSource?: string;
  confirmedAt?: string;
  confirmedBy?: string;
}

export interface RouteStop {
  tripStopId: number;
  sequenceOrder?: number;
  city?: string;
  latitude?: number;
  longitude?: number;
  confirmed: boolean;
  includedInRoute: boolean;
}

export interface RouteLeg {
  distanceMeters?: number;
  durationSeconds?: number;
}

/** Mirrors backend TripRouteDTO (GET /trip/{tripId}/route). */
export interface TripRoute {
  tripId: number;
  tripNumber?: string;
  tripStatus?: string;
  routeStatus?: RouteStatus;
  message?: string;
  source: RoutePoint;
  destination: RoutePoint;
  stops: RouteStop[];
  missingEndpoints: RouteEndpoint[];
  stopsSkipped?: number;
  distanceMeters?: number;
  durationSeconds?: number;
  encodedPolyline?: string;
  legs?: RouteLeg[];
  plannedDistanceKm?: number;
  routeType?: string;
  disclaimer?: string;
  calculatedAt?: string;
  cached?: boolean;
  referenceId?: string;
}

export interface GeocodeCandidate {
  formattedAddress?: string;
  latitude: number;
  longitude: number;
  locationType?: string;
  types?: string[];
  partialMatch: boolean;
  /** City/region-level or approximate result - not a precise pickup/drop point. */
  approximate: boolean;
  placeId?: string;
}

export interface RouteLocationUpdate {
  endpoint: RouteEndpoint;
  tripStopId?: number;
  latitude: number;
  longitude: number;
  locationSource: LocationSource;
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

/** Decodes a Google encoded polyline (precision 5) without loading the geometry library. */
export function decodePolyline(encoded: string): LatLngPoint[] {
  const points: LatLngPoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}
