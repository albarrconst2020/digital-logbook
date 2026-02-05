"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../../lib/firebaseConfig";

type Vehicle = {
  id: string;
  plateNumber: string;
  ownerName: string;
  vehicleType: string;
  color: string;
  details: string;
  createdAt?: any;
};

export default function VehiclesListPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Edit modal state
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editPlate, setEditPlate] = useState("");
  const [editOwner, setEditOwner] = useState("");
  const [editType, setEditType] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [saving, setSaving] = useState(false);

  // 🔹 Fetch vehicles
  const fetchVehicles = async () => {
    try {
      const snap = await getDocs(collection(db, "vehicles"));
      const data: Vehicle[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Vehicle[];

      const formattedData = data.map((v) => ({
        ...v,
        plateNumber: v.plateNumber?.toUpperCase() || "N/A",
        ownerName: v.ownerName || "N/A",
        vehicleType: v.vehicleType || "N/A",
        color: v.color || "N/A",
        details: v.details || "N/A",
      }));

      setVehicles(formattedData);
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) return router.replace("/");

      fetchVehicles();
    });

    return () => unsub();
  }, [router]);

  // 🔹 Delete vehicle
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      await deleteDoc(doc(db, "vehicles", id));
      setVehicles((prev) => prev.filter((v) => v.id !== id));
      alert("Vehicle deleted successfully.");
    } catch (err) {
      console.error("Delete vehicle error:", err);
      alert(`Failed to delete vehicle: ${err instanceof Error ? err.message : err}`);
    }
  };

  // 🔹 Open edit modal
  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setEditPlate(vehicle.plateNumber);
    setEditOwner(vehicle.ownerName);
    setEditType(vehicle.vehicleType);
    setEditColor(vehicle.color);
    setEditDetails(vehicle.details);
  };

  // 🔹 Save edited vehicle
  const handleSave = async () => {
    if (!editingVehicle) return;

    if (!editPlate || !editOwner || !editType || !editDetails) {
      return alert("Plate, Owner, Type, and Details are required!");
    }

    setSaving(true);
    try {
      const vehicleRef = doc(db, "vehicles", editingVehicle.id);
      await updateDoc(vehicleRef, {
        plateNumber: editPlate.trim().toUpperCase(),
        ownerName: editOwner.trim(),
        vehicleType: editType.trim(),
        color: editColor.trim() || "N/A",
        details: editDetails.trim(),
        updatedAt: serverTimestamp(),
      });

      // Update local state
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === editingVehicle.id
            ? {
                ...v,
                plateNumber: editPlate.trim().toUpperCase(),
                ownerName: editOwner.trim(),
                vehicleType: editType.trim(),
                color: editColor.trim() || "N/A",
                details: editDetails.trim(),
              }
            : v
        )
      );

      alert("Vehicle updated successfully!");
      setEditingVehicle(null);
    } catch (err) {
      console.error("Update vehicle error:", err);
      alert(`Failed to update vehicle: ${err instanceof Error ? err.message : err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 bg-gray-50 py-8">
      

      <h1 className="text-2xl font-bold mb-6">Registered Vehicles</h1>

      {loading ? (
        <p>Loading vehicles...</p>
      ) : vehicles.length === 0 ? (
        <p>No vehicles registered.</p>
      ) : (
        <div className="overflow-x-auto w-full max-w-6xl">
          <table className="min-w-full bg-white border rounded shadow">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border">Plate</th>
                <th className="px-4 py-2 border">Owner</th>
                <th className="px-4 py-2 border">Type</th>
                <th className="px-4 py-2 border">Color</th>
                <th className="px-4 py-2 border">Details</th>
                <th className="px-4 py-2 border">Edit</th>
                <th className="px-4 py-2 border">Delete</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{v.plateNumber}</td>
                  <td className="px-4 py-2 border">{v.ownerName}</td>
                  <td className="px-4 py-2 border">{v.vehicleType}</td>
                  <td className="px-4 py-2 border">{v.color}</td>
                  <td className="px-4 py-2 border">{v.details}</td>
                  <td className="px-4 py-2 border text-center">
                    <button
                      onClick={() => openEditModal(v)}
                      className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                  </td>
                  <td className="px-4 py-2 border text-center">
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 🔹 Edit Modal */}
      {editingVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-full max-w-md shadow-lg">
            <h2 className="text-xl font-bold mb-4">Edit Vehicle</h2>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Plate Number"
                value={editPlate}
                onChange={(e) => setEditPlate(e.target.value)}
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Owner Name"
                value={editOwner}
                onChange={(e) => setEditOwner(e.target.value)}
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Type / Model"
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Details (relationship)"
                value={editDetails}
                onChange={(e) => setEditDetails(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setEditingVehicle(null)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
