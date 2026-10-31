'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  DoorOpen,
  Users,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

export default function FacultyOverviewView({ setActiveTab }) {
  const facultyName = 'Dr. Ananya Mishra';
  const facultyId = 'F01';
  const department = 'Computer Science & Engineering';

  // F01 Teaching Load
  const mySessions = [
    { id: 'CS101-L1', course: 'CS101 (Intro to Programming)', day: 'MON', period: 'P2 (09:00)', room: 'CR-101', groups: 'Y1-A, Y1-B', accessible: true },
    { id: 'CS101-L2', course: 'CS101 (Intro to Programming)', day: 'WED', period: 'P3 (10:00)', room: 'CR-101', groups: 'Y1-A, Y1-B', accessible: true },
    { id: 'CS101-T1', course: 'CS101 Tutorial Section 1', day: 'THU', period: 'P4 (11:00)', room: 'CR-102', groups: 'Y1-A', accessible: true },
    { id: 'CS301-L1', course: 'CS301 (Operating Systems)', day: 'TUE', period: 'P6 (14:00)', room: 'LH-1', groups: 'CSE-3', accessible: true },
    { id: 'CS301-L2', course: 'CS301 (Operating Systems)', day: 'FRI', period: 'P2 (09:00)', room: 'LH-1', groups: 'CSE-3', accessible: true },
  ];

  return (
    <div className="space-y-6">
      
      {/* Clean Unboxed Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1 pb-1">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Chilika Institute of Technology</span>
            <span>•</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">{department}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ground-Floor Accessible (Rule H10)</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            {facultyName} <span className="text-slate-400 font-normal text-xl">({facultyId})</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Assistant Professor • Teaching schedule verified with 0 overlaps and strictly within CIT daily 4-hour cap.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setActiveTab('my-timetable')}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition flex items-center space-x-2 shadow-xs cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>View My Timetable</span>
          </button>
          <button
            onClick={() => setActiveTab('ai-faculty-assistant')}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 font-medium text-xs transition flex items-center space-x-2 cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>AI Schedule Assistant</span>
          </button>
        </div>
      </div>

      {/* Faculty KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">Weekly Teaching Load</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">8 Hours / Week</div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">5 active lecture & tutorial slots</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">Daily Teaching Limit</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">Max 2h in a day</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Well within 4-hour CIT cap (H12)</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">Accessibility (H10)</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">100% Ground/Lift</div>
          <p className="text-[11px] text-slate-500 mt-0.5">CR-101, CR-102 & LH-1 all accessible</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">Active Student Cohorts</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">Y1-A, Y1-B, Y3-CSE</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Undergraduate engineering classes</p>
        </div>

      </div>

      {/* Class Schedule Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Active Weekly Teaching Engagements
            </h3>
            <p className="text-xs text-slate-500">Allocated periods by the autonomous scheduling engine</p>
          </div>
          <button
            onClick={() => setActiveTab('my-timetable')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
          >
            <span>Full Matrix View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {mySessions.map((s) => (
            <div key={s.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-start space-x-3">
                <div className="px-2.5 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-bold font-mono">
                  {s.day}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{s.course}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Session ID: <span className="font-mono text-slate-700 dark:text-slate-300">{s.id}</span> • Groups: {s.groups}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-right">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{s.period}</span>
                <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono font-bold text-slate-800 dark:text-slate-200">
                  {s.room}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-semibold">
                  Accessible
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
