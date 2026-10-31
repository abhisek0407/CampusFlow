'use client';

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
  DoorOpen
} from 'lucide-react';

export default function DepartmentBookingsView() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [actionType, setActionType] = useState('approve');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    try {
      const res = await fetch('/api/bookings');
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
      const res = await fetch('/api/bookings/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: selectedBooking._id || selectedBooking.id,
          decision: actionType, // 'approved' or 'rejected'
          reason: decisionReason || (actionType === 'approved' ? 'Approved by CSE Department Coordinator' : 'Denied due to lab equipment maintenance'),
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

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-amber-600" />
            <span>Department Lab Venue Approvals</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rule Section 4: "Department Coordinator approves bookings of their department's labs."
          </p>
        </div>

        <span className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold">
          CSE Computing Facility Authority
        </span>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Bookings Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3">Event Title</th>
                <th className="px-4 py-3">Requester</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Expected Size</th>
                <th className="px-4 py-3">Preferred Room / Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {bookings.map((b) => {
                const reqId = b._id || b.id;
                return (
                  <tr key={reqId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-bold font-mono text-slate-900 dark:text-slate-100">{reqId}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{b.title}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{b.requester}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {b.requested_category?.replace('_', ' ') || 'event'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{b.attendance} attendees</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {b.requested_room || (b.room_types && b.room_types.join(', ')) || 'Any Lab'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase ${
                        b.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        b.status === 'rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                        b.status === 'cancelled' ? 'bg-slate-100 text-slate-500 line-through' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {b.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {b.status !== 'cancelled' ? (
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setActionType('approved');
                            setDecisionReason('');
                          }}
                          className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] border border-indigo-200 dark:border-indigo-800"
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
      </div>

      {/* Decision Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Department Lab Decision: {selectedBooking._id || selectedBooking.id}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{selectedBooking.title} • {selectedBooking.requester}</p>
            </div>

            <form onSubmit={handleDecide} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Coordinator Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActionType('approved')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      actionType === 'approved'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Lab Slot</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType('rejected')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      actionType === 'rejected'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Request</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Justification / Reason (Required)
                </label>
                <textarea
                  required
                  rows={3}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder={
                    actionType === 'approved'
                      ? 'Approved. Equipment setup permitted between 18:00–21:00.'
                      : 'Rejected. Regular CSE 3-hour laboratory session in progress.'
                  }
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Submit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
