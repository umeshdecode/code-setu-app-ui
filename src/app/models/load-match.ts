export type LoadMatchStatus =
  | 'SUGGESTED'
  | 'VIEWED'
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED';

export interface LoadMatch {
  loadMatchId?: number;
  shipmentId?: number;
  tripId?: number;
  shipmentSourceCity?: string;
  shipmentDestinationCity?: string;
  shipmentCargoType?: string;
  tripSourceCity?: string;
  tripDestinationCity?: string;
  tripVehicleRegistrationNumber?: string;
  overallScore?: number;
  routeScore?: number;
  capacityScore?: number;
  weightScore?: number;
  timingScore?: number;
  vehicleScore?: number;
  handlingScore?: number;
  status?: LoadMatchStatus;
  expiresAt?: string;
  rejectionReason?: string;
}
