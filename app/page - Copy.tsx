"use client";

import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebaseConfig";

// Helper to format Firestore Timestamp
function formatTimestamp(ts: Timestamp | null | undefined) {
  if (!ts) return "-";
  return ts.toDate().toLocaleString();
}

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [records, setRecords] = useState<any[]>([]);

  // Form state
  const [business, setBusiness] = useState("Parking");
  const [type, setType] = useState("Entry");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");

  // 🔴 REAL-TIME LISTENER
  useEffect(() => {
    const q = query(
      collection(db, "records"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const liveRecords = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: formatTimestamp(data.createdAt),
          };
        });

        setRecords(liveRecords);
      },
      (error) => {
        console.error("Realtime error:", error);
      }
    );

    // Cleanup listener
    return () => unsubscribe();
  }, []);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await addDoc(collection(db, "records"), {
        business,
        type,
        subject,
        notes,
        createdAt: serverTimestamp(),
      });

      // Reset form
      setShowForm(false);
      setBusiness("Parking");
      setType("Entry");
      setSubject("");
      setNotes("");
    } catch (error) {
      console.error("Error adding record:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Digital Logbook
        </h1>
        <span className="px-4 py-2 bg-blue-500 text-white rounded">
          Role: Operator
        </span>
      </header>

      {/* Add Record Button */}
      <div className="mb-8">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded"
        >
          ➕ Add Record
        </button>
      </div>

      {/* Add Record Form */}
      {showForm && (
        <div className="bg-white shadow rounded p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">New Record</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-medium mb-1">Business</label>
              <select
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option>Parking</option>
                <option>Carwash</option>
                <option>Servicing</option>
                <option>Laundry</option>
                <option>Office</option>
                <option>Clinic</option>
                <option>Warehouse</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-1">Record Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option>Entry</option>
                <option>Exit</option>
                <option>Check-in</option>
                <option>Check-out</option>
                <option>Service</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            >
              Save Record
            </button>
          </form>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white shadow rounded p-4">
        <h2 className="text-xl font-semibold mb-4">Records</h2>

        {records.length === 0 ? (
          <div className="text-gray-500">
            No records yet. Records will appear here.
          </div>
        ) : (
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border px-4 py-2 text-left">Business</th>
                <th className="border px-4 py-2 text-left">Type</th>
                <th className="border px-4 py-2 text-left">Subject</th>
                <th className="border px-4 py-2 text-left">Notes</th>
                <th className="border px-4 py-2 text-left">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="even:bg-gray-100">
                  <td className="border px-4 py-2">{r.business}</td>
                  <td className="border px-4 py-2">{r.type}</td>
                  <td className="border px-4 py-2">{r.subject}</td>
                  <td className="border px-4 py-2">{r.notes}</td>
                  <td className="border px-4 py-2">{r.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
