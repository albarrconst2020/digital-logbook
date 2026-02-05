"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/auth";

type Vehicle = {
  plateNumber: string;
  ownerName: string;
  vehicleType: string;
  color: string;
  details?: string;
  status?: "inside" | "outside";
};

export default function EntryPage() {
  const router = useRouter();
  const plateInputRef = useRef<HTMLInputElement>(null);

  const [plateNumber, setPlateNumber] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [notRegistered, setNotRegistered] = useState(false);

  const [ownerName, setOwnerName] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [color, setColor] = useState("");
  const [details, setDetails] = useState("");

  /* ---------- Helpers ---------- */
  const normalizePlate = (plate: string) =>
    plate.trim().toUpperCase().replace(/\s+/g, "");

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(""), 3000);
  };

  const resetForm = () => {
    setPlateNumber("");
    setVehicle(null);
    setOwnerName("");
    setVehicleType("");
    setColor("");
    setDetails("");
    setError("");
    setNotRegistered(false);

    setTimeout(() => {
      plateInputRef.current?.focus();
    }, 100);
  };

  /* ---------- Auth + Role Guard ---------- */
  useEffect(() => {
    plateInputRef.current?.focus();

    const unsub = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) return router.replace("/");

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) return router.replace("/");

        const role = snap.data()?.role;
        if (role !== "entrance") {
          if (role === "exit") return router.replace("/exit");
          if (role === "admin") return router.replace("/dashboard");
          return router.replace("/");
        }
      } catch {
        router.replace("/");
      }
    });

    return () => unsub();
  }, [router]);

  /* ---------- Fetch Vehicle ---------- */
  const fetchVehicle = async () => {
    if (!plateNumber) return;

    setLoading(true);
    setVehicle(null);
    setError("");
    setNotRegistered(false);

    const normalizedPlate = normalizePlate(plateNumber);

    try {
      // Check registered vehicles
      const regQuery = query(
        collection(db, "vehicles"),
        where("plateNumber", "==", normalizedPlate)
      );
      const regSnap = await getDocs(regQuery);

      if (!regSnap.empty) {
        const regVehicle = regSnap.docs[0].data() as Vehicle;
        if (regVehicle.status === "inside") {
          showError("Registered vehicle is already inside");
        } else {
          setVehicle(regVehicle);
        }
        return;
      }

      // Check unregistered vehicle status
      const unregRef = doc(db, "unregisteredVehicles", normalizedPlate);
      const unregSnap = await getDoc(unregRef);

      if (unregSnap.exists() && unregSnap.data()?.status === "inside") {
        showError("Unregistered vehicle is already inside");
        return;
      }

      setNotRegistered(true); // Can log as new unregistered
    } catch (err) {
      console.error(err);
      showError("Failed to check plate");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Log Entry ---------- */
  const logEntry = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    setError("");

    const sanitize = (v?: string) => (v ? v.trim() : "");
    const normalizedPlate = normalizePlate(plateNumber);

    try {
      if (vehicle) {
        // Registered vehicle
        const regQuery = query(
          collection(db, "vehicles"),
          where("plateNumber", "==", normalizedPlate)
        );
        const regSnap = await getDocs(regQuery);
        if (regSnap.empty) throw new Error("Vehicle not found");

        const regDoc = regSnap.docs[0];
        if ((regDoc.data() as Vehicle).status === "inside") {
          return showError("Registered vehicle is already inside");
        }

        await updateDoc(regDoc.ref, {
          status: "inside",
          lastEntryAt: serverTimestamp(),
        });

        await addDoc(collection(db, "vehicleLogs"), {
          vehicleId: regDoc.id,
          plateNumber: normalizedPlate,
          ownerName: sanitize(vehicle.ownerName),
          vehicleType: sanitize(vehicle.vehicleType),
          color: sanitize(vehicle.color),
          details: sanitize(vehicle.details),
          action: "entry",
          status: "IN",
          timeIn: serverTimestamp(),
          enteredBy: auth.currentUser.uid,
          registered: true,
          purpose: "N/A",
        });

        showSuccess("Registered vehicle entry logged");
      } else if (notRegistered) {
        // Unregistered vehicle
        if (!ownerName || !vehicleType || !color)
          return showError("Owner, type, and color are required");

        const unregRef = doc(db, "unregisteredVehicles", normalizedPlate);
        const unregSnap = await getDoc(unregRef);

        if (unregSnap.exists() && unregSnap.data()?.status === "inside") {
          return showError("Unregistered vehicle is already inside");
        }

        await setDoc(unregRef, { status: "inside" }, { merge: true });

        await addDoc(collection(db, "vehicleLogs"), {
          plateNumber: normalizedPlate,
          ownerName: sanitize(ownerName),
          vehicleType: sanitize(vehicleType),
          color: sanitize(color),
          details: sanitize(details),
          action: "entry",
          status: "IN",
          timeIn: serverTimestamp(),
          enteredBy: auth.currentUser.uid,
          registered: false,
          purpose: "N/A",
        });

        showSuccess("Unregistered vehicle entry logged");
      }

      resetForm();
    } catch (err) {
      console.error(err);
      showError("Failed to log entry");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => signOut(auth).then(() => router.replace("/"))}
          className="text-sm text-red-600 hover:underline"
        >
          Logout
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img src="/zcmc.png" alt="ZCMC Logo" className="h-16 w-auto" />
        </div>

        <h1 className="text-2xl font-bold text-center mb-6">
          Vehicle Entry
        </h1>

        <label className="text-sm font-medium">Plate Number</label>
        <input
          ref={plateInputRef}
          className="w-full text-lg uppercase px-4 py-3 border rounded-xl
                     focus:ring-2 focus:ring-green-500"
          placeholder="ABC1234 / 123ABC"
          value={plateNumber}
          onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && fetchVehicle()}
        />

        <button
          onClick={fetchVehicle}
          disabled={loading || !plateNumber}
          className="mt-4 w-full py-3 rounded-xl font-semibold
                     bg-black text-white disabled:bg-gray-300"
        >
          {loading ? "Checking..." : "Check Plate"}
        </button>

        {vehicle && (
          <div className="mt-6 p-4 rounded-xl bg-green-50 border">
            <p className="font-bold text-lg">{vehicle.plateNumber}</p>
            <p><b>Owner:</b> {vehicle.ownerName}</p>
            <p><b>Type:</b> {vehicle.vehicleType}</p>
            <p><b>Color:</b> {vehicle.color}</p>

            <button
              onClick={logEntry}
              disabled={loading || vehicle.status === "inside"}
              className="mt-4 w-full py-3 bg-green-600 text-white rounded-xl font-bold disabled:bg-gray-300"
            >
              {vehicle.status === "inside" ? "Already Inside" : "ENTER VEHICLE"}
            </button>
          </div>
        )}

        {notRegistered && (
          <div className="mt-6 p-4 rounded-xl bg-yellow-50 border">
            <input
              className="w-full mb-2 p-2 border rounded"
              placeholder="Owner Name"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
            <input
              className="w-full mb-2 p-2 border rounded"
              placeholder="Vehicle Type"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            />
            <input
              className="w-full mb-2 p-2 border rounded"
              placeholder="Color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
            <input
              className="w-full mb-2 p-2 border rounded"
              placeholder="Details (optional)"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />

            <button
              onClick={logEntry}
              disabled={loading}
              className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold"
            >
              LOG ENTRY
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 bg-green-100 text-green-800 text-center rounded">
            ✅ {successMsg}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 text-center rounded">
            ❌ {error}
          </div>
        )}
      </div>
    </div>
  );
}
