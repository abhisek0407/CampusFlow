'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import {
  Users,
  Calendar,
  Building2,
  PlusCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ban,
  Search,
  X
} from 'lucide-react';

// ── Toast Notification Component ─────────────────────────────────
function Toast({ toast, onDismiss }) {
  const styles = {
    success: {
      bg: 'bg-emerald-950/95 border-emerald-500 text-emerald-100 shadow-emerald-900/30',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />,
      titleColor: 'text-emerald-300',
    },
    error: {
      bg: 'bg-rose-950/95 border-rose-500 text-rose-100 shadow-rose-900/30',
      icon: <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />,
      titleColor: 'text-rose-300',
    },
    info: {
      bg: 'bg-indigo-950/95 border-indigo-500 text-indigo-100 shadow-indigo-900/30',
      icon: <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />,
      titleColor: 'text-indigo-300',
    },
  };
  const current = styles[toast.type] || styles.info;

  return (
    <div className={`p-3 rounded-xl border backdrop-blur-md shadow-2xl flex items-start gap-2.5 transition-all duration-300 pointer-events-auto animate-in slide-in-from-top-3 ${current.bg}`}>
      {current.icon}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <div className={`text-xs font-bold flex items-center gap-1.5 mb-0.5 ${current.titleColor}`}>
            <span>{toast.title}</span>
          </div>
        )}
        <p className="text-[11px] leading-snug opacity-95 break-words text-slate-100">
          {toast.message}
        </p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="opacity-60 hover:opacity-100 text-white p-0.5 rounded transition shrink-0 cursor-pointer"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-5 right-6 z-[9999] flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

const DEFAULT_HISTORY = [
  {
    _id: 'BR-14',
    title: 'Spectra Open Mic & Standup Poetry',
    requester: 'Dramatics Society',
    requested_room: 'SH-2',
    day: 'WED',
    start_period: 11,
    duration_periods: 2,
    attendance: 90,
    status: 'approved',
    decision_reason: 'Allocated by Autonomous Fest Scheduler (Benchmark Ceiling 67.0)',
  },
  {
    _id: 'BR-15',
    title: 'Spectra Jam Night',
    requester: 'Dramatics Society',
    requested_room: 'AUD',
    day: 'FRI',
    start_period: 10,
    duration_periods: 3,
    attendance: 300,
    status: 'approved',
    decision_reason: 'Allocated by Autonomous Fest Scheduler (Benchmark Ceiling 67.0)',
  },
  {
    _id: 'BR-01',
    title: 'Spectra Inaugural Stage Play & Musical Drama',
    requester: 'Dramatics Society',
    requested_room: 'AUD',
    day: 'THU',
    start_period: 10,
    duration_periods: 3,
    attendance: 450,
    status: 'pending',
    decision_reason: 'Awaiting final administrative clearance from Dean of Academic Affairs',
  },
  {
    _id: 'BR-12',
    title: 'Street Theatre Prelims & Sound Check',
    requester: 'Dramatics Society',
    requested_room: 'LH-1',
    day: 'TUE',
    start_period: 9,
    duration_periods: 1,
    attendance: 200,
    status: 'approved',
    decision_reason: 'Allocated: LH-1 on TUE (Period 9)',
  },
  {
    _id: 'BR-07',
    title: 'Backstage Prop & Lighting Rehearsal',
    requester: 'Dramatics Society',
    requested_room: 'CR-101',
    day: 'MON',
    start_period: 3,
    duration_periods: 1,
    attendance: 35,
    status: 'cancelled',
    decision_reason: 'Withdrawn by club representative (Rule B3 strictly non-schedulable)',
  },
];

