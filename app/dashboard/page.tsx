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
  const [selectedList, setSelectedList] = useState<VehicleLog[]>([]);
  const [mode, setMode] = useState<DashboardMode>("NONE");
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState("");
  const [historyPlate, setHistoryPlate] = useState("");
  const [historyLogs, setHistoryLogs] = useState<
    {
      id: string;
      action?: string;
      status?: string;
      ownerName?: string;
      vehicleType?: string;
      color?: string;
      details?: string;
      timeIn?: { toDate: () => Date };
      timeOut?: { toDate: () => Date };
    }[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const getLogTime = (log: VehicleLog) => log.timeIn ?? log.timeOut ?? null;

  /* ---------------- Load logs ---------------- */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "vehicleLogs"), (snap) => {
      const allLogs: VehicleLog[] = snap.docs
        .map((doc) => {
          const data = doc.data();
          return {
            plateNumber: data.plateNumber,
            status: data.status,
            ownerName: data.ownerName,
            vehicleType: data.vehicleType,
            color: data.color,
            details: data.details,
            timeIn: data.timeIn?.toDate(),
            timeOut: data.timeOut?.toDate(),
            registered: data.registered ?? !!data.ownerName,
          } as VehicleLog;
        })
        .filter((log) => log.timeIn || log.timeOut)
        .sort((a, b) => (getLogTime(a)?.getTime() ?? 0) - (getLogTime(b)?.getTime() ?? 0));

      setLogs(allLogs);

      const lastLogByPlate: Record<string, VehicleLog> = {};
      allLogs.forEach((log) => (lastLogByPlate[log.plateNumber] = log));
      setInsideCount(
        Object.values(lastLogByPlate).filter((log) => log.status === "IN").length
      );
    });

    return () => unsub();
  }, []);

  /* ---------------- Dashboard blocks ---------------- */
  const dashboardBlocks = [
    { label: "Entry Vehicles", mode: "ENTRY" as DashboardMode, image: "/images/entry.png" },
    { label: "Exit Vehicles", mode: "EXIT" as DashboardMode, image: "/images/exit.png" },
    { label: "Vehicles Inside", mode: "INSIDE" as DashboardMode, image: "/images/inside1.png" },
    { label: "Hourly Traffic", mode: "HOURLY_TRAFFIC" as DashboardMode, image: "/images/hourly1.png" },
    { label: "Registered vs Unregistered", mode: "PIE_REGISTERED" as DashboardMode, image: "/images/pie1.png" },
    { label: "Inside Duration", mode: "BAR_DURATION" as DashboardMode, image: "/images/bar1.png" },
    { label: "Vehicle List", mode: "VEHICLE_LIST" as DashboardMode, image: "/images/list1.png" },
    { label: "Vehicle History", mode: "VEHICLE_HISTORY" as DashboardMode, image: "/images/history1.png" },
  ];

  const chartLogs = logs.filter(
    (log) =>
      (!log.timeIn || log.timeIn.toISOString().slice(0, 10) >= fromDate) &&
      (!log.timeOut || log.timeOut.toISOString().slice(0, 10) <= toDate)
  );

  const handleLogout = async () => {
    await signOut(auth);
    location.reload();
  };

  /* ---------------- Filter logic ---------------- */
  const filteredList = (() => {
    let list = selectedList;
    if (mode === "ENTRY") {
      list = logs.filter(
        (log) =>
          log.timeIn &&
          log.timeIn.toISOString().slice(0, 10) >= fromDate &&
          log.timeIn.toISOString().slice(0, 10) <= toDate
      );
    } else if (mode === "EXIT") {
      list = logs.filter(
        (log) =>
          log.timeOut &&
          log.timeOut.toISOString().slice(0, 10) >= fromDate &&
          log.timeOut.toISOString().slice(0, 10) <= toDate
      );
    } else if (mode === "INSIDE") {
      const lastLogByPlate: Record<string, VehicleLog> = {};
      logs.forEach((log) => (lastLogByPlate[log.plateNumber] = log));
      list = Object.values(lastLogByPlate).filter((log) => log.status === "IN" && log.timeIn);
    } else if (mode === "VEHICLE_LIST") {
      list = logs;
    }
    return list.filter((v) => {
      const q = searchQuery.toLowerCase();
      return (
        v.plateNumber.toLowerCase().includes(q) ||
        (v.ownerName?.toLowerCase().includes(q) ?? false) ||
        (v.vehicleType?.toLowerCase().includes(q) ?? false)
      );
    });
  })();

  /* ---------------- Vehicle History fetch ---------------- */
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
        const data = snap.docs.map(doc => {
          const d = doc.data() as {
            action?: string;
            status?: string;
            ownerName?: string;
            vehicleType?: string;
            color?: string;
            details?: string;
            timeIn?: { toDate: () => Date };
            timeOut?: { toDate: () => Date };
          };
          return { id: doc.id, ...d };
        });
        data.sort((a, b) => {
          const ta =
            a.timeOut?.toDate()?.getTime() ??
            a.timeIn?.toDate()?.getTime() ??
            0;

          const tb =
            b.timeOut?.toDate()?.getTime() ??
            b.timeIn?.toDate()?.getTime() ??
            0;

          return tb - ta;
        });

        setHistoryLogs(data);
      }
    } catch (err) {
      console.error(err);
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
          <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left">
            ZCMC Vehicle E-Logbook
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.open("/dashboard/vehicle-registration", "_blank")}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition w-full sm:w-auto"
          >
            Register Vehicle
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition w-full sm:w-auto"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards logs={logs} insideCount={insideCount} onSelect={() => {}} />

      {/* Dashboard blocks (2x4 grid) */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardBlocks.map((block) => (
          <button
            key={block.label}
            onClick={() => {
              if (block.mode === "VEHICLE_LIST") {
                window.open("/dashboard/vehicles", "_blank");
              } else {
                setMode(block.mode);
                setSearchQuery("");
                if (block.mode === "VEHICLE_HISTORY") {
                  setHistoryLogs([]);
                  setHistoryPlate("");
                  setHistoryError("");
                }
              }
            }}
            className={`rounded-xl border p-4 flex flex-col items-center justify-center
              transition-all duration-300 ease-out transform hover:scale-105
              shadow-sm hover:shadow-xl cursor-pointer
              ${mode === block.mode ? "border-blue-500 bg-blue-50" : "bg-white"}`}
          >
            <div className="relative h-28 w-28 mb-2">
              <Image src={block.image} alt={block.label} fill className="object-contain" />
            </div>
            <span className="font-semibold text-gray-700 text-center text-sm sm:text-base">
              {block.label}
            </span>
          </button>
        ))}
      </div>

      {/* Filters / Tables / Vehicle History */}
      <div className="mt-6">
        {/* ENTRY / EXIT / INSIDE / VEHICLE LIST */}
        {mode !== "VEHICLE_HISTORY" && (mode !== "NONE" && mode !== "HOURLY_TRAFFIC" && mode !== "PIE_REGISTERED" && mode !== "BAR_DURATION") && (
          <div className="overflow-x-auto bg-white rounded shadow">
            <div className="flex gap-2 p-4">
              {(mode === "ENTRY" || mode === "EXIT" || mode === "INSIDE" || mode === "VEHICLE_LIST") && (
                <input
                  type="text"
                  placeholder="Search plate, owner, type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border rounded px-3 py-1 w-full sm:w-64"
                />
              )}
            </div>
            <table className="min-w-full">
              <thead className="bg-green-400 text-white">
                <tr>
                  <th className="border px-4 py-2">Plate</th>
                  <th className="border px-4 py-2">Owner</th>
                  <th className="border px-4 py-2">Type</th>
                  <th className="border px-4 py-2">Color</th>
                  <th className="border px-4 py-2">Details</th>
                  <th className="border px-4 py-2">{mode === "INSIDE" ? "Status" : "Date & Time"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((v) => (
                  <tr key={`${v.plateNumber}-${getLogTime(v)?.getTime()}`} className="text-center">
                    <td className="border px-4 py-2">{v.plateNumber}</td>
                    <td className="border px-4 py-2">{v.ownerName || "—"}</td>
                    <td className="border px-4 py-2">{v.vehicleType || "—"}</td>
                    <td className="border px-4 py-2">{v.color || "—"}</td>
                    <td className="border px-4 py-2">{v.details || "—"}</td>
                    <td className="border px-4 py-2">
                      {mode === "INSIDE"
                        ? v.registered ? <span className="text-green-600 font-semibold">Registered</span> : <span className="text-red-600 font-semibold">Unregistered</span>
                        : mode === "ENTRY" ? v.timeIn?.toLocaleString() : v.timeOut?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VEHICLE HISTORY */}
        {mode === "VEHICLE_HISTORY" && (
          <div className="bg-white rounded shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-center">Vehicle History Lookup</h2>
            <div className="flex gap-2 mb-4 justify-center">
              <input
                className="border rounded px-3 py-1 uppercase w-64 text-center"
                placeholder="Enter Plate Number"
                value={historyPlate}
                onChange={(e) => setHistoryPlate(e.target.value)}
              />
              <button
                className={`px-4 py-1 rounded text-white ${historyLoading || !historyPlate ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600"}`}
                onClick={fetchHistory}
                disabled={historyLoading || !historyPlate}
              >
                {historyLoading ? "Fetching..." : "Lookup"}
              </button>
            </div>

            {historyError && <p className="text-red-600 text-center mb-4">{historyError}</p>}

            {historyLogs.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-center border-collapse border border-gray-300">
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
                    {historyLogs.map((log) => (
                      <tr key={log.id} className="border hover:bg-gray-50">
                        <td className="border px-2 py-1">{log.action || "—"}</td>
                        <td className="border px-2 py-1">{log.status || "—"}</td>
                        <td className="border px-2 py-1">{log.ownerName || "—"}</td>
                        <td className="border px-2 py-1">{log.vehicleType || "—"}</td>
                        <td className="border px-2 py-1">{log.color || "—"}</td>
                        <td className="border px-2 py-1">{log.details || "—"}</td>
                        <td className="border px-2 py-1">
                          {log.timeIn ? log.timeIn.toDate().toLocaleString() : log.timeOut?.toDate?.().toLocaleString() || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PIE / BAR / HOURLY */}
        {mode === "PIE_REGISTERED" && (
          <div className="bg-white rounded shadow p-4 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-center">Registered vs Unregistered</h2>
            <PieChartRegistered logs={chartLogs} />
          </div>
        )}

        {mode === "BAR_DURATION" && (
          <div className="bg-white rounded shadow p-4 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-center">Inside Duration</h2>
            <BarChartDuration logs={logs} />
          </div>
        )}

        {mode === "HOURLY_TRAFFIC" && (
          <div className="bg-white rounded shadow p-4 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-center">Hourly Traffic</h2>
            <TrafficGraph logs={chartLogs} fromDate={new Date(fromDate)} toDate={new Date(toDate)} />
          </div>
        )}
      </div>
    </div>
  );
}
