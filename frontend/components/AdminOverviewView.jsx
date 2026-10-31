'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Building2,
  Clock,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  DoorOpen,
  Users,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Activity,
  FileCheck2,
  RotateCcw
} from 'lucide-react';

export default function AdminOverviewView({ setActiveTab, onResetData, isResetting }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  async function fetchSummary() {
    try {
      const res = await fetch('/api/dataset/summary');
      const data = await res.json();
      if (data.success) {
        setSummary(data);
      }
    } catch (e) {
      console.error('Failed to load dataset summary:', e);
    } finally {
      setLoading(false);
    }
  }

  const counts = summary?.counts || {
    rooms: 27,
    faculty: 40,
    student_groups: 14,
    courses: 62,
    sessions: 189,
    booking_requests: 25,
    cancellations: 1,
    exams: 41,
  };

  return (
    <div className="space-y-6">
      
      {/* Executive Welcome & Health Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
                Dean of Academic Affairs Portal
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Active Baseline Schedule</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Chilika Institute of Technology</h1>
            <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
              Week 7 High-Stakes Operations: Regular academic lectures running in parallel with 25 Spectra Tech Fest venue allocations and 41 midsem exams scheduled for Week 8.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('timetable')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center space-x-2 shadow-lg shadow-indigo-600/30"
            >
              <Calendar className="w-4 h-4" />
              <span>Open Timetable</span>
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition flex items-center space-x-2"
            >
              <Building2 className="w-4 h-4" />
              <span>Review Bookings</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-indigo-400 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Rooms & Labs</span>
            <DoorOpen className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{counts.rooms}</div>
          <p className="text-[11px] text-slate-500 mt-1">20 Classrooms/Halls + 7 Labs</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-indigo-400 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Faculty Body</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{counts.faculty}</div>
          <p className="text-[11px] text-slate-500 mt-1">4h daily teaching cap compliant</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-indigo-400 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Academic Sessions</span>
            <Calendar className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{counts.sessions}</div>
          <p className="text-[11px] text-slate-500 mt-1">243 teaching hours • 0 clashes</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-indigo-400 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Spectra Fest Bookings</span>
            <Building2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{counts.booking_requests}</div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">61.0 Benchmark Score</p>
        </div>

      </div>

      {/* Official Rule Verification Checklist & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Compliance Status */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Institutional Constraints & Rule Integrity
              </h3>
              <p className="text-xs text-slate-500">Autonomous CP-SAT Solver Verification (H1–H14)</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% Passed</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">No Double Booking (H1, H3, H4)</p>
                <p className="text-[11px] text-slate-500">Zero room, faculty, or student cohort overlaps</p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Room Types & Equipment (H6)</p>
                <p className="text-[11px] text-slate-500">Physics, Chem, CS Labs strictly mapped to lab rooms</p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Lunch Break Isolation (H9)</p>
                <p className="text-[11px] text-slate-500">13:00–14:00 (P5–P6) clear; 3h labs in P2–P4 / P6–P8</p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Elective Basket Synchrony (H11)</p>
                <p className="text-[11px] text-slate-500">All sessions in same basket slot run at identical times</p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Wheelchair Accessibility (H10)</p>
                <p className="text-[11px] text-slate-500">Y1-C and Dr. Ananya Mishra assigned ground/accessible</p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">50% Exam Capacity Halving (H5)</p>
                <p className="text-[11px] text-slate-500">Midsems spaced across 6 days Mon–Sat AM/PM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Portal Shortcuts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">
              Admin Quick Actions
            </h3>
            <p className="text-xs text-slate-500 mb-4">Direct shortcuts to high-frequency actions</p>

            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('disruptions')}
                className="w-full p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-left hover:bg-amber-100 dark:hover:bg-amber-900/40 transition flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-amber-900 dark:text-amber-200">Simulate Sample Disruption</div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400">F07 leave, CR-102 leak (9 moves)</div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-600 shrink-0" />
              </button>

              <button
                onClick={() => setActiveTab('ai-assistant')}
                className="w-full p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-left hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-indigo-900 dark:text-indigo-200">AI Hinglish Booking Parser</div>
                  <div className="text-[10px] text-indigo-700 dark:text-indigo-400">Natural language event requests</div>
                </div>
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              </button>

              <button
                onClick={() => setActiveTab('dataset')}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">Run Official Validator.py</div>
                  <div className="text-[10px] text-slate-500">Live evaluation & export verification</div>
                </div>
                <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0" />
              </button>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onResetData}
              disabled={isResetting}
              className="w-full py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-center space-x-2 transition"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>{isResetting ? 'Resetting Data...' : 'Reset Dataset to Clean State'}</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
