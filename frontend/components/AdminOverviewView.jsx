'use client';

import React, { useState, useEffect } from 'react';
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
  { title: 'Hackathon Opening Session', requester: 'Coding Club', requested_venue: 'AUD', status: 'approved' },
  { title: 'Battle of Bands', requester: 'Music Society', requested_venue: 'OAT', status: 'approved' },
];

const cardBase =
  'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';

const btnBase =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500';

const btnOutline = `${btnBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`;

function StatCard({ icon: Icon, label, value, note, tone }) {
  return (
    <div className={`${cardBase} flex items-center gap-3 px-4 py-3`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-xl font-semibold leading-tight text-slate-900 dark:text-white">{value}</p>
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
      className="group flex w-full cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left transition hover:border-indigo-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:hover:border-indigo-500/50 dark:hover:bg-slate-800/60"
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${TONES[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{title}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-indigo-500" />
    </button>
  );
}

export default function AdminOverviewView({ setActiveTab, onResetData, isResetting }) {
  const [summary, setSummary] = useState(null);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [sumRes, bookRes] = await Promise.all([
          fetch('/api/dataset/summary'),
          fetch('/api/bookings'),
        ]);
        const sumData = await sumRes.json();
        const bookData = await bookRes.json();

        if (sumData.success) setSummary(sumData);
        if (bookData.success && bookData.bookings) {
          setBookings(bookData.bookings.slice(0, 5));
        }
      } catch (e) {
        console.error('Failed to load dashboard data:', e);
      }
    }
    loadData();
  }, []);

  const counts = summary?.counts || FALLBACK_COUNTS;
  const displayBookings = bookings.length > 0 ? bookings : FALLBACK_BOOKINGS;

  const stats = [
    { icon: DoorOpen, label: 'Venues', value: counts.rooms, note: 'All active', tone: 'indigo' },
    { icon: Users, label: 'Faculty', value: counts.faculty, note: 'No overloads', tone: 'emerald' },
    { icon: Calendar, label: 'Sessions', value: counts.sessions, note: 'No clashes', tone: 'violet' },
    { icon: Sparkles, label: 'Fest bookings', value: counts.booking_requests ?? 25, note: 'Score 67.0', tone: 'amber' },
  ];

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-4">
      {/* Header */}
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chilika Institute of Technology, Autumn 2026-27
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('timetable')}
            className={`${btnBase} bg-indigo-600 text-white shadow-sm hover:bg-indigo-500`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Weekly timetable
          </button>
          <button type="button" onClick={() => setActiveTab('bookings')} className={btnOutline}>
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            Review bookings
          </button>
          <button type="button" onClick={() => setActiveTab('dataset')} className={btnOutline}>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Run validator
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Panels: fill the remaining height, never overflow */}
      <div className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-12 lg:grid-rows-1">
        {/* Recent bookings */}
        <section className={`${cardBase} flex min-h-0 flex-col overflow-hidden p-4 lg:col-span-7`}>
          <div className="mb-3 flex shrink-0 items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Recent fest bookings
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('bookings')}
              className="cursor-pointer text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              View all
            </button>
          </div>

          <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
            {displayBookings.map((b, idx) => {
              const status = (b.status || 'approved').toLowerCase();
              return (
                <li
                  key={idx}
                  className="flex min-h-0 flex-1 items-center gap-3 rounded-lg border border-slate-100 px-3 dark:border-slate-800"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {b.title}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {b.requester} at {b.requested_venue || 'AUD'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
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

        {/* Right column */}
        <div className="flex min-h-0 flex-col gap-4 lg:col-span-5">
          {/* Quick actions */}
          <section className={`${cardBase} shrink-0 p-4`}>
            <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
              Quick actions
            </h2>

            <div className="space-y-2">
              <ActionTile
                icon={AlertTriangle}
                tone="amber"
                title="Simulate disruption"
                description="Test faculty leave and a room leak"
                onClick={() => setActiveTab('disruptions')}
              />
              <ActionTile
                icon={Cpu}
                tone="indigo"
                title="AI booking assistant"
                description="Book a venue in plain language"
                onClick={() => setActiveTab('ai-assistant')}
              />
              <button
                type="button"
                onClick={onResetData}
                disabled={isResetting}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? 'animate-spin text-rose-500' : 'text-slate-400'}`} />
                {isResetting ? 'Resetting...' : 'Reset to starter pack'}
              </button>
            </div>
          </section>

          {/* Facility utilization */}
          <section className={`${cardBase} flex min-h-0 flex-1 flex-col overflow-hidden p-4`}>
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Facility utilization
              </h2>
              <span className="text-xs text-slate-400">This week</span>
            </div>

            {/* 1 column when there is room, 2 columns on short screens */}
            <div className="grid min-h-0 flex-1 grid-cols-1 content-evenly gap-x-6 gap-y-3 [@media(max-height:900px)]:grid-cols-2">
              {UTILIZATION.map((u) => (
                <div key={u.label}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300">{u.label}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{u.value}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className={`h-full rounded-full ${u.bar}`} style={{ width: `${u.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}