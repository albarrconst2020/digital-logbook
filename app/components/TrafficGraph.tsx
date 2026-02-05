"use client";

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { db } from "@/lib/firebaseConfig";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type VehicleLog = {
  plateNumber: string;
  timestamp: Timestamp;
  type: "IN" | "OUT";
};

type TrafficGraphProps = {
  fromDate: string;
  toDate: string;
};

export default function TrafficGraph({ fromDate, toDate }: TrafficGraphProps) {
  const [logs, setLogs] = useState<VehicleLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999); // include the whole toDate

      const q = query(
        collection(db, "vehicleLogs"),
        where("timestamp", ">=", from),
        where("timestamp", "<=", to)
      );

      const snapshot = await getDocs(q);
      const data: VehicleLog[] = snapshot.docs.map((doc) => doc.data() as VehicleLog);
      setLogs(data);
      setLoading(false);
    }

    if (fromDate && toDate) fetchLogs();
  }, [fromDate, toDate]);

  if (loading) return <p>Loading graph...</p>;

  // Aggregate data per day
  const trafficCount: Record<string, { IN: number; OUT: number }> = {};

  logs.forEach((log) => {
    const day = log.timestamp.toDate().toLocaleDateString();
    if (!trafficCount[day]) trafficCount[day] = { IN: 0, OUT: 0 };
    trafficCount[day][log.type]++;
  });

  const labels = Object.keys(trafficCount).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );
  const data = {
    labels,
    datasets: [
      {
        label: "Entries",
        data: labels.map((day) => trafficCount[day].IN),
        borderColor: "green",
        backgroundColor: "rgba(0,128,0,0.2)",
      },
      {
        label: "Exits",
        data: labels.map((day) => trafficCount[day].OUT),
        borderColor: "red",
        backgroundColor: "rgba(255,0,0,0.2)",
      },
    ],
  };

  return <Line data={data} />;
}
