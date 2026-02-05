"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import { useUserRole } from "../../hooks/useUserRole";
import toast, { Toaster } from "react-hot-toast"; // <-- added toast

export default function VehicleList() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const { role: userRole, loading } = useUserRole();
  const [updatingId, setUpdatingId] = useState<string | null>(null); // prevent double click

  useEffect(() => {
    const q = query(collection(db, "vehicles"), orderBy("timeIn", "desc"));

    const unsub = onSnapshot(q, (snapshot) => {
      setVehicles(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });

    return () => unsub();
  }, []);

  if (loading) return null; // prevent role flicker

  // --- Exit handler with toast notifications & error handling
  const handleExit = async (vehicleId: string) => {
    if (updatingId) return; // prevent double clicks

    setUpdatingId(vehicleId);

    try {
      const vehicleRef = doc(db, "vehicles", vehicleId);
      await updateDoc(vehicleRef, {
        status: "OUT",
        timeOut: serverTimestamp(),
      });
      toast.success("Vehicle marked OUT successfully!");
    } catch (error: any) {
      console.error("Exit failed:", error);
      toast.error("Failed to mark OUT. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="border p-4 rounded">
      <Toaster position="top-right" /> {/* toast container */}
      <h2 className="text-xl font-bold mb-2">Vehicle Log</h2>

      {vehicles.map((v) => (
        <div
          key={v.id}
          className={`border-b p-2 flex justify-between items-center
            ${v.status === "OUT" ? "bg-gray-100 text-gray-500" : ""}`} // subtle UX cue for OUT vehicles
        >
          <div>
            <strong>{v.plateNumber}</strong> ({v.vehicleType})<br />
            Status: {v.status}<br />
            Time In: {v.timeIn?.toDate?.().toLocaleString() || "-"}<br />
            Time Out: {v.timeOut?.toDate?.().toLocaleString() || "-"}
          </div>

          {(userRole === "exit" || userRole === "admin") &&
            v.status === "IN" &&
            v.timeIn && (
              <button
                className={`px-3 py-1 text-sm rounded ${
                  updatingId === v.id
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
                onClick={() => handleExit(v.id)}
                disabled={updatingId === v.id}
              >
                {updatingId === v.id ? "Updating..." : "OUT"}
              </button>
            )}
        </div>
      ))}
    </div>
  );
}
