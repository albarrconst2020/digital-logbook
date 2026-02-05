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
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebaseConfig"; // <-- fixed import path

type Vehicle = {
  docId?: string;
  plateNumber: string;
  ownerName: string;
  vehicleType: string;
  color: string;
  details?: string;
  registered?: boolean;
};

export default function ExitPage() {
  const router = useRouter();
  const plateInputRef = useRef<HTMLInputElement>(null);

  const [plateNumber, setPlateNumber] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [alreadyOut, setAlreadyOut] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  /* ---------- Auth + Role Guard ---------- */
  useEffect(() => {
    plateInputRef.current?.focus();
    const unsub = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) return router.replace("/");

      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) return router.replace("/");

      const role = snap.data()?.role;
      if (role !== "exit") {
        if (role === "entrance") return router.replace("/entry");
        if (role === "admin") return router.replace("/dashboard");
        return router.replace("/");
      }
    });
    return () => unsub();
  }, [router]);

  const normalizePlate = (p: string) =>
    p.trim().toUpperCase().replace(/\s+/g, "");
  const sanitize = (v?: string) => (v ? v.trim() : "");

  /* ---------- Fetch Vehicle (LATEST LOG = SOURCE OF TRUTH) ---------- */
  const fetchVehicle = async () => {
    if (!plateNumber) return;

    setLoading(true);
    setVehicle(null);
    setAlreadyOut(false);
    setError("");
    setSuccessMsg("");

    const plate = normalizePlate(plateNumber);

    try {
      const q = query(
        collection(db, "vehicleLogs"),
        where("plateNumber", "==", plate)
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        // Plate not found => show simple message
        setError("No record found");
        setLoading(false);
        return;
      }

      // pick latest log by timeIn / timeOut
      const logs = snap.docs.map((d) => d.data());
      const latest = logs.sort((a, b) => {
        const ta =
          (a.timeOut?.toDate?.() ?? a.timeIn?.toDate?.())?.getTime() ?? 0;
        const tb =
          (b.timeOut?.toDate?.() ?? b.timeIn?.toDate?.())?.getTime() ?? 0;
        return tb - ta;
      })[0];

      if (latest.status === "OUT") setAlreadyOut(true);

      setVehicle({
        plateNumber: plate,
        ownerName: sanitize(latest.ownerName) || "Unregistered",
        vehicleType: sanitize(latest.vehicleType) || "N/A",
        color: sanitize(latest.color) || "N/A",
        details: sanitize(latest.details) || "—",
        registered: !!latest.registered,
        docId: latest.vehicleId,
      });
    } catch (err) {
      console.error(err);
      setError("Failed to fetch vehicle");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Exit Vehicle ---------- */
  const exitVehicle = async () => {
    if (!vehicle || alreadyOut || !auth.currentUser) return;

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (vehicle.registered && vehicle.docId) {
        await updateDoc(doc(db, "vehicles", vehicle.docId), {
          status: "outside",
          lastExitAt: serverTimestamp(),
        });
      } else {
        // unregistered vehicle => track separately
        await updateDoc(
          doc(db, "unregisteredVehicles", vehicle.plateNumber),
          { status: "outside" }
        );
      }

      await addDoc(collection(db, "vehicleLogs"), {
        plateNumber: vehicle.plateNumber,
        ownerName: sanitize(vehicle.ownerName),
        vehicleType: sanitize(vehicle.vehicleType),
        color: sanitize(vehicle.color),
        details: sanitize(vehicle.details),
        action: "exit",
        status: "OUT",
        timeOut: serverTimestamp(),
        processedBy: auth.currentUser.uid,
        registered: !!vehicle.registered,
      });

      setSuccessMsg("✅ Vehicle Exited");

      setTimeout(() => {
        router.refresh();
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error(err);
      setError("Exit failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- UI ---------- */
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
        <div className="flex justify-center mb-4">
          <img src="/zcmc.png" alt="Logo" className="h-16 w-auto" />
        </div>

        <h1 className="text-2xl font-bold text-center mb-6">Vehicle Exit</h1>

        <input
          ref={plateInputRef}
          className="border p-3 w-full text-center text-lg uppercase rounded-lg mb-3"
          placeholder="ENTER PLATE NUMBER"
          value={plateNumber}
          onChange={(e) => {
            // ZTE input fix: clear only if user really deletes, prevent jumpy erase
            setPlateNumber(e.target.value.toUpperCase());
          }}
          onKeyDown={(e) => e.key === "Enter" && fetchVehicle()}
        />

        <button
          onClick={fetchVehicle}
          disabled={loading || !plateNumber}
          className="w-full py-3 bg-black text-white rounded-xl font-semibold"
        >
          {loading ? "Checking..." : "Check Plate"}
        </button>

        {error && <p className="mt-3 text-red-600 text-center">{error}</p>}
        {successMsg && <p className="mt-3 text-green-700 text-center">{successMsg}</p>}

        {vehicle && (
          <div
            className={`mt-6 p-4 rounded-xl border ${
              alreadyOut ? "bg-red-100" : "bg-green-50"
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <p className="font-bold">{vehicle.plateNumber}</p>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  alreadyOut
                    ? "bg-red-500 text-white"
                    : "bg-green-500 text-white"
                }`}
              >
                {alreadyOut ? "OUTSIDE" : "INSIDE"}
              </span>
            </div>

            <p><b>Owner:</b> {vehicle.ownerName}</p>
            <p><b>Type:</b> {vehicle.vehicleType}</p>
            <p><b>Color:</b> {vehicle.color}</p>
            <p><b>Details:</b> {vehicle.details}</p>

            {!alreadyOut && (
              <button
                onClick={exitVehicle}
                disabled={loading}
                className="mt-4 w-full bg-red-600 text-white py-2 rounded-xl font-bold"
              >
                {loading ? "Processing..." : "EXIT"}
              </button>
            )}

            {alreadyOut && (
              <p className="mt-3 text-gray-700 text-sm text-center">
                Vehicle already exited.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
