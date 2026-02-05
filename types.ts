// digital-logbook/types.ts
export type VehicleLog = {
  plateNumber: string;
  status: "IN" | "OUT";
  timeIn?: Date;
  timeOut?: Date;
  ownerName?: string;
  vehicleType?: string;
  color?: string;
  details?: string;
  registered?: boolean; // <-- add this!
};


