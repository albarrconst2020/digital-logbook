"use client";

import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { VehicleLog } from "@/types";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BarChartProps {
  logs: VehicleLog[];
}

const BarChartDuration: React.FC<BarChartProps> = ({ logs }) => {
  const now = new Date();

  /* ---------------- get LAST log per plate ---------------- */
  const lastLogByPlate: Record<string, VehicleLog> = {};
  logs.forEach((log) => {
    lastLogByPlate[log.plateNumber] = log;
  });

  /* ---------------- only vehicles currently INSIDE ---------------- */
  const insideVehicles = Object.values(lastLogByPlate).filter(
    (log) => log.status === "IN" && log.timeIn
  );

  /* ---------------- duration buckets ---------------- */
  const buckets: Record<string, number> = {
    "<1h": 0,
    "1–3h": 0,
    "3–6h": 0,
    "6–9h": 0,
    "9–12h": 0,
    "12–15h": 0,
    "15–20h": 0,
    "20–24h": 0,
    "24–48h": 0,
    "48–72h": 0,
    "72–96h": 0,
    "96–120h": 0,
    "120–144h": 0,
    ">168h": 0,
  };

  /* ---------------- calculate durations ---------------- */
  insideVehicles.forEach((v) => {
    const durationHours =
      (now.getTime() - v.timeIn!.getTime()) / 1000 / 3600;

    if (durationHours < 1) buckets["<1h"]++;
    else if (durationHours < 3) buckets["1–3h"]++;
    else if (durationHours < 6) buckets["3–6h"]++;
    else if (durationHours < 9) buckets["6–9h"]++;
    else if (durationHours < 12) buckets["9–12h"]++;
    else if (durationHours < 15) buckets["12–15h"]++;
    else if (durationHours < 20) buckets["15–20h"]++;
    else if (durationHours < 24) buckets["20–24h"]++;
    else if (durationHours < 48) buckets["24–48h"]++;
    else if (durationHours < 72) buckets["48–72h"]++;
    else if (durationHours < 96) buckets["72–96h"]++;
    else if (durationHours < 120) buckets["96–120h"]++;
    else if (durationHours < 144) buckets["120–144h"]++;
    else buckets[">168h"]++;
  });

  /* ---------------- chart data ---------------- */
  const data = {
    labels: Object.keys(buckets),
    datasets: [
      {
        label: "Vehicles Inside Duration",
        data: Object.values(buckets),
        backgroundColor: "#60a5fa",
      },
    ],
  };

  /* ---------------- chart options ---------------- */
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top" as const },
      title: {
        display: true,
        text: "Vehicles Currently Inside by Duration",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 20,          // ✅ FIXED Y-AXIS MAX
        ticks: {
          stepSize: 2,    // 0, 2, 4, ... 20
        },
      },
      x: {
        title: { display: true, text: "Duration Inside (hours)" },
      },
    },
  };

  return (
    <div
      style={{ width: "100%", height: 500 }}
      className="bg-white rounded shadow p-4 mt-6"
    >
      <Bar data={data} options={options} />
    </div>
  );
};

export default BarChartDuration;
