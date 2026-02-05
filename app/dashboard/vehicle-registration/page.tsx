"use client";

import { useState } from "react";
import Image from "next/image";
import { db, auth } from "../../../lib/firebaseConfig";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

export default function VehicleRegistrationPage() {
  const [plateNumber, setPlateNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [color, setColor] = useState("");
  const [details, setDetails] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resetForm = () => {
    setPlateNumber("");
    setVehicleType("");
    setOwnerName("");
    setColor("");
    setDetails("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");

    const normalizedPlate = plateNumber.trim().toUpperCase();

    if (!normalizedPlate || !vehicleType.trim() || !ownerName.trim() || !details.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    try {
      const vehiclesRef = collection(db, "vehicles");
      const q = query(vehiclesRef, where("plateNumber", "==", normalizedPlate));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setError(`Vehicle with plate number "${normalizedPlate}" already exists.`);
        return;
      }

      await addDoc(vehiclesRef, {
        plateNumber: normalizedPlate,
        vehicleType: vehicleType.trim(),
        ownerName: ownerName.trim(),
        color: color.trim() || "N/A",
        details: details.trim(),
        status: "outside",
        createdAt: serverTimestamp(),
        issuedBy: auth.currentUser?.uid ?? "unknown",
      });

      setSuccess("Vehicle registered successfully.");
      resetForm();
    } catch (err) {
      console.error(err);
      setError("Failed to register vehicle.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
        
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Image
            src="/zcmc.png"
            alt="Organization Logo"
            width={90}
            height={90}
            priority
          />
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-center">
          Vehicle Registration
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Register authorized vehicles in the system
        </p>

        {/* Messages */}
        {error && (
          <div className="mb-3 p-2 text-sm text-red-700 bg-red-100 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-3 p-2 text-sm text-green-700 bg-green-100 rounded">
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Plate Number *"
            value={plateNumber}
            onChange={(e) => setPlateNumber(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="text"
            placeholder="Vehicle Type / Model *"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="text"
            placeholder="Owner Name *"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="text"
            placeholder="Color (optional)"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="text"
            placeholder="Relationship to Organization *"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded text-white font-medium transition
              ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}
            `}
          >
            {loading ? "Registering..." : "Register Vehicle"}
          </button>
        </form>
      </div>
    </div>
  );
}
