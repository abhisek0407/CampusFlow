'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
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
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSummary(data);
      })
      .catch((err) => console.error(err));
  }, []);

  const cseFacultyCount = 12;
  const cseCoursesCount = 18;
  const cseLabs = ['CS-Lab1', 'CS-Lab2', 'Network-Lab', 'AI-Lab'];

  return (
    <div className="space-y-3 font-sans pb-4">

      {/* ── 1. Clean Unboxed Page Header ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Chilika Institute of Technology</span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">CSE Department</span>
            <span>•</span>
            <span className="text-slate-400">Department Coordinator Portal</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            Prof. Rajesh Sharma
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Department timetable management, CSE computer lab booking approvals, and session modification requests.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('department-timetable')}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>CSE Timetable</span>
          </button>
          <button
            onClick={() => setActiveTab('department-bookings')}
            className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 font-semibold text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Lab Approvals</span>
          </button>
        </div>
      </div>

      {/* ── 2. Small Single Box for Dept Info in Row-Col Format ─────────────── */}
      <div className="bg-white dark:bg-[#111625] rounded-xl border border-slate-200/90 dark:border-slate-800/80 p-2.5 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800/80 text-xs">
          {/* CSE Faculty */}
          <div className="px-3 py-1 first:pl-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">CSE Faculty</span>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {cseFacultyCount} <span className="text-xs font-normal text-slate-500">Members</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">F01 to F12 under supervision</span>
          </div>

          {/* CSE Courses */}
          <div className="px-3 py-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">CSE Courses</span>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {cseCoursesCount} <span className="text-xs font-normal text-slate-500">Courses</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">Lectures, tutorials &amp; 3h labs</span>
          </div>

          {/* Specialized CSE Labs */}
          <div className="px-3 py-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Specialized CSE Labs</span>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              4 <span className="text-xs font-normal text-slate-500">Dedicated Labs</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">CS-1, CS-2, Network, AI Lab</span>
          </div>

          {/* Student Cohorts */}
          <div className="px-3 py-1 last:pr-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Student Cohorts</span>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              6 <span className="text-xs font-normal text-slate-500">Cohorts</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">Y1 (A–D), CSE-2, CSE-3</span>
          </div>
        </div>
      </div>

      {/* ── 3. Dept Lab Status & Shortcuts ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        
        {/* Lab Availability & Fest Reservation */}
        <div className="bg-white dark:bg-[#0b0f19] border border-slate-200/90 dark:border-slate-800/80 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                CSE Computing Laboratories Status
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Under Section 4, department labs require coordinator sign-off before non-academic fest bookings occupy them.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {cseLabs.map((lab) => (
              <div
                key={lab}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 text-xs"
              >
                <div className="flex items-center space-x-2.5">
                  <DoorOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{lab}</span>
                    <span className="text-slate-400 text-[10px] ml-2">Capacity: 35 workstations</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold text-[10px]">
                  Scheduled (3h Labs Active)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Coordinator Operations Shortcuts */}
        <div className="bg-white dark:bg-[#0b0f19] border border-slate-200/90 dark:border-slate-800/80 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Department Operations
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Direct shortcuts to coordinator workflows
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setActiveTab('department-timetable')}
                className="w-full p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200">Inspect CSE Timetable</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Filter CSE-2 and CSE-3 student cohort schedules</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('department-bookings')}
                className="w-full p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 text-left hover:bg-amber-100/80 dark:hover:bg-amber-900/40 transition flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-bold text-xs text-amber-900 dark:text-amber-200">Review Lab Venue Requests</div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400">Approve or reject club hackathons &amp; contests in CS labs</div>
                </div>
                <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('schedule-change-requests')}
                className="w-full p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200">Submit Schedule Change Proposal</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Propose moved tutorial or 3h practical laboratory block</div>
                </div>
                <FileEdit className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
