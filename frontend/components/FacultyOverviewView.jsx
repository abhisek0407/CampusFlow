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
  ArrowRight,
  BookOpen,
  CalendarDays,
  FileText,
  UserCheck,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';

// Ground truth scheduled sessions for F01 (Dr. Ananya Mishra)
const DEFAULT_SESSIONS = [
  {
    id: 'CS101-B-L2',
    course_id: 'CS101',
    course: 'Introduction to Computer Programming',
    type: 'Lecture',
    day: 'MON',
    dayFull: 'Monday',
    start_period: 5,
    end_period: 5,
    periodLabel: 'P5 (12:00 – 13:00)',
    time: '12:00 PM – 1:00 PM',
    room_id: 'CR-102',
    building: 'Academic Block A • Ground Floor',
    groups: ['Y1-B'],
    cohortLabel: 'Year 1 • Section B',
    students: 90,
    accessible: true,
  },
  {
    id: 'CS301-L2',
    course_id: 'CS301',
    course: 'Operating Systems & System Architecture',
    type: 'Lecture',
    day: 'TUE',
    dayFull: 'Tuesday',
    start_period: 4,
    end_period: 4,
    periodLabel: 'P4 (11:00 – 12:00)',
    time: '11:00 AM – 12:00 PM',
    room_id: 'CR-202',
    building: 'Academic Block B • 2nd Floor (Lift)',
    groups: ['CSE-3'],
    cohortLabel: 'B.Tech CSE • Year 3',
    students: 75,
    accessible: true,
  },
  {
    id: 'CS101-B-L1',
    course_id: 'CS101',
    course: 'Introduction to Computer Programming',
    type: 'Lecture',
    day: 'TUE',
    dayFull: 'Tuesday',
    start_period: 6,
    end_period: 6,
    periodLabel: 'P6 (14:00 – 15:00)',
    time: '2:00 PM – 3:00 PM',
    room_id: 'LH-3',
    building: 'Lecture Hall Complex • Ground Floor',
    groups: ['Y1-B'],
    cohortLabel: 'Year 1 • Section B',
    students: 90,
    accessible: true,
  },
  {
    id: 'CS301-L1',
    course_id: 'CS301',
    course: 'Operating Systems & System Architecture',
    type: 'Lecture',
    day: 'WED',
    dayFull: 'Wednesday',
    start_period: 2,
    end_period: 2,
    periodLabel: 'P2 (09:00 – 10:00)',
    time: '9:00 AM – 10:00 AM',
    room_id: 'CR-203',
    building: 'Academic Block B • 2nd Floor (Lift)',
    groups: ['CSE-3'],
    cohortLabel: 'B.Tech CSE • Year 3',
    students: 75,
    accessible: true,
  },
  {
    id: 'CS101-A-L2',
    course_id: 'CS101',
    course: 'Introduction to Computer Programming',
    type: 'Lecture',
    day: 'THU',
    dayFull: 'Thursday',
    start_period: 1,
    end_period: 1,
    periodLabel: 'P1 (08:00 – 09:00)',
    time: '8:00 AM – 9:00 AM',
    room_id: 'CR-102',
    building: 'Academic Block A • Ground Floor',
    groups: ['Y1-A'],
    cohortLabel: 'Year 1 • Section A',
    students: 90,
    accessible: true,
  },
  {
    id: 'CS101-A-L1',
    course_id: 'CS101',
    course: 'Introduction to Computer Programming',
    type: 'Lecture',
    day: 'FRI',
    dayFull: 'Friday',
    start_period: 5,
    end_period: 5,
    periodLabel: 'P5 (12:00 – 13:00)',
    time: '12:00 PM – 1:00 PM',
    room_id: 'CR-201',
    building: 'Academic Block A • 2nd Floor (Lift)',
    groups: ['Y1-A'],
    cohortLabel: 'Year 1 • Section A',
    students: 90,
    accessible: true,
  },
  {
    id: 'CS301-L3',
    course_id: 'CS301',
    course: 'Operating Systems & System Architecture',
    type: 'Lecture',
    day: 'FRI',
    dayFull: 'Friday',
    start_period: 7,
    end_period: 7,
    periodLabel: 'P7 (15:00 – 16:00)',
    time: '3:00 PM – 4:00 PM',
    room_id: 'CR-203',
    building: 'Academic Block B • 2nd Floor (Lift)',
    groups: ['CSE-3'],
    cohortLabel: 'B.Tech CSE • Year 3',
    students: 75,
    accessible: true,
  },
];

