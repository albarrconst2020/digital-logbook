"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/auth";
import SummaryCards from "@/components/dashboard/SummaryCards";
import TrafficGraph from "@/components/TrafficGraph";
import PieChartRegistered from "@/components/dashboard/PieChartRegistered";
import BarChartDuration from "@/components/dashboard/BarChartDuration";
import { VehicleLog } from "@/types";
import Image from "next/image";
import { signOut } from "firebase/auth";

type DashboardMode =
  | "NONE"
  | "ENTRY"
  | "EXIT"
  | "INSIDE"
  | "HOURLY_TRAFFIC"
  | "PIE_REGISTERED"
  | "BAR_DURATION"
  | "VEHICLE_LIST"
  | "VEHICLE_HISTORY";

export default function DashboardPage() {
  const [logs, setLogs] = useState<VehicleLog[]>([]);
  const [insideCount, setInsideCount] = useState(0);
  const [mode, setMode] = useState<DashboardMode>("NONE");

  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState("");

  const [historyPlate, setHistoryPlate] = useState("");
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // New: INSIDE Duration Filter
  const [insideDurationFilter, setInsideDurationFilter] = useState<
    "ALL" | "<24" | "1-3" | ">5"
  >("ALL");

  const getLogTime = (log: VehicleLog) => log.timeIn ?? log.timeOut ?? null;

  /* ---------------- Load logs ---------------- */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "vehicleLogs"), (snap) => {
      const allLogs: VehicleLog[] = snap.docs
        .map((doc) => {
          const d = doc.data();
          return {
            plateNumber: d.plateNumber,
            status: d.status,
            ownerName: d.ownerName,
            vehicleType: d.vehicleType,
            color: d.color,
            details: d.details,
            timeIn: d.timeIn?.toDate(),
            timeOut: d.timeOut?.toDate(),
            registered: d.registered ?? !!d.ownerName,
          } as VehicleLog;
        })
        .filter((l) => l.timeIn || l.timeOut)
        .sort((a, b) => (getLogTime(a)?.getTime() ?? 0) - (getLogTime(b)?.getTime() ?? 0));

      setLogs(allLogs);

      const lastLogByPlate: Record<string, VehicleLog> = {};
      allLogs.forEach((l) => (lastLogByPlate[l.plateNumber] = l));
      setInsideCount(
        Object.values(lastLogByPlate).filter((l) => l.status === "IN").length
      );
    });

    return () => unsub();
  }, []);

  /* ---------------- Dashboard blocks ---------------- */
  const dashboardBlocks = [
    { label: "Entry Vehicles", mode: "ENTRY", image: "/images/entry.png" },
    { label: "Exit Vehicles", mode: "EXIT", image: "/images/exit.png" },
    { label: "Vehicles Inside", mode: "INSIDE", image: "/images/inside1.png" },
    { label: "Hourly Traffic", mode: "HOURLY_TRAFFIC", image: "/images/hourly1.png" },
    { label: "Registered vs Unregistered", mode: "PIE_REGISTERED", image: "/images/pie1.png" },
    { label: "Inside Duration", mode: "BAR_DURATION", image: "/images/bar1.png" },
    { label: "Vehicle List", mode: "VEHICLE_LIST", image: "/images/list1.png" },
    { label: "Vehicle History", mode: "VEHICLE_HISTORY", image: "/images/history1.png" },
  ];

  const chartLogs = logs.filter(
    (l) =>
      (!l.timeIn || l.timeIn.toISOString().slice(0, 10) >= fromDate) &&
      (!l.timeOut || l.timeOut.toISOString().slice(0, 10) <= toDate)
  );

  const handleLogout = async () => {
    await signOut(auth);
    location.reload();
  };

  /* ---------------- Filtered List ---------------- */
  const filteredList = (() => {
    let list: VehicleLog[] = [];

    if (mode === "ENTRY") {
      list = logs.filter(
        (l) =>
          l.timeIn &&
          l.timeIn.toISOString().slice(0, 10) >= fromDate &&
          l.timeIn.toISOString().slice(0, 10) <= toDate
      );
    } else if (mode === "EXIT") {
      list = logs.filter(
        (l) =>
          l.timeOut &&
          l.timeOut.toISOString().slice(0, 10) >= fromDate &&
          l.timeOut.toISOString().slice(0, 10) <= toDate
      );
    } else if (mode === "INSIDE") {
      const last: Record<string, VehicleLog> = {};
      logs.forEach((l) => (last[l.plateNumber] = l));
      list = Object.values(last).filter((l) => l.status === "IN");

      // Apply INSIDE Duration Filter
      if (insideDurationFilter !== "ALL") {
        list = list.filter((v) => {
          if (!v.timeIn) return false;
          const durationHours = (new Date().getTime() - v.timeIn.getTime()) / (1000 * 60 * 60);
          if (insideDurationFilter === "<24") return durationHours < 24;
          if (insideDurationFilter === "1-3") return durationHours >= 24 && durationHours <= 72;
          if (insideDurationFilter === ">5") return durationHours > 120;
          return true;
        });
      }
    } else if (mode === "VEHICLE_LIST") {
      list = logs;
    }

    const q = searchQuery.toLowerCase();
    return list.filter(
      (v) =>
        v.plateNumber.toLowerCase().includes(q) ||
        v.ownerName?.toLowerCase().includes(q) ||
        v.vehicleType?.toLowerCase().includes(q)
    );
  })();

  /* ---------------- Vehicle History ---------------- */
  const normalizePlate = (p: string) => p.trim().toUpperCase().replace(/\s+/g, "");

  const fetchHistory = async () => {
    if (!historyPlate) return;
    setHistoryLoading(true);
    setHistoryError("");
    setHistoryLogs([]);

    try {
      const q = query(
        collection(db, "vehicleLogs"),
        where("plateNumber", "==", normalizePlate(historyPlate))
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setHistoryError("No logs found for this vehicle");
      } else {
        const data = snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            ...d,
            time: d.timeIn?.toDate() ?? d.timeOut?.toDate(),
          };
        });

        data.sort((a, b) => (b.time?.getTime() ?? 0) - (a.time?.getTime() ?? 0));
        setHistoryLogs(data);
      }
    } catch {
      setHistoryError("Failed to fetch logs");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gray-50">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
        <div className="flex items-center gap-3">
          <Image src="/images/zcmc1.png" alt="ZCMC Logo" width={50} height={50} />
          <h1 className="text-2xl sm:text-3xl font-bold">
            ZCMC Vehicle E-Logbook
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.open("/dashboard/vehicle-registration", "_blank")}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Register Vehicle
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      <SummaryCards logs={logs} insideCount={insideCount} onSelect={() => {}} />

      {/* Dashboard Blocks */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardBlocks.map((b) => (
          <button
            key={b.label}
            onClick={() => {
              if (b.mode === "VEHICLE_LIST") {
                window.open("/dashboard/vehicles", "_blank");
              } else {
                setMode(b.mode as DashboardMode);
                setSearchQuery("");
              }
            }}
            className={`rounded-xl border p-4 flex flex-col items-center justify-center
              transition hover:scale-105 shadow-sm hover:shadow-xl
              ${mode === b.mode ? "border-blue-500 bg-blue-50" : "bg-white"}`}
          >
            <div className="relative h-24 w-24 mb-2">
              <Image src={b.image} alt={b.label} fill className="object-contain" />
            </div>
            <span className="font-semibold text-gray-700 text-sm text-center">
              {b.label}
            </span>
          </button>
        ))}
      </div>

      {/* FILTER BAR */}
      {(mode !== "NONE" && mode !== "VEHICLE_HISTORY") && (
        <div className="mt-6 bg-white rounded shadow p-4 flex flex-wrap gap-2 items-center">
          {(mode === "ENTRY" ||
            mode === "EXIT" ||
            mode === "HOURLY_TRAFFIC" ||
            mode === "PIE_REGISTERED" ||
            mode === "BAR_DURATION") && (
            <>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border rounded px-3 py-1"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border rounded px-3 py-1"
              />
            </>
          )}

          {(mode === "ENTRY" ||
            mode === "EXIT" ||
            mode === "INSIDE" ||
            mode === "VEHICLE_LIST") && (
            <>
              <input
                type="text"
                placeholder="Search plate, owner, type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border rounded px-3 py-1 w-full sm:w-64"
              />
              {mode === "INSIDE" && (
                <select
                  value={insideDurationFilter}
                  onChange={(e) =>
                    setInsideDurationFilter(e.target.value as any)
                  }
                  className="border rounded px-3 py-1"
                >
                  <option value="ALL">All Durations</option>
                  <option value="<24">Less than 24 hrs</option>
                  <option value="1-3">1–3 days</option>
                  <option value=">5">More than 5 days</option>
                </select>
              )}
            </>
          )}
        </div>
      )}

      {/* TABLE */}
      {(mode === "ENTRY" || mode === "EXIT" || mode === "INSIDE" || mode === "VEHICLE_LIST") && (
        <div className="mt-4 overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full text-center">
            <thead className="bg-green-400 text-white">
              <tr>
                <th className="border px-4 py-2">Plate</th>
                <th className="border px-4 py-2">Owner</th>
                <th className="border px-4 py-2">Type</th>
                <th className="border px-4 py-2">Color</th>
                <th className="border px-4 py-2">Details</th>
                <th className="border px-4 py-2">
                  {mode === "INSIDE" ? "Registration / Duration" : "Date & Time"}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((v) => {
                let isLongInside = false;
                let durationText = "";
                if (mode === "INSIDE" && v.timeIn) {
                  const durationHours = (new Date().getTime() - v.timeIn.getTime()) / (1000 * 60 * 60);
                  isLongInside = durationHours >= 120; // 5 days threshold
                  durationText = durationHours >= 24
                    ? `${(durationHours / 24).toFixed(2)} days`
                    : `${durationHours.toFixed(2)} hrs`;
                }

                return (
                  <tr
                    key={`${v.plateNumber}-${getLogTime(v)?.getTime()}`}
                    className={isLongInside ? "bg-red-100" : ""}
                  >
                    <td className="border px-4 py-2">{v.plateNumber}</td>
                    <td className="border px-4 py-2">{v.ownerName || "—"}</td>
                    <td className="border px-4 py-2">{v.vehicleType || "—"}</td>
                    <td className="border px-4 py-2">{v.color || "—"}</td>
                    <td className="border px-4 py-2">{v.details || "—"}</td>
                    <td className="border px-4 py-2">
                      {mode === "INSIDE"
                        ? `${v.registered ? "Registered" : "Unregistered"} (${durationText})`
                        : mode === "ENTRY"
                        ? v.timeIn?.toLocaleString()
                        : v.timeOut?.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CHARTS */}
      {mode === "PIE_REGISTERED" && (
        <div className="mt-6 bg-white rounded shadow p-4">
          <PieChartRegistered logs={chartLogs} />
        </div>
      )}

      {mode === "BAR_DURATION" && (
        <div className="mt-6 bg-white rounded shadow p-4">
          <BarChartDuration logs={logs} />
        </div>
      )}

      {mode === "HOURLY_TRAFFIC" && (
        <div className="mt-6 bg-white rounded shadow p-4">
          <TrafficGraph
            logs={chartLogs}
            fromDate={new Date(fromDate)}
            toDate={new Date(toDate)}
          />
        </div>
      )}

      {/* VEHICLE HISTORY */}
      {mode === "VEHICLE_HISTORY" && (
        <div className="mt-6 bg-white rounded shadow p-6">
          <h2 className="text-xl font-semibold text-center mb-4">
            Vehicle History Lookup
          </h2>
          <div className="flex justify-center gap-2 mb-4">
            <input
              className="border rounded px-3 py-1 uppercase text-center"
              placeholder="Enter Plate Number"
              value={historyPlate}
              onChange={(e) => setHistoryPlate(e.target.value)}
            />
            <button
              onClick={fetchHistory}
              disabled={historyLoading || !historyPlate}
              className="bg-blue-600 text-white px-4 py-1 rounded disabled:bg-gray-400"
            >
              {historyLoading ? "Fetching..." : "Lookup"}
            </button>
          </div>

          {historyError && (
            <p className="text-red-600 text-center">{historyError}</p>
          )}

          {historyLogs.length > 0 && (
            <div className="overflow-x-auto mt-4">
              <table className="min-w-full text-center border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border px-2 py-1">Action</th>
                    <th className="border px-2 py-1">Status</th>
                    <th className="border px-2 py-1">Owner</th>
                    <th className="border px-2 py-1">Type</th>
                    <th className="border px-2 py-1">Color</th>
                    <th className="border px-2 py-1">Details</th>
                    <th className="border px-2 py-1">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLogs.map((l) => (
                    <tr key={l.id}>
                      <td className="border px-2 py-1">{l.action || "—"}</td>
                      <td className="border px-2 py-1">{l.status || "—"}</td>
                      <td className="border px-2 py-1">{l.ownerName || "—"}</td>
                      <td className="border px-2 py-1">{l.vehicleType || "—"}</td>
                      <td className="border px-2 py-1">{l.color || "—"}</td>
                      <td className="border px-2 py-1">{l.details || "—"}</td>
                      <td className="border px-2 py-1">
                        {l.time?.toLocaleString() || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
