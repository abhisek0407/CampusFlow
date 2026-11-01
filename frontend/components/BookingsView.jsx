'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Users,
  Timer,
  X
} from 'lucide-react';

// ── Toast System ────────────────────────────────────────────────
function Toast({ toast, onDismiss }) {
  const styles = {
    success: {
      bg: 'bg-emerald-950/95 border-emerald-500 text-emerald-100 shadow-emerald-900/30',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
      titleColor: 'text-emerald-300',
    },
    error: {
      bg: 'bg-rose-950/95 border-rose-500 text-rose-100 shadow-rose-900/30',
      icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
      titleColor: 'text-rose-300',
    },
    warning: {
      bg: 'bg-amber-950/95 border-amber-500 text-amber-100 shadow-amber-900/30',
      icon: <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
      titleColor: 'text-amber-300',
    },
    info: {
      bg: 'bg-indigo-950/95 border-indigo-500 text-indigo-100 shadow-indigo-900/30',
      icon: <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />,
      titleColor: 'text-indigo-300',
    },
  };
  const current = styles[toast.type] || styles.info;

  return (
    <div className={`p-3.5 rounded-xl border backdrop-blur-md shadow-2xl flex items-start gap-3 transition-all duration-300 pointer-events-auto animate-in slide-in-from-top-3 ${current.bg}`}>
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
        className="opacity-60 hover:opacity-100 text-white p-0.5 rounded transition shrink-0"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-5 right-6 z-[9999] flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

const CATEGORY_WEIGHTS = {
  institute_event: { label: 'Institute Event', weight: 5, color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800', dot: 'bg-rose-500' },
  guest_lecture: { label: 'Guest Lecture', weight: 4, color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800', dot: 'bg-blue-500' },
  department_event: { label: 'Dept Event', weight: 3, color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800', dot: 'bg-amber-500' },
  club_event: { label: 'Club Event', weight: 2, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800', dot: 'bg-emerald-500' },
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
  const [actionModal, setActionModal] = useState(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [altRoom, setAltRoom] = useState('AUD');
  const [altDay, setAltDay] = useState('MON');
  const [altStart, setAltStart] = useState(10);
  const [showManualModal, setShowManualModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const CARDS_PER_PAGE = 8;
  const [toasts, setToasts] = useState([]);
  const [decidedIds, setDecidedIds] = useState(new Set());
  const [confirmModal, setConfirmModal] = useState(null);
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

  // Toast helpers with title and message
  const addToast = useCallback((type, titleOrMessage, optionalMessage) => {
    const id = Date.now() + Math.random();
    const title = optionalMessage !== undefined ? titleOrMessage : (type === 'success' ? 'Action Completed' : type === 'error' ? 'Action Failed' : 'Notice');
    const message = optionalMessage !== undefined ? optionalMessage : titleOrMessage;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);
  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

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
    const statusMap = { approve: 'approved', reject: 'rejected', alternative: 'alternative_offered' };
    const booking = actionModal.booking;
    const bId = booking._id;
    const bTitle = booking.title;
    const bRequester = booking.requester;
    const bRole = booking.role;
    const bType = actionModal.type;

    try {
      const assignedRoom = bType === 'alternative' ? altRoom : booking.assigned_room || booking.requested_room || 'Main AUD';
      const assignedDay = bType === 'alternative' ? altDay : booking.assigned_day || 'MON';
      const assignedStart = bType === 'alternative' ? Number(altStart) : booking.assigned_start_period || 10;
      const assignedEnd = bType === 'alternative' ? Number(altStart) + booking.duration_periods - 1 : (booking.assigned_end_period || 11);

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
        // Immediately disappear the card from the view
        setDecidedIds(prev => new Set([...prev, bId]));
        setBookings(prev => prev.filter(b => b._id !== bId));

        setActionModal(null);
        setDecisionReason('');

        // Rich toast message indicating exactly where it was allocated / sent
        if (bType === 'approve') {
          addToast(
            'success',
            `Approved & Dispatched (${bId})`,
            `Successfully approved "${bTitle}"! Allocated to ${assignedRoom} on ${assignedDay} (P${assignedStart}–P${assignedEnd}). Notification sent to ${bRequester} (${bRole}).`
          );
        } else if (bType === 'alternative') {
          addToast(
            'warning',
            `Alternative Offered (${bId})`,
            `Offered alternative for "${bTitle}": Reallocated to ${assignedRoom} on ${assignedDay} (P${assignedStart}–P${assignedEnd}). Sent to ${bRequester}.`
          );
        } else {
          addToast(
            'error',
            `Booking Rejected (${bId})`,
            `Request "${bTitle}" rejected. Official rejection notice dispatched to ${bRequester}.`
          );
        }

        fetchBookings();
      } else {
        addToast('error', 'Decision Failed', data.error || 'Failed to submit decision');
      }
    } catch (e) {
      console.error('Decision error:', e);
      addToast('error', 'Network Error', 'Could not submit decision. Check server status.');
    }
  }

  async function handleCancelBooking(requestId) {
    const targetBooking = bookings.find(b => b._id === requestId);
    if (!confirm(`Are you sure you want to cancel ${requestId}? (Rule B3 enforces that cancelled bookings cannot be approved)`)) return;
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, note: 'Cancelled via Portal by Club' }),
      });
      const data = await res.json();
      if (data.success) {
        setDecidedIds(prev => new Set([...prev, requestId]));
        setBookings(prev => prev.filter(b => b._id !== requestId));
        addToast(
          'info',
          `Booking Withdrawn (${requestId})`,
          `Booking "${targetBooking?.title || requestId}" withdrawn by ${targetBooking?.requester || 'Requester'}. Archived under Rule B3.`
        );
        fetchBookings();
      } else {
        addToast('error', 'Cancel Failed', data.error || 'Failed to cancel booking');
      }
    } catch (e) {
      console.error('Cancel error:', e);
      addToast('error', 'Network Error', 'Failed to cancel booking.');
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
        addToast('success', `Venue request "${manualForm.title}" submitted successfully!`);
        setShowManualModal(false);
        fetchBookings();
      } else {
        addToast('error', data.error || 'Failed to submit booking');
      }
    } catch (e) {
      console.error('Submit error:', e);
      addToast('error', 'Network error while submitting booking');
    }
  }

  const filteredBookings = bookings.filter((b) => {
    // In pending review mode, hide cards that were decided in this session
    if (selectedStatus === 'pending' && decidedIds.has(b._id)) {
      return false;
    }
    const matchesSearch = b.title?.toLowerCase().includes(search.toLowerCase()) || 
                          b._id?.toLowerCase().includes(search.toLowerCase()) ||
                          b.requester?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || b.requested_category === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || b.status === selectedStatus;
    return matchesSearch && matchesCat && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / CARDS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBookings = filteredBookings.slice(
    (safePage - 1) * CARDS_PER_PAGE,
    safePage * CARDS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [search, selectedCategory, selectedStatus]);

  return (
    <div className="space-y-2.5">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Spectra Fest Venue Management</span>
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            25 Fest Venue Requests • 67.0 Benchmark Score (Ceiling) • Priority Compliant (Admin &gt; Faculty &gt; Coord &gt; Club)
          </p>
        </div>
        <button
          onClick={() => setShowManualModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Submit Request</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#111625] rounded-xl p-2 border border-slate-200/90 dark:border-slate-800/80 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, ID, or requester..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none flex-1 sm:flex-none"
            >
              <option value="ALL">All Categories</option>
              <option value="institute_event">Institute (5p)</option>
              <option value="guest_lecture">Guest Lecture (4p)</option>
              <option value="department_event">Dept Event (3p)</option>
              <option value="club_event">Club Event (2p)</option>
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 focus:outline-none flex-1 sm:flex-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="alternative_offered">Alt Offered</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tabular-nums whitespace-nowrap hidden sm:inline px-1">
              {filteredBookings.length} / {bookings.length}
            </span>
          </div>
        </div>
      </div>

      {/* Card Grid — 2 rows of 4 cards on desktop, compact & non-scrollable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-2.5 gap-y-3.5">
        {paginatedBookings.map((b) => {
          const catInfo = CATEGORY_WEIGHTS[b.requested_category] || CATEGORY_WEIGHTS.club_event;
          const statusInfo = STATUS_BADGES[b.status] || STATUS_BADGES.pending;
          const StatusIcon = statusInfo.icon;
          const canManage = activeUser.role === 'admin' || activeUser.role === 'department_coordinator';

          return (
            <div
              key={b._id}
              className="group bg-white dark:bg-[#111625] rounded-xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between overflow-hidden h-[154px]"
            >
              <div className="p-2.5 flex flex-col justify-between flex-1 gap-1.5">
                {/* Header: ID + Status badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold font-mono text-slate-500 dark:text-slate-400">
                    {b._id}
                  </span>
                  <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-0.5 leading-none ${statusInfo.color}`}>
                    <StatusIcon className="w-2.5 h-2.5" />
                    <span>{statusInfo.label}</span>
                  </span>
                </div>

                {/* Title & Requester */}
                <div>
                  <h3 className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight truncate" title={b.title}>
                    {b.title}
                  </h3>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1 truncate max-w-[130px]">
                      <User className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span className="truncate">{b.requester}</span>
                    </span>
                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded-full border shrink-0 ${catInfo.color}`}>
                      +{catInfo.weight}p
                    </span>
                  </div>
                </div>

                {/* Inline Stats Capsule */}
                <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-900/60 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-800/60">
                  <span className="flex items-center gap-1 font-medium">
                    <Users className="w-2.5 h-2.5 text-slate-400" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{b.attendance}</span>
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="flex items-center gap-1 font-medium">
                    <Timer className="w-2.5 h-2.5 text-slate-400" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{b.duration_periods}h</span>
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="flex items-center gap-1 font-medium truncate max-w-[90px]">
                    <MapPin className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                    <span className="truncate text-indigo-600 dark:text-indigo-400 font-semibold">
                      {b.assigned_room ? `${b.assigned_room} (${b.assigned_day})` : (b.requested_room || 'Any')}
                    </span>
                  </span>
                </div>

                {/* Decision reason if present */}
                {b.decision_reason && (
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 italic truncate border-l-2 border-indigo-400 pl-1.5 -mt-0.5">
                    "{b.decision_reason}"
                  </div>
                )}

                {/* Actions */}
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                  {canManage ? (
                    b.status === 'approved' ? (
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-200/80 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Approved: {b.assigned_room} ({b.assigned_day} P{b.assigned_start_period})</span>
                        </span>
                        <button
                          onClick={() => setActionModal({ booking: b, type: 'alternative' })}
                          className="py-1 px-2 rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 text-[10px] font-semibold border border-slate-200 dark:border-slate-700 transition"
                          title="Reallocate venue or time slot"
                        >
                          Modify
                        </button>
                      </div>
                    ) : b.status === 'rejected' ? (
                      <div className="w-full py-1 rounded-md bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-[10px] font-semibold border border-rose-200/80 dark:border-rose-800 text-center flex items-center justify-center gap-1">
                        <XCircle className="w-3 h-3 text-rose-500" />
                        <span>Rejected</span>
                      </div>
                    ) : b.status === 'alternative_offered' ? (
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-semibold border border-amber-200/80 dark:border-amber-800">
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                          <span>Alt: {b.assigned_room} ({b.assigned_day})</span>
                        </span>
                        <button
                          onClick={() => setActionModal({ booking: b, type: 'approve' })}
                          className="py-1 px-2 rounded-md bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800 transition"
                        >
                          Approve
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setActionModal({ booking: b, type: 'approve' })}
                          className="flex-1 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-200/80 dark:border-emerald-800 transition text-center"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setActionModal({ booking: b, type: 'alternative' })}
                          className="flex-1 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[10px] font-semibold border border-amber-200/80 dark:border-amber-800 transition text-center"
                        >
                          Alternative
                        </button>
                        <button
                          onClick={() => setActionModal({ booking: b, type: 'reject' })}
                          className="flex-1 py-1 rounded-md bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-[10px] font-semibold border border-rose-200/80 dark:border-rose-800 transition text-center"
                        >
                          Reject
                        </button>
                      </div>
                    )
                  ) : (
                    b.status !== 'cancelled' && (
                      <button
                        onClick={() => handleCancelBooking(b._id)}
                        className="w-full py-1 rounded-md bg-slate-50 dark:bg-slate-800/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-600 dark:text-slate-300 hover:text-rose-600 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold transition flex items-center justify-center gap-1"
                      >
                        <Ban className="w-3 h-3" />
                        Cancel Booking
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination — shifted lower with larger comfortable buttons */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3.5 pb-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums">
            Showing {(safePage - 1) * CARDS_PER_PAGE + 1}–{Math.min(safePage * CARDS_PER_PAGE, filteredBookings.length)} of {filteredBookings.length} requests
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`min-w-[32px] h-8 rounded-lg text-xs font-semibold transition ${
                  page === safePage
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {/* Decision Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
              {actionModal.type} Request: {actionModal.booking._id} ({actionModal.booking.title})
            </h3>

            {actionModal.type === 'alternative' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in">
          <form onSubmit={handleManualSubmit} className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
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
