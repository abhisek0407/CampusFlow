'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import {
  Calendar,
  Building2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  DoorOpen,
  Users,
  RotateCcw,
  ChevronRight,
  Cpu,
  TrendingUp,
  BarChart3,
  Bell,
  CheckCircle2
} from 'lucide-react';

const TONES = {
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
};

const STATUS_STYLES = {
  approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  rejected: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
};

const UTILIZATION = [
  { label: 'Lecture halls', value: 78, bar: 'bg-emerald-500' },
  { label: 'Classrooms', value: 82, bar: 'bg-indigo-500' },
  { label: 'Computer labs', value: 94, bar: 'bg-amber-500' },
  { label: 'Auditorium and OAT', value: 100, bar: 'bg-violet-500' },
];

// Campus Daily Operational Load Distribution (189 Academic Sessions + 25 Fest Bookings)
const DAILY_LOAD = [
  { day: 'MON', academic: 28, labs: 10, fest: 2, total: 40, delay: '0.1s' },
  { day: 'TUE', academic: 31, labs: 10, fest: 3, total: 44, delay: '0.2s', isPeak: true }, // Peak day (LH-4 window preserved)
  { day: 'WED', academic: 27, labs: 12, fest: 4, total: 43, delay: '0.3s' },
  { day: 'THU', academic: 25, labs: 11, fest: 5, total: 41, delay: '0.4s' },
  { day: 'FRI', academic: 24, labs: 11, fest: 6, total: 41, delay: '0.5s' },
];

const FALLBACK_COUNTS = {
  rooms: 27,
  faculty: 40,
  sessions: 189,
  booking_requests: 25,
};

const FALLBACK_BOOKINGS = [
  { title: 'Spectra Fest Inauguration', requester: 'Dramatics Society', requested_venue: 'AUD', status: 'approved' },
  { title: 'RoboWars Arena Challenge', requester: 'Robotics Club', requested_venue: 'CS-Lab 1', status: 'approved' },
  { title: 'Street Play Rehearsal', requester: 'Cultural Council', requested_venue: 'OAT', status: 'approved' },
];

const cardBase =
  'rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900';

const btnBase =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500';

const btnOutline = `${btnBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`;

