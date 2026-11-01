'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  User, 
  Plus, 
  Ban, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

const CATEGORY_WEIGHTS = {
  institute_event: { label: 'Institute Event', weight: 5, color: 'bg-rose-100 text-rose-800 border-rose-200' },
  guest_lecture: { label: 'Guest Lecture', weight: 4, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  department_event: { label: 'Dept Event', weight: 3, color: 'bg-amber-100 text-amber-800 border-amber-200' },
  club_event: { label: 'Club Event', weight: 2, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

const STATUS_BADGES = {
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800', icon: CheckCircle2 },
  alternative_offered: { label: 'Alternative Offered', color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800', icon: AlertCircle },
  rejected: { label: 'Rejected', color: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700', icon: Ban },
  pending: { label: 'Pending Review', color: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300', icon: Clock },
};

export default function BookingsView({ currentUser }) {
  const activeUser = currentUser || { role: 'admin', name: "Dean's Office (Admin)" };
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [actionModal, setActionModal] = useState(null); // { booking, type: 'approve'|'reject'|'alternative' }
  const [decisionReason, setDecisionReason] = useState('');
  const [altRoom, setAltRoom] = useState('AUD');
  const [altDay, setAltDay] = useState('MON');
  const [altStart, setAltStart] = useState(10);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    title: '',
    requester: '',
    role: 'club',
    requested_category: 'club_event',
    attendance: 100,
    duration_periods: 2,
    room_types: ['classroom', 'seminar_hall'],
    requested_room: 'SH-1',
    day: 'MON',
    from_period: 10,
    to_period: 11,
  });

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings || []);
      }
    } catch (e) {
      console.error('Failed to load bookings:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDecisionSubmit() {
    if (!actionModal) return;
    try {
      const payload = {
        request_id: actionModal.booking._id,
        status: actionModal.type === 'alternative' ? 'alternative_offered' : (actionModal.type === 'approve' ? 'approved' : 'rejected'),
        decision_reason: decisionReason || `${actionModal.type.toUpperCase()} by ${activeUser.name}`,
        assigned_day: actionModal.type === 'alternative' ? altDay : actionModal.booking.assigned_day || 'MON',
        assigned_start_period: actionModal.type === 'alternative' ? Number(altStart) : actionModal.booking.assigned_start_period || 10,
        assigned_end_period: actionModal.type === 'alternative' ? Number(altStart) + actionModal.booking.duration_periods - 1 : 11,
        assigned_room: actionModal.type === 'alternative' ? altRoom : actionModal.booking.assigned_room || 'AUD',
        reviewer_name: activeUser.name,
      };

      const res = await fetch('/api/bookings/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setActionModal(null);
        setDecisionReason('');
        fetchBookings();
      } else {
        alert(data.error || 'Decision failed');
      }
    } catch (e) {
      console.error('Decision error:', e);
    }
  }

  async function handleCancelBooking(requestId) {
    if (!confirm(`Are you sure you want to cancel ${requestId}? (Rule B3 enforces that cancelled bookings cannot be approved)`)) return;
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, note: 'Cancelled via Portal by Club' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchBookings();
      }
    } catch (e) {
      console.error('Cancel error:', e);
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        title: manualForm.title,
        requester: currentUser?.name || manualForm.requester || 'Club Rep',
        role: currentUser?.role || manualForm.role,
        requested_category: manualForm.requested_category,
        attendance: Number(manualForm.attendance),
        duration_periods: Number(manualForm.duration_periods),
        room_types: manualForm.room_types,
        requested_room: manualForm.requested_room,
        windows: [{ day: manualForm.day, from_period: Number(manualForm.from_period), to_period: Number(manualForm.to_period) }],
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowManualModal(false);
        fetchBookings();
      } else {
        alert(data.error || 'Failed to submit booking');
      }
    } catch (e) {
      console.error('Submit error:', e);
    }
  }

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch = b.title?.toLowerCase().includes(search.toLowerCase()) || 
                          b._id?.toLowerCase().includes(search.toLowerCase()) ||
                          b.requester?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || b.requested_category === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || b.status === selectedStatus;
    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Unified Professional Header & Action Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Spectra Fest Venue Management</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              25 Fest Venue Requests • 67.0 Benchmark Score (Ceiling) • Priority Compliant (Admin &gt; Faculty &gt; Coord &gt; Club)
            </p>
          </div>

          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Venue Request</span>
          </button>
        </div>

        {/* Filter and Search Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, ID (BR-01), or requester..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="institute_event">Institute Events (5 pts)</option>
            <option value="guest_lecture">Guest Lectures (4 pts)</option>
            <option value="department_event">Department Events (3 pts)</option>
            <option value="club_event">Club Events (2 pts)</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="alternative_offered">Alternative Offered</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled (B3)</option>
          </select>

          <span className="text-xs text-slate-400 ml-auto font-medium">
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredBookings.length}</strong> of {bookings.length} requests
          </span>
        </div>
      </div>

      {/* Bookings Card List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBookings.map((b) => {
          const catInfo = CATEGORY_WEIGHTS[b.requested_category] || CATEGORY_WEIGHTS.club_event;
          const statusInfo = STATUS_BADGES[b.status] || STATUS_BADGES.pending;
          const StatusIcon = statusInfo.icon;
          const canManage = activeUser.role === 'admin' || activeUser.role === 'department_coordinator';

          return (
            <div
              key={b._id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between"
            >
              <div>
                {/* Header: ID, Weight, Status */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                      {b._id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catInfo.color}`}>
                      {catInfo.label} (+{catInfo.weight} pts)
                    </span>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusInfo.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{statusInfo.label}</span>
                  </span>
                </div>

                {/* Title & Requester */}
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {b.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>{b.requester}</span>
                  <span className="text-slate-300">•</span>
                  <span className="capitalize">{b.role}</span>
                </p>

                {/* Logistics Badges */}
                <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Attendance</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{b.attendance} people</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Duration</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{b.duration_periods} periods ({b.duration_periods} hrs)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Requested Room</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{b.requested_room || b.room_types?.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Allocated Slot</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {b.assigned_room ? `${b.assigned_room} (${b.assigned_day} P${b.assigned_start_period})` : 'None'}
                    </span>
                  </div>
                </div>

                {/* Decision Reason */}
                {b.decision_reason && (
                  <div className="mt-2.5 p-2 rounded-lg bg-slate-100/70 dark:bg-slate-800/40 text-[11px] text-slate-600 dark:text-slate-300 italic border-l-2 border-indigo-500">
                    "{b.decision_reason}"
                  </div>
                )}
              </div>

              {/* Bottom Actions based on Role */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                {canManage ? (
                  <div className="flex items-center space-x-1.5 w-full">
                    <button
                      onClick={() => setActionModal({ booking: b, type: 'approve' })}
                      className="flex-1 py-1 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800 transition text-center"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setActionModal({ booking: b, type: 'alternative' })}
                      className="flex-1 py-1 px-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 text-[11px] font-semibold border border-amber-200 dark:border-amber-800 transition text-center"
                    >
                      Alternative
                    </button>
                    <button
                      onClick={() => setActionModal({ booking: b, type: 'reject' })}
                      className="flex-1 py-1 px-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-[11px] font-semibold border border-rose-200 dark:border-rose-800 transition text-center"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  b.status !== 'cancelled' && (
                    <button
                      onClick={() => handleCancelBooking(b._id)}
                      className="w-full py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Cancel My Booking (Rule B3)</span>
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Decision Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
              {actionModal.type} Request: {actionModal.booking._id} ({actionModal.booking.title})
            </h3>

            {actionModal.type === 'alternative' && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1">Room</label>
                  <select
                    value={altRoom}
                    onChange={(e) => setAltRoom(e.target.value)}
                    className="w-full p-2 bg-slate-50 border rounded-lg font-medium"
                  >
                    <option value="AUD">Main AUD (500)</option>
                    <option value="SH-1">Seminar Hall 1 (150)</option>
                    <option value="SH-2">Seminar Hall 2 (100)</option>
                    <option value="OAT">Open Air Theatre (800)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Day</label>
                  <select
                    value={altDay}
                    onChange={(e) => setAltDay(e.target.value)}
                    className="w-full p-2 bg-slate-50 border rounded-lg font-medium"
                  >
                    <option value="MON">Monday</option>
                    <option value="TUE">Tuesday</option>
                    <option value="WED">Wednesday</option>
                    <option value="THU">Thursday</option>
                    <option value="FRI">Friday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Start Period</label>
                  <select
                    value={altStart}
                    onChange={(e) => setAltStart(e.target.value)}
                    className="w-full p-2 bg-slate-50 border rounded-lg font-medium"
                  >
                    <option value={10}>P10 (18:00)</option>
                    <option value={11}>P11 (19:00)</option>
                    <option value={12}>P12 (20:00)</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Official Administrative Justification / Reason:
              </label>
              <textarea
                rows={3}
                placeholder="Enter justification explaining why this decision was made..."
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDecisionSubmit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700"
              >
                Confirm Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Request Modal (Requirement 10) */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <form onSubmit={handleManualSubmit} className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Manual Venue Booking Request (Hard Constraint Checked)
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Annual Coding Hackathon Closing Ceremony"
                  value={manualForm.title}
                  onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Event Category</label>
                  <select
                    value={manualForm.requested_category}
                    onChange={(e) => setManualForm({ ...manualForm, requested_category: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="club_event">Club Event</option>
                    <option value="department_event">Department Event</option>
                    <option value="guest_lecture">Guest Lecture</option>
                    <option value="institute_event">Institute Event</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Expected Attendance</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={800}
                    value={manualForm.attendance}
                    onChange={(e) => setManualForm({ ...manualForm, attendance: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Day</label>
                  <select
                    value={manualForm.day}
                    onChange={(e) => setManualForm({ ...manualForm, day: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="MON">Monday</option>
                    <option value="TUE">Tuesday</option>
                    <option value="WED">Wednesday</option>
                    <option value="THU">Thursday</option>
                    <option value="FRI">Friday</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Start Period</label>
                  <select
                    value={manualForm.from_period}
                    onChange={(e) => setManualForm({ ...manualForm, from_period: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((p) => (
                      <option key={p} value={p}>P{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Duration (Hours)</label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={manualForm.duration_periods}
                    onChange={(e) => setManualForm({ ...manualForm, duration_periods: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700"
              >
                Validate & Submit
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
