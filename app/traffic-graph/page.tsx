"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/auth";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Legend,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Legend,
  Tooltip
);

type VehicleLog = {
  timeIn?: any;
  timeOut?: any;
};

interface TrafficGraphProps {
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
}

export default function TrafficGraph({
  fromDate,
  toDate,
}: TrafficGraphProps) {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      // 24-hour buckets
      const hourlyCount: Record<number, { IN: number; OUT: number }> = {};
      for (let i = 0; i < 24; i++) {
        hourlyCount[i] = { IN: 0, OUT: 0 };
      }

      const snapshot = await getDocs(collection(db, "vehicleLogs"));

      snapshot.docs.forEach((doc) => {
        const data = doc.data() as VehicleLog;

        // 🔵 ENTRANCE (timeIn)
        if (data.timeIn) {
          const dateStr = data.timeIn
            .toDate()
            .toISOString()
            .slice(0, 10);

          if (dateStr >= fromDate && dateStr <= toDate) {
            const hour = data.timeIn.toDate().getHours();
            hourlyCount[hour].IN++;
          }
        }

        // 🔴 EXIT (timeOut)
        if (data.timeOut) {
          const dateStr = data.timeOut
            .toDate()
            .toISOString()
            .slice(0, 10);

          if (dateStr >= fromDate && dateStr <= toDate) {
            const hour = data.timeOut.toDate().getHours();
            hourlyCount[hour].OUT++;
          }
        }
      });

      const labels = Array.from({ length: 24 }, (_, i) =>
        `${i.toString().padStart(2, "0")}:00`
      );

      setChartData({
        labels,
        datasets: [
          {
            label: "Entrance",
            data: labels.map((_, i) => hourlyCount[i].IN),
            borderColor: "blue",
            backgroundColor: "blue",
            tension: 0.3,
          },
          {
            label: "Exit",
            data: labels.map((_, i) => hourlyCount[i].OUT),
            borderColor: "red",
            backgroundColor: "red",
            tension: 0.3,
          },
        ],
      });
    };

    fetchData();
  }, [fromDate, toDate]);

  const options = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        min: 0,
        max: 100,
        ticks: {
          stepSize: 5,
          precision: 0,
        },
        title: {
          display: true,
          text: "Number of Vehicles",
        },
      },
      x: {
        title: {
          display: true,
          text: "Hour of Day",
        },
      },
    },
  };

  if (!chartData) {
    return <p className="text-gray-500">Loading hourly traffic…</p>;
  }

  return <Line data={chartData} options={options} />;
}