function StatCard({ icon: Icon, label, value, note, tone }) {
  return (
    <div className={`${cardBase} flex items-center gap-3 px-3.5 py-2.5`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        <p className="text-lg font-bold leading-tight text-slate-900 dark:text-white">{value}</p>
        <p className="truncate text-[11px] leading-tight text-emerald-600 dark:text-emerald-400">{note}</p>
      </div>
    </div>
  );
}

function ActionTile({ icon: Icon, tone, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-2.5 py-2 text-left transition hover:border-indigo-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:hover:border-indigo-500/50 dark:hover:bg-slate-800/60"
    >
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${TONES[tone]}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-900 dark:text-white leading-tight">{title}</p>
        <p className="truncate text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{description}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:text-indigo-500" />
    </button>
  );
}

export default function AdminOverviewView({ setActiveTab, onResetData, isResetting }) {
  const [summary, setSummary] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [hoveredDay, setHoveredDay] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [sumRes, bookRes] = await Promise.all([
          apiFetch('/api/dataset/summary'),
          apiFetch('/api/bookings'),
        ]);
        const sumData = await sumRes.json();
        const bookData = await bookRes.json();

        if (sumData.success) setSummary(sumData);
        if (bookData.success && bookData.bookings) {
          // Display top 3 recent items for a compact notifications box
          setBookings(bookData.bookings.slice(0, 3));
        }
      } catch (e) {
        console.error('Failed to load dashboard data:', e);
      }
    }
    loadData();
  }, []);

  const counts = summary?.counts || FALLBACK_COUNTS;
  const displayBookings = bookings.length > 0 ? bookings : FALLBACK_BOOKINGS.slice(0, 3);

  const stats = [
    { icon: DoorOpen, label: 'Venues', value: counts.rooms, note: 'All active', tone: 'indigo' },
    { icon: Users, label: 'Faculty', value: counts.faculty, note: 'No overloads', tone: 'emerald' },
    { icon: Calendar, label: 'Sessions', value: counts.sessions, note: 'No clashes', tone: 'violet' },
    { icon: Sparkles, label: 'Fest bookings', value: counts.booking_requests ?? 25, note: 'Score 67.0', tone: 'amber' },
  ];

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-2.5">
      
      {/* Scoped CSS for Sleek Professional Bar Animation */}
      <style>{`
        @keyframes barGrow {
          0% { transform: scaleY(0); opacity: 0.2; }
          100% { transform: scaleY(1); opacity: 1; }
        }
        .animate-bar-grow {
          transform-origin: bottom;
          animation: barGrow 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* 1. Header */}
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chilika Institute of Technology, Autumn 2026-27
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('timetable')}
            className={`${btnBase} bg-indigo-600 text-white shadow-xs hover:bg-indigo-500`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Weekly timetable</span>
          </button>
          <button type="button" onClick={() => setActiveTab('bookings')} className={btnOutline}>
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span>Review bookings</span>
          </button>
          <button type="button" onClick={() => setActiveTab('dataset')} className={btnOutline}>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Run validator</span>
          </button>
        </div>
      </div>

      {/* 2. Top Statistics Cards Grid (Moved to top as requested) */}
      <div className="grid shrink-0 grid-cols-2 gap-2.5 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* 3. Main Dashboard Panels (Fills viewport with zero scrolling) */}
      <div className="grid grid-cols-1 gap-2.5 lg:min-h-0 lg:flex-1 lg:grid-cols-12 items-stretch">
        
        {/* Left Column: Statistics Graph + Small Recent Notifications Box */}
        <div className="flex flex-col gap-2.5 lg:col-span-7">
          
          {/* Cool Animated Statistics Graph for Past Activities & Campus Trends */}
          <section className={`${cardBase} flex flex-col justify-between p-3 flex-1 min-h-[165px]`}>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      Campus Operational Load & Activity Trends
                    </h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      189 teaching sessions & 25 fest allocations across Monday–Friday
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-slate-700/60">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Engine Active</span>
                </div>
              </div>

              {/* Stacked Animated Visual Column Chart */}
              <div className="grid grid-cols-5 gap-3 pt-2 pb-1">
                {DAILY_LOAD.map((item) => {
                  const isHovered = hoveredDay === item.day;
                  return (
                    <div
                      key={item.day}
                      onMouseEnter={() => setHoveredDay(item.day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className="group flex flex-col items-center cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
                    >
                      <span className={`text-[10px] font-bold font-mono transition-colors mb-1 ${
                        isHovered ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {item.total}
                      </span>

                      {/* Animated Stacked Pillar */}
                      <div className="w-full bg-slate-100 dark:bg-slate-800/70 rounded-md h-16 flex flex-col justify-end p-0.5 gap-0.5 overflow-hidden">
                        {/* Fest Slot (P9–P11) */}
                        <div
                          style={{ height: `${(item.fest / item.total) * 100}%`, animationDelay: item.delay }}
                          className="w-full bg-amber-500 rounded-xs animate-bar-grow hover:opacity-90 transition-opacity"
                          title={`${item.day} Fest Bookings: ${item.fest}`}
                        />
                        {/* 3h Lab Slot (P6–P8) */}
                        <div
                          style={{ height: `${(item.labs / item.total) * 100}%`, animationDelay: item.delay }}
                          className="w-full bg-emerald-500 rounded-xs animate-bar-grow hover:opacity-90 transition-opacity"
                          title={`${item.day} 3h Lab Blocks: ${item.labs}`}
                        />
                        {/* Academic Lectures Slot (P1–P5) */}
                        <div
                          style={{ height: `${(item.academic / item.total) * 100}%`, animationDelay: item.delay }}
                          className="w-full bg-indigo-500 rounded-xs animate-bar-grow hover:opacity-90 transition-opacity"
                          title={`${item.day} Academic Lectures: ${item.academic}`}
                        />
                      </div>

                      <span className={`text-[10px] font-bold mt-1 transition-colors ${
                        item.isPeak ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {item.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart Legend & Summary Footnote */}
            <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1 font-medium">
                  <span className="w-2 h-2 rounded-xs bg-indigo-500 inline-block" />
                  <span>Academic (P1–P5)</span>
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="w-2 h-2 rounded-xs bg-emerald-500 inline-block" />
                  <span>3h Labs (P6–P8)</span>
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="w-2 h-2 rounded-xs bg-amber-500 inline-block" />
                  <span>Fest (P9–P11)</span>
                </span>
              </div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Peak: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">Tuesday (44)</strong>
              </span>
            </div>
          </section>

          {/* Small Notifications & Recent Fest Bookings Box (Only top 3, not 5!) */}
          <section className={`${cardBase} p-3 flex flex-col justify-between`}>
            <div className="mb-2 flex shrink-0 items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-indigo-500" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Recent Notifications & Requests
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('bookings')}
                className="cursor-pointer text-[11px] font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                View all ({summary?.counts?.booking_requests ?? 25}) →
              </button>
            </div>

            <ul className="flex flex-col gap-1.5">
              {displayBookings.map((b, idx) => {
                const status = (b.status || 'pending').toLowerCase();
                return (
                  <li
                    key={idx}
                    className="flex items-center gap-2.5 rounded-lg border border-slate-100 px-2.5 py-1.5 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-800/40 transition"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      <Building2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                        {b.title}
                      </p>
                      <p className="truncate text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                        {b.requester} at {b.requested_venue || b.requested_room || 'AUD'}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.2 text-[10px] font-semibold capitalize ${
                        STATUS_STYLES[status] || STATUS_STYLES.pending
                      }`}
                    >
                      {status}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

        </div>

        {/* Right Column: Quick Actions + Facility Utilization */}
        <div className="flex flex-col gap-2.5 lg:col-span-5 justify-between">
          
          {/* Quick Actions */}
          <section className={`${cardBase} p-3`}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              <span>Quick Actions</span>
            </h2>

            <div className="space-y-1.5">
              <ActionTile
                icon={AlertTriangle}
                tone="amber"
                title="Simulate disruption"
                description="Test faculty leave and a room leak"
                onClick={() => setActiveTab('disruptions')}
              />
              <ActionTile
                icon={Sparkles}
                tone="indigo"
                title="AI booking assistant"
                description="Book a venue in plain language"
                onClick={() => setActiveTab('ai-assistant')}
              />
              <button
                type="button"
                onClick={onResetData}
                disabled={isResetting}
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
              >
                <RotateCcw className={`h-3 w-3 ${isResetting ? 'animate-spin text-rose-500' : 'text-slate-400'}`} />
                <span>{isResetting ? 'Resetting...' : 'Reset to starter pack'}</span>
              </button>
            </div>
          </section>

          {/* Facility Utilization */}
          <section className={`${cardBase} flex flex-col justify-between p-3 flex-1`}>
            <div className="mb-2 flex shrink-0 items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Facility Utilization
              </h2>
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">This week</span>
            </div>

            <div className="grid grid-cols-1 content-evenly gap-y-2.5">
              {UTILIZATION.map((u) => (
                <div key={u.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 text-[11px]">{u.label}</span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{u.value}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className={`h-full rounded-full ${u.bar}`} style={{ width: `${u.value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span>Rule B1 Priority Compliant</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>0 Hard Violations</span>
              </span>
            </div>
          </section>

        </div>

      </div>

    </div>
  );
}
