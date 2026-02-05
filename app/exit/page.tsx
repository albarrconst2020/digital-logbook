"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/auth";

type Vehicle = {
  docId?: string;
  plateNumber: string;
  ownerName: string;
  vehicleType: string;
  color: string;
  details?: string;
  status?: "inside" | "outside";
  registered?: boolean;
};

export default function ExitPage() {
  const router = useRouter();
  const [plateNumber, setPlateNumber] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [alreadyExited, setAlreadyExited] = useState(false);
  const [error, setError] = useState("");

  /* ---------- Auth + Role Guard ---------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) return router.replace("/");

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) return router.replace("/");

        const role = snap.data()?.role;
        if (role !== "exit") {
          if (role === "entrance") return router.replace("/entry");
          if (role === "admin") return router.replace("/dashboard");
          return router.replace("/");
        }
      } catch (err) {
        console.error("Auth/Role check failed:", err);
        router.replace("/");
      }
    });
    return () => unsub();
  }, [router]);

  /* ---------- Fetch vehicle ---------- */
  const fetchVehicle = async () => {
    if (!plateNumber) return;
    setLoading(true);
    setVehicle(null);
    setAlreadyExited(false);
    setError("");

    const plate = plateNumber.trim().toUpperCase();
    const sanitize = (val?: string) => (val ? val.trim() : "");

    try {
      // 1️⃣ Check registered vehicles
      const qVehicle = query(
        collection(db, "vehicles"),
        where("plateNumber", "==", plate)
      );
      const snapVehicle = await getDocs(qVehicle);

      if (!snapVehicle.empty) {
        const vehicleDoc = snapVehicle.docs[0];
        const vehicleData: Vehicle = {
          ...vehicleDoc.data(),
          docId: vehicleDoc.id,
          registered: true,
        } as Vehicle;

        if (vehicleData.status !== "inside") setAlreadyExited(true);

        setVehicle(vehicleData);
        setLoading(false);
        return;
      }

      // 2️⃣ Check unregistered vehicles (last IN log)
      const qLog = query(
        collection(db, "vehicleLogs"),
        where("plateNumber", "==", plate),
        where("status", "==", "IN"),
        orderBy("timeIn", "desc"),
        limit(1)
      );
      const snapLog = await getDocs(qLog);

      if (!snapLog.empty) {
        const log = snapLog.docs[0].data();
        setVehicle({
          plateNumber: plate,
          ownerName: sanitize(log.ownerName) || "Unregistered",
          vehicleType: sanitize(log.vehicleType) || "N/A",
          color: sanitize(log.color) || "N/A",
          details: sanitize(log.details) || "N/A",
          registered: false,
          status: "inside",
          docId: snapLog.docs[0].id, // store log ID for exit update
        });
        setLoading(false);
        return;
      }

      setError("Vehicle not found or already exited.");
    } catch (err) {
      console.error("Error fetching vehicle:", err);
      setError("Error fetching vehicle data. Check console.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Exit vehicle ---------- */
  const exitVehicle = async () => {
    if (!vehicle) return;
    if (!auth.currentUser) return alert("User not authenticated");
    const currentUser = auth.currentUser;
    setLoading(true);
    setError("");

    const sanitize = (val?: string) => (val ? val.trim() : "");

    try {
      // 1️⃣ Registered vehicle exit
      if (vehicle.registered && vehicle.docId) {
        const vehicleRef = doc(db, "vehicles", vehicle.docId);
        await updateDoc(vehicleRef, {
          status: "outside",
          lastExitAt: serverTimestamp(),
        });

        // Log the exit
        await addDoc(collection(db, "vehicleLogs"), {
          plateNumber: sanitize(vehicle.plateNumber),
          ownerName: sanitize(vehicle.ownerName),
          vehicleType: sanitize(vehicle.vehicleType),
          color: sanitize(vehicle.color),
          details: sanitize(vehicle.details),
          action: "exit",
          status: "OUT",
          timeOut: serverTimestamp(),
          processedBy: currentUser.uid,
          registered: true,
        });
      }

      // 2️⃣ Unregistered vehicle exit
      if (!vehicle.registered && vehicle.docId) {
        const logRef = doc(db, "vehicleLogs", vehicle.docId);
        await updateDoc(logRef, {
          status: "OUT",
          timeOut: serverTimestamp(),
          action: "exit",
          processedBy: currentUser.uid,
        });
      }

      // 3️⃣ Refetch vehicle to update UI
      await fetchVehicle();
    } catch (err: any) {
      console.error("Error exiting vehicle:", err);
      setError("Error exiting vehicle: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => signOut(auth).then(() => router.replace("/"))}
          className="text-sm text-red-600 underline"
        >
          Logout
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img src="/zcmc.png" alt="Logo" className="h-16 w-auto" />
        </div>

        <h1 className="text-2xl font-bold text-center mb-6">Vehicle Exit</h1>

        {/* Mobile-friendly input */}
        <input
          className="border p-3 w-full text-center text-lg uppercase rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="ENTER PLATE NUMBER"
          value={plateNumber}
          onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && fetchVehicle()}
          inputMode="text"
          autoCorrect="off"
          spellCheck={false}
          autoCapitalize="characters"
        />

        <button
          onClick={fetchVehicle}
          disabled={loading || !plateNumber}
          className="w-full py-3 bg-black text-white rounded-xl font-semibold"
        >
          {loading ? "Checking..." : "Check Plate"}
        </button>

        {error && <p className="mt-3 text-red-600 text-center">{error}</p>}

        {vehicle && (
          <div
            className={`mt-6 p-4 rounded-xl border ${
              alreadyExited ? "bg-red-100" : "bg-green-50"
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <p className="font-bold">{vehicle.plateNumber}</p>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  alreadyExited
                    ? "bg-red-500 text-white"
                    : "bg-green-500 text-white"
                }`}
              >
                {alreadyExited ? "OUTSIDE" : "INSIDE"}
              </span>
            </div>

            <p>
              <b>Owner:</b> {vehicle.ownerName}
            </p>
            <p>
              <b>Type:</b> {vehicle.vehicleType}
            </p>
            <p>
              <b>Color:</b> {vehicle.color}
            </p>
            <p>
              <b>Details:</b> {vehicle.details}
            </p>

            {!alreadyExited && (
              <button
                onClick={exitVehicle}
                disabled={loading}
                className="mt-4 w-full bg-red-600 text-white py-2 rounded-xl font-bold"
              >
                {loading ? "Processing..." : "EXIT"}
              </button>
            )}

            {alreadyExited && (
              <p className="mt-3 text-gray-700 text-sm text-center">
                Vehicle has already exited. Cannot exit again.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