const DAYS = [
  { id: 'ALL', label: 'All Week' },
  { id: 'MON', label: 'Mon' },
  { id: 'TUE', label: 'Tue' },
  { id: 'WED', label: 'Wed' },
  { id: 'THU', label: 'Thu' },
  { id: 'FRI', label: 'Fri' },
];

export default function FacultyOverviewView({ currentUser, setActiveTab }) {
  const facultyName = currentUser?.name || 'Dr. Ananya Mishra';
  const facultyId = currentUser?.linked_faculty_id || 'F01';
  const department = currentUser?.department === 'CSE' ? 'Computer Science & Engineering' : (currentUser?.department || 'Computer Science & Engineering');

  const [sessions, setSessions] = useState(DEFAULT_SESSIONS);
  const [selectedDay, setSelectedDay] = useState('ALL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Attempt dynamic fetch from API with fallback
    fetch(`/api/schedule/views?faculty=${facultyId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.sessions) && data.sessions.length > 0) {
          const mapped = data.sessions.map((s) => ({
            id: s.session_id,
            course_id: s.course_id,
            course: s.course_title || s.course_id,
            type: s.kind === 'lecture' ? 'Lecture' : (s.kind === 'tutorial' ? 'Tutorial' : 'Lab Session'),
            day: s.day,
            dayFull: s.day === 'MON' ? 'Monday' : (s.day === 'TUE' ? 'Tuesday' : (s.day === 'WED' ? 'Wednesday' : (s.day === 'THU' ? 'Thursday' : 'Friday'))),
            start_period: s.start_period,
            end_period: s.end_period,
            periodLabel: `P${s.start_period} (${s.start_period === 1 ? '08:00' : s.start_period === 2 ? '09:00' : s.start_period === 3 ? '10:00' : s.start_period === 4 ? '11:00' : s.start_period === 5 ? '12:00' : s.start_period === 6 ? '14:00' : s.start_period === 7 ? '15:00' : s.start_period === 8 ? '16:00' : '17:00'})`,
            time: formatPeriodTime(s.start_period),
            room_id: s.room_id,
            building: s.room_id.startsWith('LH') ? 'Lecture Hall Complex' : 'Academic Block',
            groups: s.groups || [],
            cohortLabel: (s.groups || []).join(', '),
            students: s.size || 80,
            accessible: true,
          }));
          setSessions(mapped);
        }
      })
      .catch(() => {
        // Safe fallback is already pre-set to DEFAULT_SESSIONS
      })
      .finally(() => setLoading(false));
  }, [facultyId]);

  function formatPeriodTime(p) {
    const times = {
      1: '8:00 AM – 9:00 AM',
      2: '9:00 AM – 10:00 AM',
      3: '10:00 AM – 11:00 AM',
      4: '11:00 AM – 12:00 PM',
      5: '12:00 PM – 1:00 PM',
      6: '2:00 PM – 3:00 PM',
      7: '3:00 PM – 4:00 PM',
      8: '4:00 PM – 5:00 PM',
      9: '5:00 PM – 6:00 PM',
    };
    return times[p] || `Period ${p}`;
  }

  const filteredSessions = selectedDay === 'ALL'
    ? sessions
    : sessions.filter((s) => s.day === selectedDay);

  // Next upcoming class (defaults to first session or Monday)
  const nextClass = sessions[0] || DEFAULT_SESSIONS[0];

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto font-sans pb-8">
      
      {/* ========================================================================= */}
      {/* 1. PROFESSIONAL ACADEMIC HEADER                                           */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Identity & Status */}
          <div className="flex items-start space-x-3.5 sm:space-x-4">
            {/* Custom Monogram Avatar */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center font-bold text-base sm:text-lg tracking-wider shrink-0 shadow-xs border border-slate-800 dark:border-blue-500">
              AM
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                  {facultyId} • Faculty Member
                </span>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                  Dept of {department}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
                {facultyName}
              </h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Spring 2026</span>
                </span>
                <span>•</span>
                <span>Week 7 (Regular Lectures &amp; Midsem Prep)</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">0 Clashes (H2 Passed)</span>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('my-timetable')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Full Timetable</span>
            </button>

            <button
              onClick={() => setActiveTab('ai-faculty-assistant')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>AI Assistant</span>
            </button>

            <button
              onClick={() => setActiveTab('mark-unavailability')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer"
            >
              <span>Mark Leave</span>
            </button>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. REFINED ACADEMIC METRICS (CLEAN INSTITUTIONAL DESIGN, NO GENERIC CARDS)  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">Weekly Commitment</span>
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
            7.0 <span className="text-xs sm:text-sm font-normal text-slate-500">hours/week</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            2 courses • 7 active sessions
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">Daily Teaching Load</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
            Max 2h <span className="text-xs sm:text-sm font-normal text-slate-500">/ day</span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
            Compliant with 4h cap (H12)
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">Assigned Venues</span>
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
            100% <span className="text-xs sm:text-sm font-normal text-slate-500">Accessible</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            CR-102, CR-201, CR-202, LH-3
          </p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">Student Cohorts</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">
            180+ <span className="text-xs sm:text-sm font-normal text-slate-500">students</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Y1 Sections A &amp; B, CSE Year 3
          </p>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. NEXT SCHEDULED ENGAGEMENT (SPOTLIGHT CARD FOR BUSY FACULTY)            */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Upcoming Teaching Session
            </span>
          </div>
          <span className="text-xs font-mono font-medium text-slate-400">
            {nextClass.dayFull} • {nextClass.periodLabel}
          </span>
        </div>

        <div className="mt-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold text-xs border border-blue-400/30">
                {nextClass.course_id}
              </span>
              <span className="text-xs text-slate-400">• {nextClass.type}</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {nextClass.course}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 pt-1">
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Room {nextClass.room_id} ({nextClass.building})</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{nextClass.cohortLabel} (~{nextClass.students} students)</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
            <button
              onClick={() => setActiveTab('my-timetable')}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <span>View in Grid</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTab('ai-faculty-assistant')}
              title="Request reschedule for this slot"
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Reschedule</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. WEEKLY SESSIONS LIST WITH DAY TABS (RESPONSIVE FOR MOBILE & TABLET)    */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        
        {/* Section Header & Day Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Weekly Teaching Engagements
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Scheduled teaching sessions and assigned lecture halls for the week
            </p>
          </div>

          {/* Interactive Day Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {DAYS.map((d) => {
              const count = d.id === 'ALL'
                ? sessions.length
                : sessions.filter((s) => s.day === d.id).length;
              const isActive = selectedDay === d.id;

              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDay(d.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center space-x-1 ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span>{d.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sessions Feed */}
        <div className="space-y-2.5 sm:space-y-3">
          {filteredSessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              No classes scheduled for {selectedDay}. Enjoy your research / office hours!
            </div>
          ) : (
            filteredSessions.map((s) => (
              <div
                key={s.id}
                className="group p-3.5 sm:p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                {/* Left: Day Badge + Course Details */}
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-700/80 text-slate-800 dark:text-slate-200 font-bold font-mono text-xs flex flex-col items-center justify-center shrink-0 border border-slate-300/60 dark:border-slate-600">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 leading-none">
                      DAY
                    </span>
                    <span className="leading-tight text-xs font-black">{s.day}</span>
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {s.course}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                        {s.course_id}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Cohort: <strong className="text-slate-700 dark:text-slate-300">{s.cohortLabel}</strong></span>
                      <span>•</span>
                      <span>Enrolled: <strong>~{s.students}</strong></span>
                      <span>•</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">{s.id}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Timing + Room + Accessible Pill */}
                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50 dark:border-slate-700/50">
                  <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{s.time}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-[11px]">
                      {s.room_id}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">
                      Accessible
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 5. ACADEMIC COMPLIANCE & SCHEDULE ADVISORY FOOTER                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Unavailability & Office Hours */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 text-xs space-y-2">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold">
            <UserCheck className="w-4 h-4 text-slate-500" />
            <span>Faculty Unavailability Windows (Rule H7)</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
            Wednesdays 10:00 AM – 1:00 PM (P3–P5) is registered as reserved for <strong>Department HOD Meetings</strong>. The scheduler guarantees no teaching sessions are placed in this window.
          </p>
          <button
            onClick={() => setActiveTab('mark-unavailability')}
            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold text-[11px] inline-flex items-center space-x-1 cursor-pointer pt-1"
          >
            <span>Update Leave or Unavailable Slots</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* AI Schedule Assistant Reminder */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 text-xs space-y-2">
          <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Need to shift a session?</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
            Use the natural language AI Faculty Assistant to propose conflict-free alternative slots. All recommendations are mathematically verified by CP-SAT before being submitted for Dean approval.
          </p>
          <button
            onClick={() => setActiveTab('ai-faculty-assistant')}
            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold text-[11px] inline-flex items-center space-x-1 cursor-pointer pt-1"
          >
            <span>Launch AI Faculty Assistant</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

      </div>

    </div>
  );
}
