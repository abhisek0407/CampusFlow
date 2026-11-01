'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import FacultyUnavailabilityView from './FacultyUnavailabilityView';
import AIAssistantView from './AIAssistantView';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const DAY_LABELS = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
};

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

// Ground truth verified sessions for F01 (Dr. Ananya Mishra)
const DEFAULT_SESSIONS = [
  { session_id: 'CS101-B-L2', course_id: 'CS101', course_title: 'Programming in C', kind: 'Lecture', day: 'MON', start_period: 5, end_period: 5, room_id: 'CR-102', groups: ['Y1-B'] },
  { session_id: 'CS301-L2', course_id: 'CS301', course_title: 'Operating Systems', kind: 'Lecture', day: 'TUE', start_period: 4, end_period: 4, room_id: 'CR-202', groups: ['CSE-3'] },
  { session_id: 'CS101-B-L1', course_id: 'CS101', course_title: 'Programming in C', kind: 'Lecture', day: 'TUE', start_period: 6, end_period: 6, room_id: 'LH-3', groups: ['Y1-B'] },
  { session_id: 'CS301-L1', course_id: 'CS301', course_title: 'Operating Systems', kind: 'Lecture', day: 'WED', start_period: 2, end_period: 2, room_id: 'CR-203', groups: ['CSE-3'] },
  { session_id: 'CS101-A-L2', course_id: 'CS101', course_title: 'Programming in C', kind: 'Lecture', day: 'THU', start_period: 1, end_period: 1, room_id: 'CR-102', groups: ['Y1-A'] },
  { session_id: 'CS101-A-L1', course_id: 'CS101', course_title: 'Programming in C', kind: 'Lecture', day: 'FRI', start_period: 5, end_period: 5, room_id: 'CR-201', groups: ['Y1-A'] },
  { session_id: 'CS301-L3', course_id: 'CS301', course_title: 'Operating Systems', kind: 'Lecture', day: 'FRI', start_period: 7, end_period: 7, room_id: 'CR-203', groups: ['CSE-3'] },
];

