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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type VehicleLog = {
  timeIn?: Date;
  timeOut?: Date;
};

interface TrafficGraphProps {
  logs: VehicleLog[];
  fromDate: Date;
  toDate: Date;
}

const TrafficGraph: React.FC<TrafficGraphProps> = ({ logs, fromDate, toDate }) => {
  const toDateEnd = new Date(toDate);
  toDateEnd.setHours(23, 59, 59, 999);

  const entrances = Array(24).fill(0);
  const exits = Array(24).fill(0);

  logs.forEach((log) => {
    if (log.timeIn && log.timeIn >= fromDate && log.timeIn <= toDateEnd) {
      entrances[log.timeIn.getHours()] += 1;
    }
    if (log.timeOut && log.timeOut >= fromDate && log.timeOut <= toDateEnd) {
      exits[log.timeOut.getHours()] += 1;
    }
  });

  const data = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: "Entrances",
        data: entrances,
        backgroundColor: "rgb(30, 90, 180)", // darker blue
      },
      {
        label: "Exits",
        data: exits,
        backgroundColor: "rgb(180, 30, 50)", // darker red
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const, labels: { color: "#222" } },
      title: { display: true, text: "Hourly Traffic", color: "#222" },
      tooltip: { enabled: true },
    },
    scales: {
      y: {
        min: 0,
        max: 50,
        ticks: { stepSize: 5, color: "#222" }, // dark numbers
        grid: { color: "#e4e4e4" }, // dark grid lines
      },
      x: {
        ticks: { color: "#222" }, // dark labels
        grid: { color: "#e4e4e4" }, // dark vertical grid
      },
    },
  };

  return <Bar data={data} options={options} />;
};

export default TrafficGraph;
