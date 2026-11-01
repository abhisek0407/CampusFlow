'use client';
import { apiFetch } from '@/lib/api';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle } from 'lucide-react';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const PERIODS = [
  { id: 1, time: '08:00 - 09:00', label: 'P1' },
  { id: 2, time: '09:00 - 10:00', label: 'P2' },
  { id: 3, time: '10:00 - 11:00', label: 'P3' },
  { id: 4, time: '11:00 - 12:00', label: 'P4' },
  { id: 5, time: '12:00 - 13:00', label: 'P5' },
  { id: 6, time: '14:00 - 15:00', label: 'P6' },
  { id: 7, time: '15:00 - 16:00', label: 'P7' },
  { id: 8, time: '16:00 - 17:00', label: 'P8' },
  { id: 9, time: '17:00 - 18:00', label: 'P9' },
];

const LEAVE_STYLE = {
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  pending: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  rejected: 'bg-slate-100 text-slate-500 border-slate-300 line-through dark:bg-slate-800 dark:border-slate-700',
  draft: 'bg-indigo-50 text-indigo-700 border-indigo-300 border-dashed dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
};

const addDaysIso = (s, n) => {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export default function FacultyMyTimetableView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anchor, setAnchor] = useState(''); // '' = current week
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/faculty/my-timetable${anchor ? `?date=${anchor}` : ''}`);
      const json = await res.json();
      if (!res.ok || !json.success) setError(json.error || 'Could not load timetable');
      else setData(json);
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [anchor]);

  useEffect(() => { load(); }, [load]);

  const classes = data?.classes || [];
  const leaves = (data?.leaves || []).filter((l) => l.status !== 'rejected');
  const allLeaves = data?.leaves || [];

  const classAt = (day, p) => classes.find((c) => c.day === day && p >= c.start_period && p <= c.end_period);
  const leaveAt = (day, p) => allLeaves.find((l) => l.day === day && l.periods.includes(p));

  // classes that collide with a non-rejected leave
  const conflicts = classes.filter((c) =>
    leaves.some((l) => l.day === c.day && l.periods.some((p) => p >= c.start_period && p <= c.end_period))
  ).length;

  const shiftWeek = (n) => {
    const base = anchor || data?.week?.from;
    if (base) setAnchor(addDaysIso(base, n * 7));
  };

  return (
    <div className="space-y-6">
      {/* Header (Unboxed, Consistent text-2xl) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>My Teaching Schedule — {data?.faculty?.name || '…'} ({data?.faculty?.id || '…'})</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Same data as My Calendar. Week of {data?.week?.from || '…'} to {data?.week?.to || '…'}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => shiftWeek(-1)} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700" title="Previous week">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setAnchor('')} className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            This week
          </button>
          <button onClick={() => shiftWeek(1)} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700" title="Next week">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={load} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-semibold">
            {classes.length} Weekly Sessions
          </span>
          {allLeaves.length > 0 && (
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-semibold">
              {allLeaves.length} Unavailable block{allLeaves.length > 1 ? 's' : ''}
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${conflicts ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'}`}>
            {conflicts ? `${conflicts} class/leave clash` : '0 Overlaps'}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                <th className="p-3 text-left w-24">Period</th>
                {DAYS.map((day, i) => (
                  <th key={day} className="p-3 text-center border-l border-slate-200 dark:border-slate-800 min-w-[140px]">
                    {day}
                    <div className="text-[10px] font-normal text-slate-400">{data?.week?.dates?.[i]?.slice(5) || ''}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(data?.periods || PERIODS).map((period) => (
                <tr key={period.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="font-mono">{period.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{period.time}</div>
                  </td>
                  {DAYS.map((day) => {
                    const cls = classAt(day, period.id);
                    const leave = leaveAt(day, period.id);
                    return (
                      <td key={day} className="p-2 border-l border-slate-100 dark:border-slate-800 align-top space-y-1">
                        {cls && (
                          <div
                            onClick={() => setSelected({ type: 'class', ...cls })}
                            className="p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 shadow-sm cursor-pointer hover:shadow-md transition"
                          >
                            <div className="font-bold text-blue-900 dark:text-blue-200 truncate">
                              {cls.course_id} ({cls.course_title})
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{cls.session_id}</div>
                            <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-blue-100 dark:border-blue-800/60">
                              <span className="font-bold font-mono text-indigo-700 dark:text-indigo-300">{cls.room_id}</span>
                              <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold">
                                Accessible
                              </span>
                            </div>
                          </div>
                        )}
                        {leave && (
                          <div
                            onClick={() => setSelected({ type: 'leave', ...leave })}
                            className={`p-2 rounded-lg border text-[11px] font-semibold cursor-pointer ${LEAVE_STYLE[leave.status] || LEAVE_STYLE.pending}`}
                          >
                            {leave.title}
                            <div className="text-[9px] font-normal opacity-80 capitalize">
                              {leave.status}{leave.recurring ? ' · weekly' : ''}
                            </div>
                          </div>
                        )}
                        {!cls && !leave && (
                          <div className="h-14 flex items-center justify-center text-slate-300 dark:text-slate-700 text-[11px] italic">—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {selected.type === 'class' ? selected.session_id : selected.request_id}
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                {selected.type === 'class' ? `${data?.faculty?.id} Class` : 'Unavailable'}
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              {selected.type === 'class' ? (
                <>
                  <p><strong>Course:</strong> {selected.course_id} ({selected.course_title})</p>
                  <p><strong>Type:</strong> {selected.kind}</p>
                  <p><strong>Room:</strong> {selected.room_id}</p>
                  <p><strong>Day & Slot:</strong> {selected.day} P{selected.start_period}{selected.end_period > selected.start_period ? `–P${selected.end_period}` : ''}</p>
                  <p><strong>Cohorts:</strong> {selected.groups?.join(', ') || 'Undergraduate'}</p>
                </>
              ) : (
                <>
                  <p><strong>Date:</strong> {selected.date} ({selected.day})</p>
                  <p><strong>Periods:</strong> {selected.periods.map((p) => `P${p}`).join(', ')}</p>
                  <p><strong>Status:</strong> {selected.status}{selected.recurring ? ' (weekly recurring)' : ''}</p>
                  <p><strong>Reason:</strong> {selected.reason || '—'}</p>
                </>
              )}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