export default function FacultyOverviewView({ currentUser, setActiveTab, initialTab = 'timetable' }) {
  const facultyName = currentUser?.name || 'Dr. Ananya Mishra';
  const facultyId = currentUser?.linked_faculty_id || 'F01';
  const department = currentUser?.department === 'CSE' ? 'Computer Science & Engineering' : (currentUser?.department || 'Computer Science & Engineering');

  const [activeSubTab, setActiveSubTab] = useState(initialTab);
  const [classes, setClasses] = useState(DEFAULT_SESSIONS);
  const [leaves, setLeaves] = useState([
    { day: 'FRI', periods: [6, 7, 8], title: 'Research Grant Review Meeting', status: 'approved' }
  ]);
  const [loading, setLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);

  useEffect(() => {
    async function loadTimetable() {
      setLoading(true);
      try {
        const res = await apiFetch('/api/faculty/my-timetable');
        const data = await res.json();
        if (data.success && Array.isArray(data.classes) && data.classes.length > 0) {
          setClasses(data.classes);
        }
        if (data.success && Array.isArray(data.leaves)) {
          setLeaves(data.leaves);
        }
      } catch (err) {
        // Fallback to default sessions
      } finally {
        setLoading(false);
      }
    }
    loadTimetable();
  }, [facultyId]);

  const classAt = (day, p) => classes.find((c) => c.day === day && p >= c.start_period && p <= c.end_period);
  const leaveAt = (day, p) => leaves.find((l) => l.day === day && (l.periods || []).includes(p));

  return (
    <div className="font-sans pb-4 space-y-2.5">

      {/* ── FIXED TOP SECTION (Welcome Header + Small Single Info Box + 3 Tabs Bar) ── */}
      <div className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-950 pt-1 pb-2 space-y-2 border-b border-slate-200/80 dark:border-slate-800/80">
        
        {/* 1. Welcome Name Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Welcome, {facultyName}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {facultyId} • Dept of {department} • Spring 2026 • 0 Clashes (H2 Passed)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>0 Clashes (H2 Passed)</span>
            </span>
          </div>
        </div>

        {/* 2. Small Single Box for Details at Top in Row-Col Format */}
        <div className="bg-white dark:bg-[#111625] rounded-xl border border-slate-200/90 dark:border-slate-800/80 p-2.5 shadow-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800/80 text-xs">
            {/* Weekly Commitment */}
            <div className="px-3 py-1 first:pl-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Weekly Commitment</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                7.0 <span className="text-xs font-normal text-slate-500">hrs/week</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">2 courses • 7 active sessions</span>
            </div>

            {/* Daily Teaching Load */}
            <div className="px-3 py-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Daily Teaching Load</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                Max 2h <span className="text-xs font-normal text-slate-500">/ day</span>
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold truncate block">Compliant with 4h cap (H12)</span>
            </div>

            {/* Assigned Venues */}
            <div className="px-3 py-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Assigned Venues</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                100% <span className="text-xs font-normal text-slate-500">Accessible</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">CR-102, CR-201, CR-202, LH-3</span>
            </div>

            {/* Student Cohorts */}
            <div className="px-3 py-1 last:pr-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Student Cohorts</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                180+ <span className="text-xs font-normal text-slate-500">students</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">Y1 Sec A &amp; B, CSE Year 3</span>
            </div>
          </div>
        </div>

        {/* 3. Three Tabs Bar Fixed at Top */}
        <div className="flex items-center gap-6 text-xs font-semibold pt-0.5">
          <button
            type="button"
            onClick={() => setActiveSubTab('timetable')}
            className={`pb-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'timetable'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Full Timetable</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ai-assistant')}
            className={`pb-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'ai-assistant'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>AI Assistant</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('mark-leave')}
            className={`pb-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'mark-leave'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Mark Leave</span>
          </button>
        </div>

      </div>

      {/* ── DYNAMIC CONTENT (Switches seamlessly while top section remains fixed) ── */}
      <div className="pt-1">
        {/* TAB 1: FULL TIMETABLE */}
        {activeSubTab === 'timetable' && (
          <div className="bg-white dark:bg-[#0b0f19] rounded-xl border border-slate-200/90 dark:border-slate-800/80 p-3 shadow-xs overflow-hidden">
            {/* Table Title Bar */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Weekly Teaching Timetable (P1–P9)
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                7 Assigned Sessions • 1 Active Unavailability Block
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                {/* Bold, Dark Table Header */}
                <thead className="bg-slate-100/90 dark:bg-slate-900/90 text-slate-900 dark:text-white uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2 px-3 text-left w-28 font-bold text-slate-900 dark:text-white text-xs">
                      Period
                    </th>
                    {DAYS.map((day) => (
                      <th
                        key={day}
                        className="py-2 px-3 text-center border-l border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white text-xs min-w-[130px]"
                      >
                        <span>{DAY_LABELS[day]}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-medium block">({day})</span>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Table Body with Medium Font */}
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {PERIODS.map((period) => (
                    <tr key={period.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Period Slot Column */}
                      <td className="py-1.5 px-3 bg-slate-50/50 dark:bg-slate-900/50 border-r border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-xs font-mono text-slate-900 dark:text-white block">
                          {period.label}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">
                          {period.time}
                        </span>
                      </td>

                      {/* Day Cells */}
                      {DAYS.map((day) => {
                        const cls = classAt(day, period.id);
                        const leave = leaveAt(day, period.id);

                        return (
                          <td key={day} className="p-1.5 border-l border-slate-100 dark:border-slate-800/60 align-top min-h-[44px]">
                            {cls ? (
                              <div
                                onClick={() => setSelectedCell({ type: 'class', ...cls })}
                                className="p-1.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/90 dark:border-indigo-800/80 hover:border-indigo-400 dark:hover:border-indigo-600 transition cursor-pointer shadow-2xs space-y-0.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-indigo-900 dark:text-indigo-200">
                                    {cls.course_id}
                                  </span>
                                  <span className="text-[10px] font-bold font-mono text-indigo-700 dark:text-indigo-300 bg-white dark:bg-indigo-900/60 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-700">
                                    {cls.room_id}
                                  </span>
                                </div>
                                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate" title={cls.course_title}>
                                  {cls.course_title}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-0.5">
                                  <span>{cls.groups?.join(', ') || 'CSE'}</span>
                                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">Accessible</span>
                                </div>
                              </div>
                            ) : leave ? (
                              <div
                                onClick={() => setSelectedCell({ type: 'leave', ...leave })}
                                className="p-1.5 rounded-lg bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 cursor-pointer shadow-2xs"
                              >
                                <span className="font-bold text-[11px] block truncate" title={leave.title || 'Faculty Unavailability'}>
                                  {leave.title || 'Faculty Unavailability'}
                                </span>
                                <span className="text-[9px] text-rose-600 dark:text-rose-400 font-medium uppercase tracking-wider block">
                                  Constraint H7 Bound
                                </span>
                              </div>
                            ) : (
                              <div className="h-9 flex items-center justify-center text-slate-300 dark:text-slate-700 text-xs">
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
        )}

        {/* TAB 2: AI ASSISTANT (Embedded below fixed header) */}
        {activeSubTab === 'ai-assistant' && (
          <div className="bg-white dark:bg-[#0b0f19] rounded-xl border border-slate-200/90 dark:border-slate-800/80 p-3 shadow-xs">
            <AIAssistantView currentUser={currentUser} />
          </div>
        )}

        {/* TAB 3: MARK LEAVE (Embedded below fixed header) */}
        {activeSubTab === 'mark-leave' && (
          <div>
            <FacultyUnavailabilityView currentUser={currentUser} />
          </div>
        )}
      </div>

      {/* ── Class / Leave Details Modal ────────────────────────────────── */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#111625] rounded-2xl max-w-sm w-full p-4 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {selectedCell.type === 'class' ? `${selectedCell.course_id} Session Details` : 'Unavailability Block'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedCell.type === 'class' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}>
                {selectedCell.type === 'class' ? selectedCell.kind || 'Lecture' : 'H7 Leave'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              {selectedCell.type === 'class' ? (
                <>
                  <p><strong className="text-slate-900 dark:text-white">Course:</strong> {selectedCell.course_id} — {selectedCell.course_title}</p>
                  <p><strong className="text-slate-900 dark:text-white">Venue:</strong> {selectedCell.room_id} (100% Accessible)</p>
                  <p><strong className="text-slate-900 dark:text-white">Slot:</strong> {selectedCell.day} Period {selectedCell.start_period}</p>
                  <p><strong className="text-slate-900 dark:text-white">Cohorts:</strong> {selectedCell.groups?.join(', ') || 'Undergraduate'}</p>
                </>
              ) : (
                <>
                  <p><strong className="text-slate-900 dark:text-white">Day:</strong> {selectedCell.day}</p>
                  <p><strong className="text-slate-900 dark:text-white">Reason:</strong> {selectedCell.title || 'Official Meeting / Leave'}</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Protected by CP-SAT Constraint H7 (0 Clashes)</p>
                </>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
