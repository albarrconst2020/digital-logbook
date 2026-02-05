"use client";

import { useEffect, useState } from "react";
import { processDigitalLogbook } from "@/lib/processDigitalLogbook";

export default function TestLogbookPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [counts, setCounts] = useState({ entriesToday: 0, exitsToday: 0, vehiclesInside: 0 });

  useEffect(() => {
    async function fetchData() {
      try {
        const { enrichedLogs, dashboardCounts } = await processDigitalLogbook();
        console.log("Enriched Logs:", enrichedLogs);
        console.log("Dashboard Counts:", dashboardCounts);

        setLogs(enrichedLogs);
        setCounts(dashboardCounts);
      } catch (error) {
        console.error("Error fetching digital logbook:", error);
      }
    }

    fetchData();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Digital Logbook Test Page</h1>

      <h2>Dashboard Counts</h2>
      <p>Entries Today: {counts.entriesToday}</p>
      <p>Exits Today: {counts.exitsToday}</p>
      <p>Vehicles Inside: {counts.vehiclesInside}</p>

      <h2>Sample Enriched Logs (latest 5)</h2>
      <pre>{JSON.stringify(logs.slice(0, 5), null, 2)}</pre>
    </div>
  );
}
