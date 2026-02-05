// components/dashboard/PieChartRegistered.tsx
"use client";

import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { VehicleLog } from "@/types";

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
  logs: VehicleLog[]; // all logs passed from dashboard
}

const PieChartRegistered: React.FC<PieChartProps> = ({ logs }) => {
  // ✅ Only consider the latest log per vehicle
  const lastLogByPlate: Record<string, VehicleLog> = {};
  logs.forEach((log) => (lastLogByPlate[log.plateNumber] = log));

  const insideVehicles = Object.values(lastLogByPlate).filter(
    (v) => v.status === "IN"
  );

  const registeredCount = insideVehicles.filter((v) => v.registered).length;
  const unregisteredCount = insideVehicles.length - registeredCount;

  const data = {
    labels: ["Registered", "Unregistered"],
    datasets: [
      {
        data: [registeredCount, unregisteredCount],
        backgroundColor: ["#4ade80", "#f87171"], // green / red
        hoverOffset: 10,
      },
    ],
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-center font-semibold mb-4">Inside Vehicles Status</h2>
      <Pie data={data} />
    </div>
  );
};

export default PieChartRegistered;
