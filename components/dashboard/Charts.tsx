export default function Charts({ logs }: { logs: any[] }) {
  const hourly: Record<number, number> = {};

  logs.forEach((l) => {
    if (!l.timestamp) return;
    const hour = new Date(l.timestamp).getHours();
    hourly[hour] = (hourly[hour] || 0) + 1;
  });

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="font-semibold mb-2">Peak Hours</h2>
      <ul>
        {Object.entries(hourly).map(([h, c]) => (
          <li key={h}>
            {h}:00 — {c} vehicles
          </li>
        ))}
      </ul>
    </div>
  );
}
