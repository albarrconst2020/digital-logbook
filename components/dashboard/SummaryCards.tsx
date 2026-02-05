// components/dashboard/SummaryCards.tsx
import React from "react";

interface SummaryCardsProps {
  logs: any[];
  insideCount: number;
  onSelect: (type: "ENTRY" | "EXIT" | "INSIDE") => void;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ logs, insideCount, onSelect }) => {
  const today = new Date().toDateString();

  const toDateString = (ts: any) => {
    if (!ts) return null;
    if (ts.toDate) return ts.toDate().toDateString();
    if (ts instanceof Date) return ts.toDateString();
    return null;
  };

  const getLogTime = (log: any) =>
    log.timeIn ?? log.timeOut ?? null;

  const isToday = (log: any) => {
    const ts = getLogTime(log);
    if (!ts) return false;
    return toDateString(ts) === today;
  };

  const entriesToday = logs.filter(
    l => l.status === "IN" && isToday(l)
  ).length;

  const exitsToday = logs.filter(
    l => l.status === "OUT" && isToday(l)
  ).length;

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card title="Entries Today" value={entriesToday} onClick={() => onSelect("ENTRY")} />
      <Card title="Exits Today" value={exitsToday} onClick={() => onSelect("EXIT")} />
      <Card title="Vehicles Inside" value={insideCount} onClick={() => onSelect("INSIDE")} />
    </div>
  );
};

interface CardProps {
  title: string;
  value: number;
  onClick: () => void;
}

const Card: React.FC<CardProps> = ({ title, value, onClick }) => (
  <div
    onClick={onClick}
    className="p-4 bg-white rounded shadow cursor-pointer hover:bg-gray-50"
  >
    <p className="text-sm text-gray-500">{title}</p>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

export default SummaryCards;
