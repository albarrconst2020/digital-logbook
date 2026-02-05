"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/auth";
import SummaryCards from "@/components/dashboard/SummaryCards";
import TrafficGraph from "@/components/TrafficGraph";
import PieChartRegistered from "@/components/dashboard/PieChartRegistered";
import BarChartDuration from "@/components/dashboard/BarChartDuration";
import { VehicleLog } from "@/types";
import Image from "next/image";

type DashboardMode =
  | "NONE"
  | "ENTRY"
  | "EXIT"
  | "INSIDE"
  | "HOURLY_TRAFFIC"
  | "PIE_REGISTERED"
  | "BAR_DURATION";

type DurationFilter =
  | "<1h" | "1–3h" | "3–6h" | "6–9h" | "9–12h" | "12–15h" | "15–20h" | "20–24h"
  | "24–48h" | "48–72h" | "72–96h" | "96–120h" | "120–144h" | ">168h"
  | "ALL";

export default function DashboardPage() {
  const [logs, setLogs] = useState<VehicleLog[]>([]);
  const [insideCount, setInsideCount] = useState(0);
  const [selectedList, setSelectedList] = useState<VehicleLog[]>([]);
  const [mode, setMode] = useState<DashboardMode>("NONE");
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState("");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("ALL");

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

  /* ---------------- Filter logic ---------------- */
  useEffect(() => {
    let list: VehicleLog[] = [];

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

      // Duration filter (for INSIDE)
      if (durationFilter !== "ALL") {
        const now = new Date();
        list = list.filter((log) => {
          const hours = (now.getTime() - log.timeIn!.getTime()) / 1000 / 3600;
          switch (durationFilter) {
            case "<1h": return hours < 1;
            case "1–3h": return hours >= 1 && hours < 3;
            case "3–6h": return hours >= 3 && hours < 6;
            case "6–9h": return hours >= 6 && hours < 9;
            case "9–12h": return hours >= 9 && hours < 12;
            case "12–15h": return hours >= 12 && hours < 15;
            case "15–20h": return hours >= 15 && hours < 20;
            case "20–24h": return hours >= 20 && hours < 24;
            case "24–48h": return hours >= 24 && hours < 48;
            case "48–72h": return hours >= 48 && hours < 72;
            case "72–96h": return hours >= 72 && hours < 96;
            case "96–120h": return hours >= 96 && hours < 120;
            case "120–144h": return hours >= 120 && hours < 144;
            case ">168h": return hours > 168;
            default: return true;
          }
        });
      }
    }

    setSelectedList(list);
  }, [mode, logs, fromDate, toDate, durationFilter]);

  /* ---------------- Search filter ---------------- */
  const filteredList = selectedList.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      v.plateNumber.toLowerCase().includes(q) ||
      (v.ownerName?.toLowerCase().includes(q) ?? false) ||
      (v.vehicleType?.toLowerCase().includes(q) ?? false)
    );
  });

  /* ---------------- Dashboard blocks ---------------- */
  const dashboardBlocks = [
    { label: "Entry Vehicles", mode: "ENTRY" as DashboardMode, image: "/images/entry.png" },
    { label: "Exit Vehicles", mode: "EXIT" as DashboardMode, image: "/images/exit.png" },
    { label: "Vehicles Inside", mode: "INSIDE" as DashboardMode, image: "/images/inside1.png" },
    { label: "Hourly Traffic", mode: "HOURLY_TRAFFIC" as DashboardMode, image: "/images/hourly1.png" },
    { label: "Registered vs Unregistered", mode: "PIE_REGISTERED" as DashboardMode, image: "/images/pie1.png" },
    { label: "Inside Duration", mode: "BAR_DURATION" as DashboardMode, image: "/images/bar1.png" },
  ];

  /* ---------------- Apply date filter for charts ---------------- */
  const chartLogs = logs.filter(
    (log) => 
      (!log.timeIn || log.timeIn.toISOString().slice(0, 10) >= fromDate) &&
      (!log.timeOut || log.timeOut.toISOString().slice(0, 10) <= toDate)
  );

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6">Zamboanga City Medical Center Vehicle  E-Logbook Dashboard</h1>

      {/* Summary Cards */}
      <SummaryCards logs={logs} insideCount={insideCount} onSelect={() => {}} />

      {/* Action Grid */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardBlocks.map((block) => (
          <button
            key={block.label}
            onClick={() => { setMode(block.mode); setSearchQuery(""); }}
            className={`rounded-xl border p-6 flex flex-col items-center justify-center
              transition-all duration-300 ease-out
              transform hover:scale-105
              shadow-sm hover:shadow-xl
              cursor-pointer
              ${mode === block.mode ? "border-blue-500 bg-blue-50" : "bg-white"}`}
          >
            <div className="relative h-34 w-34 mb-3">
              <Image src={block.image} alt={block.label} fill className="object-contain" />
            </div>
            <span className="font-semibold text-gray-700 text-center">{block.label}</span>
          </button>
        ))}
      </div>

      {/* Filters Panel */}
      <div className="mt-10 flex flex-wrap gap-3 items-center mb-4">
        {(mode === "ENTRY" || mode === "EXIT" || mode === "HOURLY_TRAFFIC" || mode === "PIE_REGISTERED") && (
          <>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border rounded px-2 py-1"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </>
        )}

        {(mode === "ENTRY" || mode === "EXIT" || mode === "INSIDE") && (
          <input
            type="text"
            placeholder="Search plate, owner, type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border rounded px-3 py-1 w-64"
          />
        )}

        {mode === "INSIDE" && (
          <select
            value={durationFilter}
            onChange={(e) => setDurationFilter(e.target.value as DurationFilter)}
            className="border rounded px-3 py-1"
          >
            <option value="ALL">All</option>
            <option value="<1h">&lt;1h</option>
            <option value="1–3h">1–3h</option>
            <option value="3–6h">3–6h</option>
            <option value="6–9h">6–9h</option>
            <option value="9–12h">9–12h</option>
            <option value="12–15h">12–15h</option>
            <option value="15–20h">15–20h</option>
            <option value="20–24h">20–24h</option>
            <option value="24–48h">24–48h</option>
            <option value="48–72h">48–72h</option>
            <option value="72–96h">72–96h</option>
            <option value="96–120h">96–120h</option>
            <option value="120–144h">120–144h</option>
            <option value=">168h">&gt;168h</option>
          </select>
        )}
      </div>

      {/* Charts */}
      {mode === "PIE_REGISTERED" && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-xl font-semibold mb-4 text-center">Registered vs Unregistered</h2>
          <PieChartRegistered logs={chartLogs} />
        </div>
      )}

      {mode === "BAR_DURATION" && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-xl font-semibold mb-4 text-center">Inside Duration</h2>
          <BarChartDuration logs={logs} />
        </div>
      )}

      {mode === "HOURLY_TRAFFIC" && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-xl font-semibold mb-4 text-center">Hourly Traffic</h2>
          <TrafficGraph logs={chartLogs} fromDate={new Date(fromDate)} toDate={new Date(toDate)} />
        </div>
      )}

      {/* INSIDE / ENTRY / EXIT tables */}
      {(mode === "INSIDE" || mode === "ENTRY" || mode === "EXIT") && (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full">
            <thead className="bg-green-400 text-white">
              <tr>
                <th className="border px-4 py-2">Plate</th>
                <th className="border px-4 py-2">Owner</th>
                <th className="border px-4 py-2">Type</th>
                <th className="border px-4 py-2">Color</th>
                <th className="border px-4 py-2">Details</th>
                <th className="border px-4 py-2">
                  {mode === "INSIDE" ? "Status" : "Date & Time"}
                </th>
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
                    {mode === "INSIDE" ? (
                      <span className={v.registered ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                        {v.registered ? "Registered" : "Unregistered"}
                      </span>
                    ) : mode === "ENTRY" ? (
                      v.timeIn?.toLocaleString()
                    ) : (
                      v.timeOut?.toLocaleString()
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
