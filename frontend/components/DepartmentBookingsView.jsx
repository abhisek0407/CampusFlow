'use client';
import { apiFetch } from '@/lib/api';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  Search,
  Filter,
  ShieldCheck,
  DoorOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function DepartmentBookingsView() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [actionType, setActionType] = useState('approve');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 7;

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    try {
      const res = await apiFetch('/api/bookings');
      const data = await res.json();
      if (data.success && data.bookings) {
        // Filter bookings requesting lab spaces or department rooms
        const labBookings = data.bookings.filter(b => 
          (b.room_types && b.room_types.some(t => t.includes('lab'))) ||
          (b.requested_room && b.requested_room.includes('Lab')) ||
          b.role === 'department_coordinator' ||
          b.requester?.includes('CSE') ||
          b.title?.toLowerCase().includes('hackathon') ||
          b.title?.toLowerCase().includes('coding')
        );
        setBookings(labBookings.length > 0 ? labBookings : data.bookings.slice(0, 10));
      }
    } catch (e) {
      console.error('Failed to load bookings:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDecide(e) {
    e.preventDefault();
    if (!selectedBooking) return;
    setSubmitting(true);
    try {
      const reqId = selectedBooking._id || selectedBooking.id;
      const res = await apiFetch('/api/bookings/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: reqId,
          booking_id: reqId,
          status: actionType, // 'approved' or 'rejected'
          decision: actionType,
          decision_reason: decisionReason || (actionType === 'approved' ? 'Approved by CSE Department Coordinator' : 'Denied due to lab equipment maintenance'),
          reason: decisionReason || (actionType === 'approved' ? 'Approved by CSE Department Coordinator' : 'Denied due to lab equipment maintenance'),
          reviewer_name: 'Prof. Rajesh Sharma (Coordinator)',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Booking ${selectedBooking._id || selectedBooking.id} successfully updated!`);
        setSelectedBooking(null);
        fetchBookings();
        setTimeout(() => setSuccessMsg(null), 3500);
      } else {
        alert(data.error || 'Decision failed');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(bookings.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBookings = bookings.slice(
    (safePage - 1) * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE
  );

  return (
    <div className="space-y-2.5">
      
      {/* Header (Unboxed, Consistent text-xl) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>Department Lab Venue Approvals</span>
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Rule Section 4: "Department Coordinator approves bookings of their department's labs."
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold">
          CSE Computing Facility Authority
        </span>
      </div>

      {successMsg && (
        <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Bookings Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-3 py-2 text-[11px]">Request ID</th>
                <th className="px-3 py-2 text-[11px]">Event Title</th>
                <th className="px-3 py-2 text-[11px]">Requester</th>
                <th className="px-3 py-2 text-[11px]">Category</th>
                <th className="px-3 py-2 text-[11px]">Expected Size</th>
                <th className="px-3 py-2 text-[11px]">Preferred Room / Type</th>
                <th className="px-3 py-2 text-[11px]">Status</th>
                <th className="px-3 py-2 text-[11px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedBookings.map((b) => {
                const reqId = b._id || b.id;
                return (
                  <tr key={reqId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-3 py-1.5 font-bold font-mono text-slate-900 dark:text-slate-100">{reqId}</td>
                    <td className="px-3 py-1.5 font-semibold text-slate-800 dark:text-slate-200">{b.title}</td>
                    <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400 text-[11px]">{b.requester}</td>
                    <td className="px-3 py-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {b.requested_category?.replace('_', ' ') || 'event'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[11px]">{b.attendance} attendees</td>
                    <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
                      {b.requested_room || (b.room_types && b.room_types.join(', ')) || 'Any Lab'}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase ${
                        b.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        b.status === 'rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                        b.status === 'cancelled' ? 'bg-slate-100 text-slate-500 line-through' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {b.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {b.status !== 'cancelled' ? (
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setActionType('approved');
                            setDecisionReason('');
                          }}
                          className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-[10px] border border-indigo-200 dark:border-indigo-800"
                        >
                          Review & Decide
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[10px] italic">Cancelled (B3)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Showing {bookings.length === 0 ? 0 : (safePage - 1) * ROWS_PER_PAGE + 1}–{Math.min(safePage * ROWS_PER_PAGE, bookings.length)} of {bookings.length} requests
          </span>

          {totalPages > 1 && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  className={`min-w-[26px] h-6 px-1.5 rounded-md text-[11px] font-semibold transition ${
                    safePage === num
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Decision Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Department Lab Decision: {selectedBooking._id || selectedBooking.id}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{selectedBooking.title} • {selectedBooking.requester}</p>
            </div>

            <form onSubmit={handleDecide} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Coordinator Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActionType('approved')}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      actionType === 'approved'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Lab</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('rejected')}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      actionType === 'rejected'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Justification
                </label>
                <textarea
                  rows={2}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder={
                    actionType === 'approved'
                      ? 'Approved by CSE Department Coordinator for technical fest use.'
                      : 'Denied due to hardware maintenance or class slot conflict.'
                  }
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition"
                >
                  {submitting ? 'Saving...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
