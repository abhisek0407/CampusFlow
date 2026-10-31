'use client';

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Calendar,
  Building2,
  FileEdit,
  Users,
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  DoorOpen
} from 'lucide-react';

export default function CoordinatorOverviewView({ setActiveTab }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetch('/api/dataset/summary')
      .then(res => res.json())
      .then(data => { if (data.success) setSummary(data); })
      .catch(err => console.error(err));
  }, []);

  const cseFacultyCount = 12;
  const cseCoursesCount = 18;
  const cseLabs = ['CS-Lab1', 'CS-Lab2', 'Network-Lab', 'AI-Lab'];

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border border-amber-800/40 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
                Department Coordinator Portal
              </span>
              <span className="text-xs text-slate-300 font-medium">Computer Science & Engineering</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Prof. Rajesh Sharma — CSE Dept</h1>
            <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
              Section 4 Responsibilities: Request changes to CSE department sessions, book rooms for department events, and approve fest/guest bookings requested in CSE computer labs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('department-timetable')}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition flex items-center space-x-2 shadow-lg shadow-amber-600/30"
            >
              <Calendar className="w-4 h-4" />
              <span>CSE Timetable</span>
            </button>
            <button
              onClick={() => setActiveTab('department-bookings')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition flex items-center space-x-2"
            >
              <Building2 className="w-4 h-4" />
              <span>Lab Approvals</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dept KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">CSE Faculty</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{cseFacultyCount} Members</div>
          <p className="text-[11px] text-slate-500 mt-0.5">F01 to F12 under supervision</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">CSE Courses</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{cseCoursesCount} Courses</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Lectures, tutorials & 3h labs</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">Specialized CSE Labs</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">4 Dedicated Labs</div>
          <p className="text-[11px] text-slate-500 mt-0.5">CS-1, CS-2, Network, AI Lab</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-slate-500 text-xs font-semibold uppercase">Student Cohorts</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">6 Cohorts</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Y1 (A-D), Y2-CSE, Y3-CSE</p>
        </div>
      </div>

      {/* Dept Lab Status & Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Lab Availability & Fest Reservation */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
            CSE Computing Laboratories Status
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Under Section 4, department labs require coordinator sign-off before non-academic bookings can occupy them.
          </p>

          <div className="space-y-3">
            {cseLabs.map((lab) => (
              <div key={lab} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center space-x-2.5">
                  <DoorOpen className="w-4 h-4 text-amber-500" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{lab}</span>
                    <span className="text-slate-400 text-[11px] ml-2">Capacity: 35 workstations</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-[10px]">
                  Scheduled (3h Labs Active)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Coordinator Actions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              Department Operations
            </h3>
            <p className="text-xs text-slate-500 mb-4">Direct shortcuts to coordinator workflows</p>

            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('department-timetable')}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">Inspect CSE Timetable</div>
                  <div className="text-[10px] text-slate-500">Filter Y2-CSE and Y3-CSE student schedules</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600" />
              </button>

              <button
                onClick={() => setActiveTab('department-bookings')}
                className="w-full p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-left hover:bg-amber-100 dark:hover:bg-amber-900/40 transition flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-amber-900 dark:text-amber-200">Review Lab Venue Requests</div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400">Approve or reject club hackathons in CS labs</div>
                </div>
                <Building2 className="w-4 h-4 text-amber-600" />
              </button>

              <button
                onClick={() => setActiveTab('schedule-change-requests')}
                className="w-full p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-left hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-indigo-900 dark:text-indigo-200">Submit Schedule Change Proposal</div>
                  <div className="text-[10px] text-indigo-700 dark:text-indigo-400">Propose moved tutorial or lab block</div>
                </div>
                <FileEdit className="w-4 h-4 text-indigo-600" />
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
