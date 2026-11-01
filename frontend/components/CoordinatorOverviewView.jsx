'use client';
import { apiFetch } from '@/lib/api';

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
    apiFetch('/api/dataset/summary')
      .then(res => res.json())
      .then(data => { if (data.success) setSummary(data); })
      .catch(err => console.error(err));
  }, []);

  const cseFacultyCount = 12;
  const cseCoursesCount = 18;
  const cseLabs = ['CS-Lab1', 'CS-Lab2', 'Network-Lab', 'AI-Lab'];

  return (
    <div className="space-y-6">
      
      {/* Clean Unboxed Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1 pb-1">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Chilika Institute of Technology</span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">CSE Department</span>
            <span>•</span>
            <span className="text-slate-400">Department Coordinator Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            Prof. Rajesh Sharma
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Department timetable management, CSE computer lab booking approvals, and session modification requests.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setActiveTab('department-timetable')}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition flex items-center space-x-2 shadow-xs cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>CSE Timetable</span>
          </button>
          <button
            onClick={() => setActiveTab('department-bookings')}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 font-medium text-xs transition flex items-center space-x-2 cursor-pointer shadow-2xs"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Lab Approvals</span>
          </button>
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
          <p className="text-[11px] text-slate-500 mt-0.5">Y1 (A-D), CSE-2, CSE-3</p>
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
                  <div className="text-[10px] text-slate-500">Filter CSE-2 and CSE-3 student schedules</div>
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
