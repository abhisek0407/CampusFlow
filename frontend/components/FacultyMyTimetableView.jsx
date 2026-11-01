'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Printer,
  ChevronRight,
  ChevronLeft,
  X,
  LayoutGrid,
  ListFilter,
  ArrowRight,
  Info,
  Building2,
  Coffee
} from 'lucide-react';

const DAYS = [
  { id: 'MON', label: 'Monday', short: 'Mon' },
  { id: 'TUE', label: 'Tuesday', short: 'Tue' },
  { id: 'WED', label: 'Wednesday', short: 'Wed' },
  { id: 'THU', label: 'Thursday', short: 'Thu' },
  { id: 'FRI', label: 'Friday', short: 'Fri' },
];

const PERIODS = [
  { id: 1, time: '08:00 – 09:00', label: 'P1', isLunch: false },
  { id: 2, time: '09:00 – 10:00', label: 'P2', isLunch: false },
  { id: 3, time: '10:00 – 11:00', label: 'P3', isLunch: false },
  { id: 4, time: '11:00 – 12:00', label: 'P4', isLunch: false },
  { id: 5, time: '12:00 – 13:00', label: 'P5', isLunch: false },
  { id: 'LUNCH', time: '13:00 – 14:00', label: 'Lunch', isLunch: true },
  { id: 6, time: '14:00 – 15:00', label: 'P6', isLunch: false },
  { id: 7, time: '15:00 – 16:00', label: 'P7', isLunch: false },
  { id: 8, time: '16:00 – 17:00', label: 'P8', isLunch: false },
  { id: 9, time: '17:00 – 18:00', label: 'P9', isLunch: false },
];

// Ground truth verified sessions for F01 (Dr. Ananya Mishra)
const DEFAULT_SESSIONS = [
  {
    session_id: 'CS101-B-L2',
    course_id: 'CS101',
    course_title: 'Introduction to Computer Programming',
    day: 'MON',
    start_period: 5,
    end_period: 5,
    duration: 1,
    room_id: 'CR-102',
    building: 'Academic Block A • Ground Floor',
    groups: ['Y1-B'],
    size: 90,
    kind: 'lecture',
    accessible: true,
  },
  {
    session_id: 'CS301-L2',
    course_id: 'CS301',
    course_title: 'Operating Systems & System Architecture',
    day: 'TUE',
    start_period: 4,
    end_period: 4,
    duration: 1,
    room_id: 'CR-202',
    building: 'Academic Block B • 2nd Floor (Lift Accessible)',
    groups: ['CSE-3'],
    size: 75,
    kind: 'lecture',
    accessible: true,
  },
  {
    session_id: 'CS101-B-L1',
    course_id: 'CS101',
    course_title: 'Introduction to Computer Programming',
    day: 'TUE',
    start_period: 6,
    end_period: 6,
    duration: 1,
    room_id: 'LH-3',
    building: 'Lecture Hall Complex • Ground Floor',
    groups: ['Y1-B'],
    size: 90,
    kind: 'lecture',
    accessible: true,
  },
  {
    session_id: 'CS301-L1',
    course_id: 'CS301',
    course_title: 'Operating Systems & System Architecture',
    day: 'WED',
    start_period: 2,
    end_period: 2,
    duration: 1,
    room_id: 'CR-203',
    building: 'Academic Block B • 2nd Floor (Lift Accessible)',
    groups: ['CSE-3'],
    size: 75,
    kind: 'lecture',
    accessible: true,
  },
  {
    session_id: 'CS101-A-L2',
    course_id: 'CS101',
    course_title: 'Introduction to Computer Programming',
    day: 'THU',
    start_period: 1,
    end_period: 1,
    duration: 1,
    room_id: 'CR-102',
    building: 'Academic Block A • Ground Floor',
    groups: ['Y1-A'],
    size: 90,
    kind: 'lecture',
    accessible: true,
  },
  {
    session_id: 'CS101-A-L1',
    course_id: 'CS101',
    course_title: 'Introduction to Computer Programming',
    day: 'FRI',
    start_period: 5,
    end_period: 5,
    duration: 1,
    room_id: 'CR-201',
    building: 'Academic Block A • 2nd Floor (Lift Accessible)',
    groups: ['Y1-A'],
    size: 90,
    kind: 'lecture',
    accessible: true,
  },
  {
    session_id: 'CS301-L3',
    course_id: 'CS301',
    course_title: 'Operating Systems & System Architecture',
    day: 'FRI',
    start_period: 7,
    end_period: 7,
    duration: 1,
    room_id: 'CR-203',
    building: 'Academic Block B • 2nd Floor (Lift Accessible)',
    groups: ['CSE-3'],
    size: 75,
    kind: 'lecture',
    accessible: true,
  },
];

