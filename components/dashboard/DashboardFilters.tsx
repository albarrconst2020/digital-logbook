export default function DashboardFilters({ onChange }: any) {
  return (
    <div className="flex gap-4">
      <select
        onChange={(e) =>
          onChange((prev: any) => ({ ...prev, status: e.target.value }))
        }
        className="border p-2"
      >
        <option value="ALL">All</option>
        <option value="IN">IN</option>
        <option value="OUT">OUT</option>
      </select>

      <input
        type="date"
        onChange={(e) =>
          onChange((prev: any) => ({ ...prev, date: e.target.value }))
        }
        className="border p-2"
      />
    </div>
  );
}
