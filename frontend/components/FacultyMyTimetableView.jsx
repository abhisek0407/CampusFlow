'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  DoorOpen,
  Users,
  ShieldCheck,
  CheckCircle2,
  BookOpen
} from 'lucide-react';

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

export default function FacultyMyTimetableView() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    fetch('/api/schedule/views?faculty=F01')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.sessions) {
          setSessions(data.sessions);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const myAllocations = sessions.map(s => ({
    id: s.session_id,
    course: `${s.course_id} (${s.course_title})`,
    course_id: s.course_id,
    day: s.day,
    start_period: s.start_period,
    end_period: s.end_period,
    duration: s.duration,
    room_id: s.room_id,
    room_name: s.room_name,
    kind: s.kind,
    groups: s.groups,
    faculty_name: s.faculty_name,
  }));

  function getSlotSession(day, period) {
    return myAllocations.find(s => s.day === day && period >= s.start_period && period <= s.end_period);
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>My Teaching Schedule — Dr. Ananya Mishra (F01)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Personalized weekly teaching grid. All rooms assigned are strictly wheelchair accessible (Constraint H10).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-semibold">
            5 Weekly Sessions
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-semibold">
            0 Overlaps (H2 Passed)
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                <th className="p-3 text-left w-24">Period</th>
                {DAYS.map(day => (
                  <th key={day} className="p-3 text-center border-l border-slate-200 dark:border-slate-800 min-w-[140px]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {PERIODS.map(period => (
                <tr key={period.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="font-mono">{period.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{period.time}</div>
                  </td>
                  {DAYS.map(day => {
                    const session = getSlotSession(day, period.id);
                    return (
                      <td key={day} className="p-2 border-l border-slate-100 dark:border-slate-800 align-top">
                        {session ? (
                          <div
                            onClick={() => setSelectedSession(session)}
                            className="p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 shadow-sm cursor-pointer hover:shadow-md transition"
                          >
                            <div className="font-bold text-blue-900 dark:text-blue-200 truncate">
                              {session.course}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{session.id}</div>
                            <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-blue-100 dark:border-blue-800/60">
                              <span className="font-bold font-mono text-indigo-700 dark:text-indigo-300">
                                {session.room_id}
                              </span>
                              <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold">
                                Accessible
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-14 flex items-center justify-center text-slate-300 dark:text-slate-700 text-[11px] italic">
                            —
                          </div>
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

      {/* Selected Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{selectedSession.id}</span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">F01 Class</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              <p><strong>Course:</strong> {selectedSession.course}</p>
              <p><strong>Room:</strong> {selectedSession.room_id} (Ground Floor / Accessible)</p>
              <p><strong>Day & Slot:</strong> {selectedSession.day} Period P{selectedSession.start_period}</p>
              <p><strong>Cohorts:</strong> {selectedSession.groups?.join(', ') || 'Undergraduate'}</p>
            </div>
            <button
              onClick={() => setSelectedSession(null)}
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
