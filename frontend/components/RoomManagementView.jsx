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
  Armchair
} from 'lucide-react';

export default function RoomManagementView() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterBuilding, setFilterBuilding] = useState('ALL');

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

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <DoorOpen className="w-5 h-5 text-indigo-600" />
            <span>Room & Infrastructure Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Directory of all 27 campus learning spaces, capacities, specialized labs, and maintenance windows.
          </p>
        </div>
        
        <div className="flex items-center space-x-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            Total Capacity: {rooms.reduce((acc, r) => acc + (r.capacity || 0), 0)} Seats
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {rooms.filter(r => r.accessible).length} Wheelchair Accessible
          </span>
        </div>
      </div>

      {/* Maintenance Alert Callout */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start space-x-3">
        <Wrench className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
            Active Maintenance Window (Constraint H8 Respected)
          </h4>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
            <strong>LH-4</strong> is scheduled for projector repair on <strong>TUE Periods P6–P8 (14:00–17:00)</strong>. The CP-SAT solver strictly avoids allocating sessions to LH-4 during this window.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search room name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-500">Type:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            {roomTypes.map(t => (
              <option key={t} value={t}>{t === 'ALL' ? 'All Room Types' : t.replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-500">Building:</label>
          <select
            value={filterBuilding}
            onChange={(e) => setFilterBuilding(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          >
            {buildings.map(b => (
              <option key={b} value={b}>{b === 'ALL' ? 'All Buildings' : b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Rooms Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Room ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Building</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Capacity</th>
                <th className="px-4 py-3">Exam Cap (50%)</th>
                <th className="px-4 py-3">Accessibility</th>
                <th className="px-4 py-3">Special Features</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((room) => {
                const isUnderMaintenance = room._id === 'LH-4';
                return (
                  <tr key={room._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                      <span>{room._id}</span>
                      {isUnderMaintenance && (
                        <span title="Maintenance scheduled TUE P6-P8" className="p-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">
                          <Wrench className="w-3 h-3" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{room.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{room.building}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full font-semibold capitalize ${
                        room.type?.includes('lab') ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' :
                        room.type === 'auditorium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                        room.type === 'lecture_hall' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {room.type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{room.capacity} seats</td>
                    <td className="px-4 py-3 text-slate-500 font-mono">{Math.floor(room.capacity / 2)} seats</td>
                    <td className="px-4 py-3">
                      {room.accessible ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-[10px]">
                          Ground / Lift
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Standard</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <div className="flex flex-wrap gap-1">
                        {room.features && room.features.length > 0 ? (
                          room.features.map(f => (
                            <span key={f} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300">
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
      </div>

    </div>
  );
}
