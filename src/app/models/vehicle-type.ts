export interface VehicleTypeOption {
  code: string;
  label: string;
  minTon: number;
  maxTon: number;
  icon: string;
}

export const VEHICLE_TYPES: VehicleTypeOption[] = [
  { code: 'OPEN', label: 'Open', minTon: 7.5, maxTon: 43, icon: 'local_shipping' },
  { code: 'CONTAINER', label: 'Container', minTon: 7.5, maxTon: 30, icon: 'inventory_2' },
  { code: 'LCV', label: 'LCV', minTon: 2.5, maxTon: 7, icon: 'airport_shuttle' },
  { code: 'MINI_PICKUP', label: 'Mini/Pickup', minTon: 0.75, maxTon: 2, icon: 'directions_car' },
  { code: 'TRAILER', label: 'Trailer', minTon: 16, maxTon: 43, icon: 'rv_hookup' },
  { code: 'TIPPER', label: 'Tipper', minTon: 9, maxTon: 30, icon: 'construction' },
  { code: 'TANKER', label: 'Tanker', minTon: 8, maxTon: 36, icon: 'propane_tank' },
  { code: 'DUMPER', label: 'Dumper', minTon: 9, maxTon: 36, icon: 'engineering' },
  { code: 'BULKER', label: 'Bulker', minTon: 20, maxTon: 36, icon: 'warehouse' },
];

export function vehicleTypeLabel(code: string | null | undefined): string {
  if (!code) return '';
  const match = VEHICLE_TYPES.find(t => t.code === code);
  return match ? match.label : code;
}
