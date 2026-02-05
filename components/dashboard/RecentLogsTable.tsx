export default function RecentLogsTable({ logs, filters }: any) {
  const filtered = logs.filter((l: any) => {
    if (filters.status !== "ALL" && l.status !== filters.status) return false;
    if (filters.date) return l.timestamp?.slice(0, 10) === filters.date;
    return true;
  });

  return (
    <table className="w-full border">
      <thead>
        <tr className="bg-gray-100">
          <th>Plate</th>
          <th>Owner</th>
          <th>Type</th>
          <th>Color</th>
          <th>Details</th>
          <th>Status</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((log: any) => (
          <tr key={log.id}>
            <td>{log.plateNumber || "-"}</td>
            <td>{log.ownerName || "-"}</td>
            <td>{log.vehicleType || "-"}</td>
            <td>{log.color || "-"}</td>
            <td>{log.details || "-"}</td>
            <td>{log.status}</td>
            <td>{log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
