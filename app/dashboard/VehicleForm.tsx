"use client";

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth } from "../../lib/auth";
import { db } from "../../lib/firebaseConfig";

export default function VehicleForm() {
  const [plateNumber, setPlateNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [purpose, setPurpose] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber || !vehicleType) return;

    setSaving(true);

    try {
      await addDoc(collection(db, "vehicles"), {
        plateNumber,
        vehicleType,
        purpose,
        remarks,
        status: "IN",
        enteredBy: auth.currentUser?.uid,
        exitedBy: null,
        timeIn: serverTimestamp(),
        timeOut: null,
      });

      setPlateNumber("");
      setVehicleType("");
      setPurpose("");
      setRemarks("");
    } catch (err) {
      console.error("Add vehicle failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border p-4 rounded space-y-3">
      <h2 className="font-semibold">Vehicle Entry</h2>

      <input
        className="border p-2 w-full"
        placeholder="Plate Number"
        value={plateNumber}
        onChange={(e) => setPlateNumber(e.target.value)}
      />

      <input
        className="border p-2 w-full"
        placeholder="Vehicle Type"
        value={vehicleType}
        onChange={(e) => setVehicleType(e.target.value)}
      />

      <input
        className="border p-2 w-full"
        placeholder="Purpose"
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
      />

      <input
        className="border p-2 w-full"
        placeholder="Remarks"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
      />

      <button
        disabled={saving}
        className="bg-black text-white px-4 py-2 rounded"
      >
        {saving ? "Saving..." : "Log Vehicle"}
      </button>
    </form>
  );
}
