'use client';

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
  ArrowRight
} from 'lucide-react';

export default function ClubMyBookingsView({ setActiveTab }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    try {
      const res = await fetch('/api/bookings');
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
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          by: 'Dramatics Society Lead',
          note: 'Cancelled by requester per Section 4'
        }),
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

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <CalendarCheck2 className="w-5 h-5 text-emerald-600" />
            <span>My Venue Bookings & Approvals</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rule Section 4: "Club representative sees the status and reason for each request and can cancel venue requests."
          </p>
        </div>

        <button
          onClick={() => setActiveTab('new-venue-booking')}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center space-x-1.5 shadow-sm"
        >
          <span>Submit Another Request</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Bookings List Cards */}
      <div className="space-y-3">
        {bookings.map((b) => {
          const reqId = b._id || b.id;
          const isCancelled = b.status === 'cancelled';
          const isApproved = b.status === 'approved';
          const isRejected = b.status === 'rejected';

          return (
            <div
              key={reqId}
              className={`p-5 rounded-2xl border transition ${
                isCancelled
                  ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                  : isApproved
                  ? 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800/60 shadow-sm'
                  : isRejected
                  ? 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-800/60 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold font-mono text-xs text-slate-800 dark:text-slate-200">{reqId}</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{b.title}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                      isApproved ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                      isRejected ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                      isCancelled ? 'bg-slate-200 text-slate-600 line-through' :
                      'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                      {b.status || 'Pending'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
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
                      className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-800 transition flex items-center space-x-1.5"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>{cancellingId === reqId ? 'Cancelling...' : 'Cancel Request'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Decision Justification / Room Assignment Callout */}
              {(b.decision_reason || isCancelled || isApproved) && (
                <div className={`mt-3 p-3 rounded-xl text-xs flex items-start space-x-2 ${
                  isApproved ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60' :
                  isRejected ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800/60' :
                  'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {isApproved ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> :
                   isRejected ? <XCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" /> :
                   <Ban className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />}
                  <div>
                    <span className="font-bold">
                      {isApproved ? 'Official Dean Approval & Room Allocation:' :
                       isRejected ? 'Official Rejection Reason:' :
                       'Cancellation Note (Rule B3):'}
                    </span>
                    <p className="mt-0.5 text-[11px] leading-relaxed">
                      {b.decision_reason || (isApproved ? 'Allocated slot confirmed by Dean Academic Office without academic class conflict.' : 'Cancelled per club representative withdrawal.')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
