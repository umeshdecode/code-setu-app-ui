export type TripStatus =
  | 'CREATED'
  | 'DRIVER_ASSIGNED'
  | 'VEHICLE_ASSIGNED'
  | 'READY_FOR_DISPATCH'
  | 'STARTED'
  | 'REACHED_PICKUP'
  | 'LOADING'
  | 'IN_TRANSIT'
  | 'REACHED_DESTINATION'
  | 'UNLOADING'
  | 'COMPLETED'
  | 'CLOSED'
  | 'ON_HOLD'
  | 'BREAKDOWN'
  | 'DELAYED'
  | 'CANCELLED';

export type ExpenseCategory = 'FUEL' | 'TOLL' | 'PARKING' | 'FOOD' | 'LABOUR' | 'REPAIR' | 'POLICE_FINE' | 'OTHER';
export type ExpensePaidBy   = 'DRIVER' | 'COMPANY' | 'CUSTOMER';

export interface TripStatusHistory {
  id?: number;
  tripId?: number;
  oldStatus?: string;
  newStatus?: string;
  changedBy?: string;
  changedAt?: string;
}

export interface TripExpense {
  expenseId?: number;
  tripId?: number;
  expenseType?: string;
  amount?: number;
  description?: string;
  billNumber?: string;
  receiptUrl?: string;
  expenseDate?: string;
  approved?: boolean | null;
  approvedBy?: string | null;
}

export interface Trip {
  // API fields (actual payload)
  tripId?: number;
  tripNumber?: string;
  shiftingId?: number;
  driverId?: number;
  vehicleId?: number;
  plannedStartTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  plannedDistanceKm?: number;
  actualDistanceKm?: number;
  status?: string;
  remarks?: string;
  active?: boolean;
  // Joined / computed fields from response
  customerId?: number;
  customerName?: string;
  customerUuid?: string;
  driverName?: string;
  vehicleRegistrationNumber?: string;
  sourceCity?: string;
  destinationCity?: string;
  previousActiveStatus?: string;
  statusHistory?: TripStatusHistory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TripPayload {
  tripId?: number;
  tripNumber?: string;
  shiftingId?: number;
  driverId?: number;
  vehicleId?: number;
  plannedStartTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  plannedDistanceKm?: number;
  actualDistanceKm?: number;
  status?: string;
  remarks?: string;
  active?: boolean;
}

export type CreateTripPayload = TripPayload;
export type TransitionTripPayload = { newStatus: TripStatus; remarks?: string };

export interface TripDocument {
  id?: number;
  tripId?: number;
  documentType?: string;
  fileName?: string;
  fileUrl?: string;
  uploadedAt?: string;
  uploadedBy?: string;
}

export interface AddExpensePayload {
  tripId: number;
  expenseType: string;
  amount: number;
  description?: string;
  billNumber?: string;
  receiptUrl?: string;
  expenseDate?: string;
}
