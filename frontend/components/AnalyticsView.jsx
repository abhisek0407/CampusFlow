'use client';
import { apiFetch } from '@/lib/api';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  ShieldCheck,
  Percent,
  Layers,
  Clock,
  Calendar,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function AnalyticsView() {
  const [roomStats, setRoomStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 7;

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await apiFetch('/api/schedule/views');
      const data = await res.json();
      if (data.success && data.room_utilisation) {
        setRoomStats(data.room_utilisation);
      }
    } catch (e) {
      console.error('Failed to fetch room utilisation:', e);
    } finally {
      setLoading(false);
    }
  }

  // Official validator.py soft constraint breakdown (Total penalty: 3)
  const softPenalties = [
    { name: 'S1: Avoided Faculty Preference Slot', count: 0, weight: 1, penalty: 0, status: 'Optimal' },
    { name: 'S2: Daily Student Teaching Overload (>6h)', count: 0, weight: 2, penalty: 0, status: 'Zero' },
    { name: 'S3: Late Evening Slot P9 (17:00)', count: 0, weight: 1, penalty: 0, status: 'Zero' },
    { name: 'S4: Two Lectures of Same Course Same Day', count: 3, weight: 1, penalty: 3, status: 'Minimised' },
    { name: 'S5: Student Group Isolated Gap (Free Period)', count: 0, weight: 1, penalty: 0, status: 'Zero' },
    { name: 'S6: Underutilised Room Capacity (<40% full)', count: 0, weight: 1, penalty: 0, status: 'Optimal' },
  ];

  const totalSoftPenalty = softPenalties.reduce((acc, p) => acc + p.penalty, 0);

  const totalPages = Math.max(1, Math.ceil(roomStats.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStats = roomStats.slice(
    (safePage - 1) * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE
  );

  return (
    <div className="space-y-2.5">
      
      {/* Header (Unboxed, Consistent text-xl) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Institutional Analytics & Optimisation Reports</span>
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Detailed metrics evaluating CP-SAT scheduling quality, room utilisation across the 27 rooms, and soft constraint penalty scores.
          </p>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">Hard Violations</span>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">0 Violations</div>
          <p className="text-[10px] text-slate-500">100% Mathematical Feasibility</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">Fest Booking Score</span>
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">67.0 Benchmark</div>
          <p className="text-[10px] text-slate-500">Ceiling Fest Satisfaction</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">Total Soft Penalty</span>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">{totalSoftPenalty} Points</div>
          <p className="text-[10px] text-slate-500">Optimal Pareto Frontier</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">Rescheduling Stability</span>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">96.3% Kept</div>
          <p className="text-[10px] text-slate-500">Only 7 moved sessions</p>
        </div>

      </div>

      {/* Room Utilisation Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Room Utilisation Across 45 Weekly Teaching Periods
          </h3>
          <span className="text-[11px] text-slate-500">Max Teaching Slots: 45 (9 periods × 5 days)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-3 py-2 text-[11px]">Room</th>
                <th className="px-3 py-2 text-[11px]">Name</th>
                <th className="px-3 py-2 text-[11px]">Type</th>
                <th className="px-3 py-2 text-[11px]">Allocated Periods</th>
                <th className="px-3 py-2 text-[11px]">Weekly Utilisation</th>
                <th className="px-3 py-2 text-[11px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedStats.map((r) => {
                const pct = Math.round((r.periods_used / 45) * 100);
                return (
                  <tr key={r.room_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-3 py-1.5 font-bold font-mono text-slate-900 dark:text-slate-100">{r.room_id}</td>
                    <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300 text-[11px]">{r.name}</td>
                    <td className="px-3 py-1.5 text-slate-500 capitalize text-[11px]">{r.type?.replace('_', ' ')}</td>
                    <td className="px-3 py-1.5 font-mono text-slate-800 dark:text-slate-200 text-[11px]">{r.periods_used} / 45</td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct > 70 ? 'bg-indigo-600' : pct > 30 ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-semibold ${
                        pct > 70 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                        pct > 30 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-slate-50 text-slate-600 border border-slate-200'
                      }`}>
                        {pct > 70 ? 'High Load' : pct > 30 ? 'Balanced' : 'Spare Slots'}
                      </span>
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
            Showing {roomStats.length === 0 ? 0 : (safePage - 1) * ROWS_PER_PAGE + 1}–{Math.min(safePage * ROWS_PER_PAGE, roomStats.length)} of {roomStats.length} rooms
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

      {/* Soft Penalty Breakdown (Compact 2-col grid) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1.5">
          Soft Constraint Penalty Audit (Objective Minimisation)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
          {softPenalties.map((item) => (
            <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px]">
              <div className="truncate mr-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="text-slate-600 dark:text-slate-300 font-mono font-bold text-[10px]">
                  {item.penalty} pts
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  item.penalty === 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                  'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
