export type ShipmentStatus =
  | 'DRAFT'
  | 'POSTED'
  | 'MATCHING'
  | 'PARTIALLY_ALLOCATED'
  | 'ALLOCATED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface ShipmentItem {
  shipmentItemId?: number;
  itemName: string;
  weightKg: number;
  volumeCbm: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  quantity: number;
  fragile?: boolean;
  stackable?: boolean;
}

export interface Shipment {
  shipmentId?: number;
  customerId?: number;
  customerName?: string;
  sourceCity: string;
  destinationCity: string;
  pickupAddress?: string;
  dropAddress?: string;
  cargoType?: string;
  totalWeightKg?: number;
  totalVolumeCbm?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  requiredPickupDate?: string;
  requiredDeliveryDate?: string;
  specialHandling?: string;
  vehicleTypeRequired?: string;
  status?: ShipmentStatus;
  items?: ShipmentItem[];
  createdAt?: string;
  updatedAt?: string;
}

export type ShipmentPayload = Shipment;
