'use client';
import { apiFetch } from '@/lib/api';

import React, { useState, useEffect } from 'react';
import {
  CalendarCheck2,
  Building2,
  Clock,
  DoorOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Ban,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function ClubMyBookingsView({ setActiveTab }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 4;

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    try {
      const res = await apiFetch('/api/bookings');
      const data = await res.json();
      if (data.success && data.bookings) {
        // Filter to club bookings (Dramatics Society or club role)
        const clubBookings = data.bookings.filter(b => 
          b.role === 'club' ||
          b.requester?.includes('Dramatics') ||
          b.title?.toLowerCase().includes('play') ||
          b.title?.toLowerCase().includes('drama') ||
          b.title?.toLowerCase().includes('street')
        );
        setBookings(clubBookings.length > 0 ? clubBookings : data.bookings.slice(0, 8));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(bookingId) {
    if (!confirm(`Are you sure you want to cancel booking ${bookingId}? (Rule B3: Withdrawn requests are strictly non-schedulable)`)) {
      return;
    }
    setCancellingId(bookingId);
    try {
      const res = await apiFetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: bookingId,
          booking_id: bookingId,
          cancelled_by: 'Dramatics Society Lead',
          by: 'Dramatics Society Lead',
          note: 'Cancelled from club self-service portal'
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg(`Booking ${bookingId} successfully withdrawn and cancelled.`);
        fetchBookings();
        setTimeout(() => setStatusMsg(null), 3500);
      } else {
        alert(data.error || 'Failed to cancel booking');
      }
    } catch (e) {
      alert('Network error cancelling booking');
    } finally {
      setCancellingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(bookings.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBookings = bookings.slice(
    (safePage - 1) * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE
  );

  return (
    <div className="space-y-6 animate-slide-up">
      
      {/* Header (Unboxed, Consistent text-xl) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>My Venue Bookings & Approvals</span>
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Rule Section 4: "Club representative sees the status and reason for each request and can cancel venue requests."
          </p>
        </div>

        <button
          onClick={() => setActiveTab('new-venue-booking')}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center space-x-1.5 shadow-xs"
        >
          <span>Submit Another Request</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {statusMsg && (
        <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Bookings List Cards */}
      <div className="space-y-2">
        {paginatedBookings.map((b) => {
          const reqId = b._id || b.id;
          const isCancelled = b.status === 'cancelled';
          const isApproved = b.status === 'approved';
          const isRejected = b.status === 'rejected';

          return (
            <div
              key={reqId}
              className={`p-5 rounded-2xl border transition-all duration-200 card-interactive ${
                isCancelled
                  ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                  : isApproved
                  ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800/60 shadow-xs'
                  : isRejected
                  ? 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-800/60 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold font-mono text-[11px] text-slate-800 dark:text-slate-200">{reqId}</span>
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{b.title}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                      isApproved ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                      isRejected ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                      isCancelled ? 'bg-slate-200 text-slate-600 line-through' :
                      'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                      {b.status || 'Pending'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>Attendance: <strong className="text-slate-700 dark:text-slate-300">{b.attendance}</strong></span>
                    <span>•</span>
                    <span>Duration: <strong className="text-slate-700 dark:text-slate-300">{b.duration_periods || 3}h</strong></span>
                    <span>•</span>
                    <span>Target Room: <strong className="text-slate-700 dark:text-slate-300">{b.requested_room || 'AUD-1 / OAT'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!isCancelled && (
                    <button
                      onClick={() => handleCancel(reqId)}
                      disabled={cancellingId === reqId}
                      title="Withdraw request (Rule B3)"
                      className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 active:scale-95 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-800 transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Ban className="w-3 h-3" />
                      <span>{cancellingId === reqId ? 'Cancelling...' : 'Cancel Request'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Decision Justification / Room Assignment Callout */}
              {(b.decision_reason || isCancelled || isApproved) && (
                <div className={`mt-2 p-2 rounded-lg text-[11px] flex items-start space-x-2 ${
                  isApproved ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60' :
                  isRejected ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800/60' :
                  'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {isApproved ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" /> :
                   isRejected ? <XCircle className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" /> :
                   <Ban className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />}
                  <div>
                    <span className="font-semibold">
                      {isApproved ? 'Official Venue Allocation: ' : isRejected ? 'Decision Justification: ' : 'Cancellation Record: '}
                    </span>
                    <span>{b.decision_reason || (isApproved ? `Allocated to ${b.assigned_room || 'Requested Venue'} on ${b.assigned_day || 'Spectra Week'}` : 'Withdrawn by club representative')}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Showing {(safePage - 1) * ROWS_PER_PAGE + 1}–{Math.min(safePage * ROWS_PER_PAGE, bookings.length)} of {bookings.length} bookings
          </span>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
              <button
                key={num}
                onClick={() => setCurrentPage(num)}
                className={`min-w-[26px] h-6 px-1.5 rounded-md text-[11px] font-semibold transition ${
                  safePage === num
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {num}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
