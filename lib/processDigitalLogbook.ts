// lib/processDigitalLogbook.ts
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/auth";

export type VehicleLog = {
  id: string;
  plateNumber: string;
  status: "IN" | "OUT";
  timeIn?: any;
  timeOut?: any;
  timestamp?: string;
  enteredBy?: string;
  ownerName?: string;
  vehicleType?: string;
  color?: string;
  details?: string;
  registered?: boolean;
  anomaly?: string;
  // Add these for normalized timestamps
  timeInStr?: string;
  timeOutStr?: string;
};

export type RegisteredVehicle = {
  plateNumber: string;
  ownerName: string;
  vehicleType: string;
  color: string;
  details?: string;
};

export async function processDigitalLogbook() {
  // Fetch logs
  const logsSnap = await getDocs(collection(db, "vehicleLogs"));
  const rawLogs: VehicleLog[] = logsSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as VehicleLog[];

  // Fetch registered vehicles
  const regSnap = await getDocs(collection(db, "registeredvehicles"));
  const registeredVehicles: RegisteredVehicle[] = regSnap.docs.map(d => d.data() as RegisteredVehicle);

  // Normalize logs & enrich metadata
  const enrichedLogs = rawLogs.map(log => {
    const reg = registeredVehicles.find(r => r.plateNumber === log.plateNumber);

    // Normalize timestamps
    const timeInStr = log.timeIn?.toDate ? log.timeIn.toDate().toISOString() : log.timeIn || null;
    const timeOutStr = log.timeOut?.toDate ? log.timeOut.toDate().toISOString() : log.timeOut || null;
    const timestamp = timeInStr || timeOutStr || new Date().toISOString();

    return {
      ...log,
      timeInStr,
      timeOutStr,
      timestamp,
      ownerName: reg?.ownerName || log.ownerName || "Unknown",
      vehicleType: reg?.vehicleType || log.vehicleType || "Unknown",
      color: reg?.color || log.color || "Unknown",
      details: reg?.details || log.details || "N/A",
      registered: !!reg,
      anomaly: reg ? undefined : "Unregistered vehicle",
    };
  });

  // Compute dashboard counts
  const today = new Date().toISOString().slice(0, 10);

  const entriesToday = enrichedLogs.filter(l => l.status === "IN" && l.timeInStr?.startsWith(today)).length;
  const exitsToday = enrichedLogs.filter(l => l.status === "OUT" && l.timeOutStr?.startsWith(today)).length;

  // Vehicles currently inside
  const lastLogByPlate: Record<string, VehicleLog> = {};
  enrichedLogs.forEach(log => {
    lastLogByPlate[log.plateNumber] = log;
  });

  const vehiclesInside = Object.values(lastLogByPlate).filter(l => l.status === "IN").length;

  return {
    enrichedLogs,
    dashboardCounts: { entriesToday, exitsToday, vehiclesInside },
  };
}