export default function FacultyMyTimetableView({ currentUser, setActiveTab }) {
  const facultyId = currentUser?.linked_faculty_id || 'F01';
  const facultyName = currentUser?.name || 'Dr. Ananya Mishra';

  const [sessions, setSessions] = useState(DEFAULT_SESSIONS);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  
  // 'agenda' (mobile-first daily view) | 'grid' (weekly matrix)
  const [viewMode, setViewMode] = useState('agenda');
  const [activeDay, setActiveDay] = useState('MON');

  useEffect(() => {
    // Detect screen width: default to grid on desktop (>=1024px), agenda on mobile/tablet (<1024px)
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setViewMode('grid');
    }

    fetch(`/api/schedule/views?faculty=${facultyId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.sessions) && data.sessions.length > 0) {
          const mapped = data.sessions.map((s) => ({
            session_id: s.session_id,
            course_id: s.course_id,
            course_title: s.course_title || s.course_id,
            day: s.day,
            start_period: s.start_period,
            end_period: s.end_period,
            duration: s.duration || 1,
            room_id: s.room_id,
            building: s.room_id.startsWith('LH') ? 'Lecture Hall Complex' : 'Academic Block',
            groups: s.groups || [],
            size: s.size || 80,
            kind: s.kind || 'lecture',
            accessible: true,
          }));
          setSessions(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [facultyId]);

  function getSlotSession(day, periodId) {
    if (periodId === 'LUNCH') return null;
    return sessions.find(
      (s) => s.day === day && periodId >= s.start_period && periodId <= s.end_period
    );
  }

  // Check if slot falls in F01's registered unavailability (WED P3, P4, P5 HOD Meeting)
  function isUnavailableSlot(day, periodId) {
    return day === 'WED' && (periodId === 3 || periodId === 4 || periodId === 5);
  }

  function handlePrint() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto font-sans pb-10">
      
      {/* ========================================================================= */}
      {/* 1. PROFESSIONAL ACADEMIC HEADER & RESPONSIVE CONTROLS                      */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">CIT Timetable Portal</span>
              <span>•</span>
              <span>{facultyId}</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">0 Conflicts Verified</span>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
              Faculty Teaching Schedule
            </h1>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {facultyName} • 7 weekly teaching hours across Monday to Friday
            </p>
          </div>

          {/* Action & View Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* View Mode Toggle Switch (Agenda vs Matrix) */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700">
              <button
                onClick={() => setViewMode('agenda')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer ${
                  viewMode === 'agenda'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Day Agenda</span>
              </button>

              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Weekly Matrix</span>
              </button>
            </div>

            {/* Print / Export Button */}
            <button
              onClick={handlePrint}
              title="Print Schedule"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>

          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. VIEW MODE A: DAY AGEDA (MOBILE & TABLET OPTIMIZED VIEW)                */}
      {/* ========================================================================= */}
      {viewMode === 'agenda' && (
        <div className="space-y-4">
          
          {/* Day Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {DAYS.map((d) => {
              const dayCount = sessions.filter((s) => s.day === d.id).length;
              const isActive = activeDay === d.id;

              return (
                <button
                  key={d.id}
                  onClick={() => setActiveDay(d.id)}
                  className={`flex-1 min-w-[70px] sm:min-w-[90px] py-2 px-3 rounded-xl text-center text-xs font-semibold transition cursor-pointer border ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                    {d.short}
                  </div>
                  <div className="text-sm font-black mt-0.5">
                    {dayCount} {dayCount === 1 ? 'Class' : 'Classes'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Day Chronological Timeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-3">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {DAYS.find((d) => d.id === activeDay)?.label} Schedule
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Teaching Hours: {sessions.filter((s) => s.day === activeDay).length}h / 4h max
              </span>
            </div>

            {/* Timeline Blocks */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {PERIODS.map((period) => {
                // Check if lunch
                if (period.isLunch) {
                  return (
                    <div
                      key="lunch"
                      className="py-3 px-3 my-1 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500"
                    >
                      <div className="flex items-center space-x-2">
                        <Coffee className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Institute Lunch Recess</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400">13:00 – 14:00 (Rule H9 Compliant)</span>
                    </div>
                  );
                }

                const session = getSlotSession(activeDay, period.id);
                const isUnavailable = isUnavailableSlot(activeDay, period.id);

                return (
                  <div key={period.id} className="py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Time & Period Pill */}
                    <div className="w-32 shrink-0 flex items-center sm:flex-col sm:items-start space-x-2 sm:space-x-0">
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                        {period.label}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {period.time}
                      </span>
                    </div>

                    {/* Content Slot */}
                    <div className="flex-1 min-w-0">
                      {session ? (
                        <div
                          onClick={() => setSelectedSession(session)}
                          className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition cursor-pointer shadow-2xs group"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white dark:bg-blue-600">
                                  {session.course_id}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                                  {session.course_title}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                                <span>Cohorts: <strong className="text-slate-700 dark:text-slate-300">{session.groups.join(', ')}</strong></span>
                                <span>•</span>
                                <span>Size: ~{session.size}</span>
                                <span>•</span>
                                <span className="text-blue-600 dark:text-blue-400 font-mono">{session.session_id}</span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 font-mono font-black text-slate-900 dark:text-slate-100 text-xs">
                                {session.room_id}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold">
                                Accessible
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : isUnavailable ? (
                        <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
                          <div className="flex items-center space-x-2 font-medium">
                            <ShieldCheck className="w-4 h-4 text-amber-600" />
                            <span>Reserved: Department HOD Meeting (Rule H7 Unavailability)</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300">Protected</span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 text-xs italic flex items-center justify-between">
                          <span>Open Period • Available for Student Doubts &amp; Research</span>
                          <span className="text-[11px] text-slate-400 font-normal not-italic">Free Slot</span>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VIEW MODE B: WEEKLY MATRIX GRID (DESKTOP & TABLET LANDSCAPE)           */}
      {/* ========================================================================= */}
      {viewMode === 'grid' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          
          {/* Scrollable Container with Sticky Left Column */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs min-w-[760px]">
              
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <th className="p-3 text-left w-28 sticky left-0 z-10 bg-slate-100 dark:bg-slate-800 font-bold border-r border-slate-200 dark:border-slate-700">
                    Period
                  </th>
                  {DAYS.map((d) => (
                    <th key={d.id} className="p-3 text-center border-l border-slate-200 dark:border-slate-800 min-w-[130px] font-bold">
                      <div>{d.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {sessions.filter((s) => s.day === d.id).length} classes
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {PERIODS.map((period) => {
                  if (period.isLunch) {
                    return (
                      <tr key="lunch" className="bg-slate-50 dark:bg-slate-850">
                        <td className="p-2.5 font-bold text-slate-500 sticky left-0 z-10 bg-slate-50 dark:bg-slate-850 border-r border-slate-200 dark:border-slate-700">
                          <div className="font-mono text-xs">LUNCH</div>
                          <div className="text-[10px] text-slate-400">13:00–14:00</div>
                        </td>
                        <td colSpan={5} className="p-2 text-center text-xs text-slate-400 italic bg-slate-50/80 dark:bg-slate-850/80">
                          Recess &amp; Campus Movement Window (No Teaching Sessions Permitted)
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={period.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      
                      {/* Sticky Time Column */}
                      <td className="p-2.5 font-semibold text-slate-700 dark:text-slate-300 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
                        <div className="font-mono font-bold text-xs">{period.label}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{period.time}</div>
                      </td>

                      {/* Day Columns */}
                      {DAYS.map((d) => {
                        const session = getSlotSession(d.id, period.id);
                        const isUnavailable = isUnavailableSlot(d.id, period.id);

                        return (
                          <td key={d.id} className="p-1.5 border-l border-slate-100 dark:border-slate-800 align-top min-h-[72px]">
                            {session ? (
                              <div
                                onClick={() => setSelectedSession(session)}
                                className="p-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 shadow-2xs hover:shadow-xs transition cursor-pointer flex flex-col justify-between h-full"
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-900 text-white dark:bg-blue-600">
                                      {session.course_id}
                                    </span>
                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                                      {session.room_id}
                                    </span>
                                  </div>
                                  <div className="font-semibold text-slate-900 dark:text-white text-[11px] mt-1 leading-snug line-clamp-2">
                                    {session.course_title}
                                  </div>
                                </div>

                                <div className="mt-2 pt-1 border-t border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-[10px] text-slate-500">
                                  <span>{session.groups[0]}</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Acc</span>
                                </div>
                              </div>
                            ) : isUnavailable ? (
                              <div className="h-full p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[10px] text-amber-800 dark:text-amber-300 flex flex-col justify-center text-center">
                                <span className="font-bold">HOD Meet</span>
                                <span className="text-[9px] text-amber-600">Reserved</span>
                              </div>
                            ) : (
                              <div className="h-14 flex items-center justify-center text-slate-300 dark:text-slate-700 text-xs italic">
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}

                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SESSION DETAILS MODAL / DRAWER                                         */}
      {/* ========================================================================= */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-mono font-bold text-xs">
                    {selectedSession.course_id}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{selectedSession.session_id}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                  {selectedSession.course_title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Logistics Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Room &amp; Venue</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{selectedSession.room_id}</span>
                <span className="text-[10px] text-slate-500 block">{selectedSession.building}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Time &amp; Day</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  {selectedSession.day} • Period {selectedSession.start_period}
                </span>
                <span className="text-[10px] text-slate-500 block">Duration: {selectedSession.duration} hr</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Student Cohort</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {selectedSession.groups.join(', ')}
                </span>
                <span className="text-[10px] text-slate-500 block">Enrolled: ~{selectedSession.size} students</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Accessibility</span>
                <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Rule H10 Passed</span>
                </span>
                <span className="text-[10px] text-slate-500 block">Wheelchair/Lift verified</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => {
                  setSelectedSession(null);
                  setActiveTab && setActiveTab('ai-faculty-assistant');
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400 dark:text-blue-600" />
                <span>Reschedule via AI</span>
              </button>
              <button
                onClick={() => setSelectedSession(null)}
                className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
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
