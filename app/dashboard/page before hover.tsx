"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/auth";
import SummaryCards from "@/components/dashboard/SummaryCards";
import TrafficGraph from "@/components/TrafficGraph";
import { VehicleLog } from "@/types";
import Image from "next/image";

type DashboardMode = "NONE" | "ENTRY" | "EXIT" | "INSIDE" | "HOURLY_TRAFFIC";

export default function DashboardPage() {
  const [logs, setLogs] = useState<VehicleLog[]>([]);
  const [insideCount, setInsideCount] = useState(0);
  const [selectedList, setSelectedList] = useState<VehicleLog[]>([]);
  const [mode, setMode] = useState<DashboardMode>("NONE");
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState("");

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
          } as VehicleLog;
        })
        .filter((log) => log.timeIn || log.timeOut)
        .sort((a, b) => (getLogTime(a)?.getTime() ?? 0) - (getLogTime(b)?.getTime() ?? 0));

      setLogs(allLogs);

      const lastLogByPlate: Record<string, VehicleLog> = {};
      allLogs.forEach((log) => (lastLogByPlate[log.plateNumber] = log));
      setInsideCount(Object.values(lastLogByPlate).filter((log) => log.status === "IN").length);
    });

    return () => unsub();
  }, []);

  /* ---------------- Filter logic ---------------- */
  useEffect(() => {
    if (mode === "ENTRY") {
      setSelectedList(
        logs.filter(
          (log) =>
            log.timeIn &&
            log.timeIn.toISOString().slice(0, 10) >= fromDate &&
            log.timeIn.toISOString().slice(0, 10) <= toDate
        )
      );
    } else if (mode === "EXIT") {
      setSelectedList(
        logs.filter(
          (log) =>
            log.timeOut &&
            log.timeOut.toISOString().slice(0, 10) >= fromDate &&
            log.timeOut.toISOString().slice(0, 10) <= toDate
        )
      );
    } else if (mode === "INSIDE") {
      const lastLogByPlate: Record<string, VehicleLog> = {};
      logs.forEach((log) => (lastLogByPlate[log.plateNumber] = log));
      setSelectedList(Object.values(lastLogByPlate).filter((log) => log.status === "IN"));
    }
  }, [mode, logs, fromDate, toDate]);

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
  ];

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6">Digital Logbook Dashboard</h1>

      {/* ---------------- Summary Cards ---------------- */}
      <SummaryCards logs={logs} insideCount={insideCount} onSelect={() => {}} />

      {/* ---------------- Action Grid ---------------- */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardBlocks.map((block) => (
          <button
            key={block.label}
            onClick={() => { setMode(block.mode); setSearchQuery(""); }}
            className={`rounded-xl border p-6 flex flex-col items-center justify-center transition shadow-sm hover:shadow-md ${
              mode === block.mode ? "border-blue-500 bg-blue-50" : "bg-white"
            }`}
          >
            {/* Larger image size */}
            <div className="relative h-34 w-34 mb-3">
              <Image src={block.image} alt={block.label} fill className="object-contain" />
            </div>
            <span className="font-semibold text-gray-700 text-center">{block.label}</span>
          </button>
        ))}
      </div>

      {/* ---------------- Content Panel ---------------- */}
      <div className="mt-10">
        {mode !== "NONE" && (
          <>
            {/* Filters (Always visible) */}
            <div className="flex flex-wrap gap-2 mb-3">
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
            </div>

            {/* Search */}
            {mode !== "HOURLY_TRAFFIC" && (
              <input
                type="text"
                placeholder="Search by plate, owner, type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border rounded px-3 py-1 mb-3 w-full md:w-1/3"
              />
            )}
          </>
        )}

        {/* Tables */}
        {(mode === "ENTRY" || mode === "EXIT" || mode === "INSIDE") && (
          <div className="overflow-x-auto bg-white rounded shadow">
            <table className="min-w-full">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border px-4 py-2">Plate</th>
                  <th className="border px-4 py-2">Owner</th>
                  <th className="border px-4 py-2">Type</th>
                  <th className="border px-4 py-2">Color</th>
                  <th className="border px-4 py-2">Details</th>
                  <th className="border px-4 py-2">Date & Time</th>
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
                      {mode === "ENTRY" ? v.timeIn?.toLocaleString() : mode === "EXIT" ? v.timeOut?.toLocaleString() : v.timeIn?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Hourly Traffic */}
        {mode === "HOURLY_TRAFFIC" && (
          <div className="bg-white rounded shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Hourly Traffic</h2>
            <TrafficGraph logs={logs} fromDate={new Date(fromDate)} toDate={new Date(toDate)} />
          </div>
        )}
      </div>
    </div>
  );
}
