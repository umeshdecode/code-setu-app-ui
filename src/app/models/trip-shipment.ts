export type ManifestStatus = 'CONFIRMED' | 'LOADED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

export interface TripShipment {
  tripShipmentId?: number;
  tripId?: number;
  shipmentId?: number;
  loadMatchId?: number;
  allocatedWeightKg?: number;
  allocatedVolumeCbm?: number;
  sequenceOrder?: number;
  manifestStatus?: ManifestStatus;
  shipmentSourceCity?: string;
  shipmentDestinationCity?: string;
  shipmentCargoType?: string;
}
