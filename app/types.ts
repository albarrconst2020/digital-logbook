import { Timestamp } from "firebase/firestore";

export type VehicleLog = {
  plateNumber: string;
  status: "IN" | "OUT";
  timeIn?: Timestamp;
  timeOut?: Timestamp;
  ownerName?: string;
  vehicleType?: string;
  color?: string;
  details?: string;
};