export default function ClubOverviewView({ setActiveTab }) {
  const [bookings, setBookings] = useState(DEFAULT_HISTORY);
  const [bookingDropdownOpen, setBookingDropdownOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const ROWS_PER_PAGE = 4;
  const clubName = 'Dramatics Society';

  const addToast = useCallback((type, title, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    apiFetch('/api/bookings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.bookings) {
          const clubOnly = data.bookings.filter(
            (b) =>
              b.role === 'club' ||
              b.requester?.includes('Dramatics') ||
              b.title?.toLowerCase().includes('drama') ||
              b.title?.toLowerCase().includes('play') ||
              b.title?.toLowerCase().includes('theatre') ||
              b.title?.toLowerCase().includes('spectra')
          );
          if (clubOnly.length > 0) setBookings(clubOnly);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  async function handleCancel(bookingId) {
    if (!confirm(`Are you sure you want to withdraw booking request ${bookingId}? (Rule B3: Withdrawn requests are strictly non-schedulable)`)) {
      return;
    }

    try {
      const res = await apiFetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: bookingId,
          booking_id: bookingId,
          cancelled_by: 'Dramatics Society Lead',
          by: 'Dramatics Society Lead',
          note: 'Withdrawn by club representative',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBookings((prev) =>
          prev.map((b) => (b._id === bookingId ? { ...b, status: 'cancelled', decision_reason: 'Withdrawn by club representative (Rule B3)' } : b))
        );
        addToast(
          'info',
          'Booking Withdrawn',
          `Booking ${bookingId} successfully withdrawn. In accordance with Rule B3, this request is now non-schedulable.`
        );
      }
    } catch (e) {
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, status: 'cancelled' } : b))
      );
      addToast('info', 'Booking Withdrawn', `Booking ${bookingId} marked as withdrawn.`);
    }
  }

  // Counts
  const total = bookings.length;
  const approved = bookings.filter((b) => b.status === 'approved').length;
  const pending = bookings.filter((b) => b.status === 'pending').length;
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length;

  // Filter & Pagination
  const filteredBookings = bookings.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.title?.toLowerCase().includes(q) ||
      b._id?.toLowerCase().includes(q) ||
      b.requested_room?.toLowerCase().includes(q) ||
      b.status?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBookings = filteredBookings.slice(
    (safePage - 1) * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE
  );

  function truncate(str, max = 35) {
    if (!str) return '—';
    return str.length > max ? `${str.slice(0, max)}...` : str;
  }

  return (
    <div className="space-y-2.5 font-sans pb-4">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ── 1. Clean Unboxed Header with Single "Booking" Dropdown at Top Right ─ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            {/* <span>Chilika Institute of Technology</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Spectra Tech Fest</span>
            <span>•</span>
            <span className="text-slate-400">Club Representative Portal</span> */}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            {clubName}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Submit venue requests in natural English or Hinglish, track Dean review status, and manage Spectra fest slots.
          </p>
        </div>

        {/* Top Right Single "Booking" Button with Dropdown Menu */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setBookingDropdownOpen(!bookingDropdownOpen)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Booking Options</span>
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          </button>

          {bookingDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setBookingDropdownOpen(false);
                  setActiveTab('new-venue-booking');
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>New Venue Booking</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBookingDropdownOpen(false);
                  // Focus onto tracking table
                  const el = document.getElementById('club-tracking-table');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition cursor-pointer border-t border-slate-100 dark:border-slate-800"
              >
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Track Bookings History</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Info in Small Tags (Large boxes completely removed) ──────────── */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5 pb-0.5">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
          <span className="text-[10px] uppercase text-slate-400 font-bold">Total Requests:</span>
          <span className="font-bold">{total}</span>
        </span>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span className="text-[10px] uppercase font-bold">Approved Venues:</span>
          <span className="font-bold">{approved}</span>
        </span>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          <span className="text-[10px] uppercase font-bold">Pending Review:</span>
          <span className="font-bold">{pending}</span>
        </span>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold">
          <span className="text-[10px] uppercase font-bold">Withdrawn (Rule B3):</span>
          <span className="font-bold">{cancelled}</span>
        </span>
      </div>

      {/* ── 3. Room Allocation Priority in a Small Box Only ─────────────────── */}
      <div className="bg-white dark:bg-[#111625] rounded-xl border border-slate-200/90 dark:border-slate-800/80 px-3.5 py-2 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Allocation Priority Hierarchy (Rule B1):
            </span>
          </div>

          {/* Compact Horizontal Priority Sequence */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              1. Exams (50% halved)
            </span>
            <span className="text-slate-400">›</span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              2. Academic Classes
            </span>
            <span className="text-slate-400">›</span>
            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              3. Institute (5p)
            </span>
            <span className="text-slate-400">›</span>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              4. Guest (4p)
            </span>
            <span className="text-slate-400">›</span>
            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              5. Dept (3p)
            </span>
            <span className="text-slate-400">›</span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              6. Club (2p)
            </span>
          </div>
        </div>
      </div>

      {/* ── 4. Main Table: Booking History & Live Tracking Table ───────────── */}
      <div id="club-tracking-table" className="bg-white dark:bg-[#0b0f19] rounded-xl border border-slate-200/90 dark:border-slate-800/80 p-3 shadow-xs overflow-hidden">
        
        {/* Table Title Bar with Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Booking History &amp; Venue Tracking ({filteredBookings.length})
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, ID, venue, status..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Dark, Bold Table Header */}
            <thead className="bg-slate-100/90 dark:bg-slate-900/90 text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white w-20">Req ID</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Event Title</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white w-24">Venue</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Slot / Day</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white w-18">Pax</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Status</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Decision / Reason</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white text-center w-20">Action</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {paginatedBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                    No booking records found matching search filters.
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((b) => {
                  const day = b.assigned_day || b.day || b.windows?.[0]?.day || 'MON';
                  const startP = b.assigned_start_period || b.start_period || b.windows?.[0]?.from_period || 10;
                  const dur = b.duration_periods || 2;
                  const endP = startP + dur - 1;
                  const venue = b.assigned_room || b.requested_room || 'AUD';
                  const isPending = b.status === 'pending';
                  const isApproved = b.status === 'approved';
                  const isCancelled = b.status === 'cancelled';
                  const isRejected = b.status === 'rejected';

                  return (
                    <tr key={b._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      {/* 1. Req ID */}
                      <td className="py-2 px-3 font-bold font-mono text-slate-900 dark:text-white">
                        {b._id}
                      </td>

                      {/* 2. Event Title */}
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white max-w-[200px] truncate" title={b.title}>
                        {b.title}
                      </td>

                      {/* 3. Venue */}
                      <td className="py-2 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {venue}
                      </td>

                      {/* 4. Slot / Day */}
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {day} P{startP}–P{endP} ({dur}h)
                      </td>

                      {/* 5. Pax */}
                      <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {b.attendance} <span className="text-[10px] text-slate-400">pax</span>
                      </td>

                      {/* 6. Status */}
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                              : isPending
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                              : isRejected
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {isApproved && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {isPending && <Clock className="w-2.5 h-2.5" />}
                          {isCancelled && <Ban className="w-2.5 h-2.5" />}
                          <span>{b.status}</span>
                        </span>
                      </td>

                      {/* 7. Decision / Reason with tooltip */}
                      <td
                        className="py-2 px-3 text-slate-600 dark:text-slate-400 max-w-[220px]"
                        title={b.decision_reason || 'Under review'}
                      >
                        <span className="cursor-help">
                          {truncate(b.decision_reason || 'Awaiting slot review by Dean', 35)}
                        </span>
                      </td>

                      {/* 8. Action (Withdraw if pending) */}
                      <td className="py-2 px-3 text-center">
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => handleCancel(b._id)}
                            className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold transition cursor-pointer"
                            title="Withdraw booking request (Rule B3)"
                          >
                            Withdraw
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Archived</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="pt-2 mt-1 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums">
            Showing {filteredBookings.length === 0 ? 0 : (safePage - 1) * ROWS_PER_PAGE + 1}–{Math.min(safePage * ROWS_PER_PAGE, filteredBookings.length)} of {filteredBookings.length} bookings
          </span>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => setCurrentPage(num)}
                className={`min-w-[28px] h-6 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  safePage === num
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {num}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
