'use client';

import React, { useState, useEffect } from 'react';
import {
  DoorOpen,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Building,
  Users,
  Shield,
  Layers,
  Wrench,
  Armchair,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function RoomManagementView() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterBuilding, setFilterBuilding] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 7;

  useEffect(() => {
    fetchRooms();
  }, []);

  async function fetchRooms() {
    try {
      const res = await fetch('/api/dataset/summary');
      const data = await res.json();
      if (data.success && data.rooms) {
        setRooms(data.rooms);
      }
    } catch (e) {
      console.error('Failed to fetch rooms:', e);
    } finally {
      setLoading(false);
    }
  }

  const roomTypes = ['ALL', ...new Set(rooms.map(r => r.type))];
  const buildings = ['ALL', ...new Set(rooms.map(r => r.building))];

  const filtered = rooms.filter(r => {
    const matchSearch = r.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        r._id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'ALL' || r.type === filterType;
    const matchBldg = filterBuilding === 'ALL' || r.building === filterBuilding;
    return matchSearch && matchType && matchBldg;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterBuilding]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRooms = filtered.slice(
    (safePage - 1) * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE
  );

  return (
    <div className="space-y-2.5">
      
      {/* Header (Unboxed, Consistent text-xl) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Room & Infrastructure Management</span>
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Directory of all 27 campus learning spaces, capacities, specialized labs, and maintenance windows.
          </p>
        </div>
        
        <div className="flex items-center space-x-2 text-[11px] font-semibold">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            Total Capacity: {rooms.reduce((acc, r) => acc + (r.capacity || 0), 0)} Seats
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {rooms.filter(r => r.accessible).length} Wheelchair Accessible
          </span>
        </div>
      </div>

      {/* Maintenance Alert Callout (Compact single line) */}
      <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center space-x-2.5">
        <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
        <div className="text-[11px] text-amber-800 dark:text-amber-300">
          <strong className="text-amber-900 dark:text-amber-200">Active Maintenance Window (Rule H8):</strong>{' '}
          <strong>LH-4</strong> scheduled for projector repair on <strong>TUE Periods P6–P8 (14:00–17:00)</strong>. Strictly zero sessions allocated.
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-2.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search room name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-1.5">
          <label className="text-[11px] font-semibold text-slate-500">Type:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-[11px] font-semibold py-1 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            {roomTypes.map(t => (
              <option key={t} value={t}>{t === 'ALL' ? 'All Room Types' : t.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-1.5">
          <label className="text-[11px] font-semibold text-slate-500">Building:</label>
          <select
            value={filterBuilding}
            onChange={(e) => setFilterBuilding(e.target.value)}
            className="text-[11px] font-semibold py-1 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            {buildings.map(b => (
              <option key={b} value={b}>{b === 'ALL' ? 'All Buildings' : b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Rooms Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-3 py-2 text-[11px]">Room ID</th>
                <th className="px-3 py-2 text-[11px]">Name</th>
                <th className="px-3 py-2 text-[11px]">Building</th>
                <th className="px-3 py-2 text-[11px]">Type</th>
                <th className="px-3 py-2 text-[11px]">Capacity</th>
                <th className="px-3 py-2 text-[11px]">Exam Cap (50%)</th>
                <th className="px-3 py-2 text-[11px]">Accessibility</th>
                <th className="px-3 py-2 text-[11px]">Special Features</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedRooms.map((room) => {
                const isUnderMaintenance = room._id === 'LH-4';
                return (
                  <tr key={room._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-3 py-1.5 font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                      <span className="font-mono">{room._id}</span>
                      {isUnderMaintenance && (
                        <span title="Maintenance scheduled TUE P6-P8" className="p-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">
                          <Wrench className="w-3 h-3" />
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200">{room.name}</td>
                    <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400 text-[11px]">{room.building}</td>
                    <td className="px-3 py-1.5">
                      <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] capitalize ${
                        room.type?.includes('lab') ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' :
                        room.type === 'auditorium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                        room.type === 'lecture_hall' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {room.type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 font-semibold text-slate-800 dark:text-slate-200 text-[11px]">{room.capacity} seats</td>
                    <td className="px-3 py-1.5 text-slate-500 font-mono text-[11px]">{Math.floor(room.capacity / 2)} seats</td>
                    <td className="px-3 py-1.5">
                      {room.accessible ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-[10px]">
                          Ground / Lift
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Standard</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-slate-500">
                      <div className="flex flex-wrap gap-1">
                        {room.features && room.features.length > 0 ? (
                          room.features.map(f => (
                            <span key={f} className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9.5px] text-slate-600 dark:text-slate-300">
                              {f.replace('_', ' ')}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[10px]">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Showing {filtered.length === 0 ? 0 : (safePage - 1) * ROWS_PER_PAGE + 1}–{Math.min(safePage * ROWS_PER_PAGE, filtered.length)} of {filtered.length} rooms
          </span>

          {totalPages > 1 && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  className={`min-w-[26px] h-6 px-1.5 rounded-md text-[11px] font-semibold transition ${
                    safePage === num
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
