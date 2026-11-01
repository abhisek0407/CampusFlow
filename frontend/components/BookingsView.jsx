'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
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
  X,
  Check,
  ArrowRightLeft,
  MessageSquare,
  ShieldCheck,
  FileText
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
    warning: {
      bg: 'bg-amber-950/95 border-amber-500 text-amber-100 shadow-amber-900/30',
      icon: <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
      titleColor: 'text-amber-300',
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
        className="opacity-60 hover:opacity-100 text-white p-0.5 rounded transition shrink-0"
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
  alternative_offered: { label: 'Alt Offered', color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800', icon: AlertCircle },
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
  const ROWS_PER_PAGE = 9; // Extended to fill vertical viewport with zero wasted bottom space
  const [toasts, setToasts] = useState([]);
  const [decidedIds, setDecidedIds] = useState(new Set());
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
      const res = await apiFetch('/api/bookings');
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

  function openDecisionModal(booking, type) {
    let defaultReason = '';
    if (type === 'approve') {
      defaultReason = `Approved by ${activeUser.name}: Venue capacity verified and zero academic timetable clashes.`;
    } else if (type === 'alternative') {
      defaultReason = `Requested window in ${booking.requested_room || 'AUD'} unavailable; alternative venue offered.`;
    } else {
      defaultReason = `Rejected by ${activeUser.name}: Venue capacity insufficient for requested time slot.`;
    }

    setDecisionReason(defaultReason);
    setAltRoom(booking.requested_room || 'AUD');
    setAltDay(booking.windows?.[0]?.day || 'MON');
    setAltStart(booking.windows?.[0]?.from_period || 10);
    setActionModal({ booking, type });
  }

  async function handleDecisionSubmit() {
    if (!actionModal) return;
    const booking = actionModal.booking;
    const bId = booking._id;
    const bTitle = booking.title;
    const bRequester = booking.requester;
    const bRole = booking.role;
    const bType = actionModal.type;

    try {
      const assignedRoom = bType === 'alternative' ? altRoom : (actionModal.booking.assigned_room || actionModal.booking.requested_room || 'AUD');
      const assignedDay = bType === 'alternative' ? altDay : (actionModal.booking.assigned_day || actionModal.booking.windows?.[0]?.day || 'MON');
      const assignedStart = bType === 'alternative' ? Number(altStart) : (actionModal.booking.assigned_start_period || actionModal.booking.windows?.[0]?.from_period || 10);
      const assignedEnd = bType === 'alternative' ? Number(altStart) + actionModal.booking.duration_periods - 1 : (actionModal.booking.assigned_end_period || assignedStart + (actionModal.booking.duration_periods || 2) - 1);
      const newStatus = bType === 'alternative' ? 'alternative_offered' : (bType === 'approve' ? 'approved' : 'rejected');

      const payload = {
        request_id: bId,
        booking_id: bId,
        status: newStatus,
        decision: newStatus,
        decision_reason: decisionReason || `${bType.toUpperCase()} by ${activeUser.name}`,
        assigned_day: assignedDay,
        assigned_start_period: assignedStart,
        assigned_end_period: assignedEnd,
        assigned_room: assignedRoom,
        reviewer_name: activeUser.name,
      };

      const res = await apiFetch('/api/bookings/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        // Track decided IDs so it drops from default Pending view
        setDecidedIds(prev => new Set([...prev, bId]));

        // Update local status so if user filters by "approved", "rejected", etc., it appears immediately
        setBookings(prev => prev.map(b => b._id === bId ? {
          ...b,
          status: newStatus,
          decision_reason: payload.decision_reason,
          assigned_room: assignedRoom,
          assigned_day: assignedDay,
          assigned_start_period: assignedStart,
          assigned_end_period: assignedEnd
        } : b));

        setActionModal(null);
        setDecisionReason('');

        // Dispatched Toast notification
        if (bType === 'approve') {
          addToast(
            'success',
            `Approved & Dispatched (${bId})`,
            `Successfully approved "${bTitle}"! Allocated to ${assignedRoom} on ${assignedDay} (P${assignedStart}–P${assignedEnd}). Notification sent to ${bRequester}.`
          );
        } else if (bType === 'alternative') {
          addToast(
            'warning',
            `Alternative Offered (${bId})`,
            `Offered alternative for "${bTitle}": Reallocated to ${assignedRoom} on ${assignedDay} (P${assignedStart}–P${assignedEnd}). Notification sent to ${bRequester}.`
          );
        } else {
          addToast(
            'error',
            `Booking Rejected (${bId})`,
            `Request "${bTitle}" rejected. Official notice dispatched to ${bRequester}.`
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

  async function handleManualSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        title: manualForm.title,
        requester: activeUser.name || manualForm.requester || 'Club Rep',
        role: activeUser.role || manualForm.role,
        requested_category: manualForm.requested_category,
        attendance: Number(manualForm.attendance),
        duration_periods: Number(manualForm.duration_periods),
        room_types: manualForm.room_types,
        requested_room: manualForm.requested_room,
        windows: [{ day: manualForm.day, from_period: Number(manualForm.from_period), to_period: Number(manualForm.to_period) }],
      };

      const res = await apiFetch('/api/bookings', {
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

  // Filter Bookings logic
  const filteredBookings = bookings.filter((b) => {
    // In pending review mode, hide requests decided in this session
    if (selectedStatus === 'pending' && decidedIds.has(b._id)) {
      return false;
    }
    const matchesSearch = !search.trim() || 
                          b.title?.toLowerCase().includes(search.toLowerCase()) || 
                          b._id?.toLowerCase().includes(search.toLowerCase()) ||
                          b.requester?.toLowerCase().includes(search.toLowerCase()) ||
                          b.requested_room?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || b.requested_category === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || b.status === selectedStatus;
    return matchesSearch && matchesCat && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBookings = filteredBookings.slice(
    (safePage - 1) * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE
  );

  useEffect(() => { setCurrentPage(1); }, [search, selectedCategory, selectedStatus]);

  return (
    <div className="space-y-2.5">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      
      {/* 1. Page Header (Unboxed, Consistent text-2xl matching ExamsView) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Spectra Fest Venue Review & Authorizations</span>
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            25 Fest Requests • 67.0 Benchmark Score (Ceiling) • Priority Compliant (Admin &gt; Faculty &gt; Coord &gt; Club)
          </p>
        </div>

        <button
          onClick={() => setShowManualModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Submit Request</span>
        </button>
      </div>

      {/* 2. Compact Search & Filter Controls */}
      <div className="bg-white dark:bg-[#111625] rounded-xl px-3 py-2 border border-slate-200/90 dark:border-slate-800/80 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, ID (BR-01), requester, or venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none flex-1 sm:flex-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="institute_event">Institute Events (5p)</option>
              <option value="guest_lecture">Guest Lectures (4p)</option>
              <option value="department_event">Dept Events (3p)</option>
              <option value="club_event">Club Events (2p)</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none flex-1 sm:flex-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="alternative_offered">Alternative Offered</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono font-medium tabular-nums whitespace-nowrap hidden sm:inline px-1">
              {filteredBookings.length} / {bookings.length}
            </span>
          </div>

        </div>
      </div>

      {/* 3. Modern Tabular Matrix View (Elongated, Single-Screen Non-Scrollable) */}
      <div className="bg-white dark:bg-[#0b0f19] rounded-xl border border-slate-200/90 dark:border-slate-800/80 p-3 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100/90 dark:bg-slate-900/90 text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white w-20">Req ID</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Event Title</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Requester</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Category</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Pax</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Time Window</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Venue</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Status</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white text-center w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {paginatedBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                    No booking requests match the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((b) => {
                  const catInfo = CATEGORY_WEIGHTS[b.requested_category] || CATEGORY_WEIGHTS.club_event;
                  const statusInfo = STATUS_BADGES[b.status] || STATUS_BADGES.pending;
                  const StatusIcon = statusInfo.icon;
                  const isPending = b.status === 'pending';
                  const isApproved = b.status === 'approved';
                  const isAlt = b.status === 'alternative_offered';
                  const isRejected = b.status === 'rejected';
                  const isCancelled = b.status === 'cancelled';

                  const day = b.assigned_day || b.windows?.[0]?.day || 'MON';
                  const startP = b.assigned_start_period || b.windows?.[0]?.from_period || 10;
                  const endP = b.assigned_end_period || (startP + (b.duration_periods || 2) - 1);
                  const venue = b.assigned_room || b.requested_room || 'Any';

                  return (
                    <tr key={b._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      {/* 1. Request ID */}
                      <td className="py-2 px-3 font-bold font-mono text-slate-900 dark:text-white">
                        {b._id}
                      </td>

                      {/* 2. Event Title */}
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white max-w-[200px] truncate" title={b.title}>
                        {b.title}
                      </td>

                      {/* 3. Requester */}
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 max-w-[140px] truncate" title={b.requester}>
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{b.requester}</span>
                        </div>
                      </td>

                      {/* 4. Category with weight badge */}
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catInfo.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${catInfo.dot}`} />
                          <span>{catInfo.label}</span>
                          <strong className="ml-0.5 font-mono">+{catInfo.weight}p</strong>
                        </span>
                      </td>

                      {/* 5. Pax */}
                      <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                        <span>{b.attendance}</span>
                        <span className="text-[10px] text-slate-400 ml-1">pax</span>
                      </td>

                      {/* 6. Time Window */}
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                        <span>{day} P{startP}–P{endP}</span>
                        <span className="text-[10px] text-slate-400 ml-1">({b.duration_periods}h)</span>
                      </td>

                      {/* 7. Venue */}
                      <td className="py-2 px-3">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-xs">
                          {venue}
                        </span>
                      </td>

                      {/* 8. Status */}
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusInfo.color}`}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>

                      {/* 9. Modern Actions: Tick, Alternative, Cross */}
                      <td className="py-2 px-3 text-center">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Modern Tick (Approve) */}
                            <button
                              onClick={() => openDecisionModal(b, 'approve')}
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800 transition cursor-pointer shadow-2xs"
                              title="Approve booking with administrative justification"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>

                            {/* Modern Alternative (Swap) */}
                            <button
                              onClick={() => openDecisionModal(b, 'alternative')}
                              className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800 transition cursor-pointer shadow-2xs"
                              title="Offer alternative venue or time slot with reason"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 stroke-[2]" />
                            </button>

                            {/* Modern Cross (Reject) */}
                            <button
                              onClick={() => openDecisionModal(b, 'reject')}
                              className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-800 transition cursor-pointer shadow-2xs"
                              title="Reject request with official administrative comment"
                            >
                              <X className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          </div>
                        ) : isApproved ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[80px]">
                              {b.assigned_room || 'AUD'}
                            </span>
                            <button
                              onClick={() => openDecisionModal(b, 'alternative')}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                            >
                              Modify
                            </button>
                          </div>
                        ) : isAlt ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openDecisionModal(b, 'approve')}
                              className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 font-semibold hover:bg-emerald-100 transition"
                            >
                              Confirm
                            </button>
                          </div>
                        ) : isRejected ? (
                          <span className="text-[10px] text-rose-500 font-medium italic">
                            Rejected
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Withdrawn
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Table Pagination Footer (Shifted lower with comfortable buttons) */}
        <div className="pt-2.5 mt-1 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums">
            Showing {filteredBookings.length === 0 ? 0 : (safePage - 1) * ROWS_PER_PAGE + 1}–{Math.min(safePage * ROWS_PER_PAGE, filteredBookings.length)} of {filteredBookings.length} requests
          </span>

          {totalPages > 1 && (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  className={`min-w-[30px] h-7 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    safePage === num
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Decision Modal with Comment / Justification ──────────────── */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#111625] rounded-2xl max-w-lg w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3.5">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                {actionModal.type === 'approve' ? (
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </div>
                ) : actionModal.type === 'alternative' ? (
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                    <ArrowRightLeft className="w-4 h-4 stroke-[2]" />
                  </div>
                ) : (
                  <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                    {actionModal.type === 'approve' ? 'Approve Venue Request' : actionModal.type === 'alternative' ? 'Offer Alternative Venue/Slot' : 'Reject Venue Request'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {actionModal.booking._id} • {actionModal.booking.title}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActionModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Request Summary Pills */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Requester</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {actionModal.booking.requester}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Attendance</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  {actionModal.booking.attendance} pax
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Priority Weight</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 block font-mono">
                  +{CATEGORY_WEIGHTS[actionModal.booking.requested_category]?.weight || 2}p
                </span>
              </div>
            </div>

            {/* Alternative Venue & Window Controls (if alternative) */}
            {actionModal.type === 'alternative' && (
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Select Alternative Venue & Time Window:
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Venue</label>
                    <select
                      value={altRoom}
                      onChange={(e) => setAltRoom(e.target.value)}
                      className="w-full py-1.5 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-xs text-slate-800 dark:text-slate-200"
                    >
                      <option value="AUD">Main AUD (500 seats)</option>
                      <option value="OAT">Open Air Theatre (800 seats)</option>
                      <option value="SH-1">Seminar Hall 1 (150 seats)</option>
                      <option value="SH-2">Seminar Hall 2 (100 seats)</option>
                      <option value="LH-1">Lecture Hall 1 (200 seats)</option>
                      <option value="LH-2">Lecture Hall 2 (200 seats)</option>
                      <option value="CR-101">Classroom A-101 (90 seats)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Day</label>
                    <select
                      value={altDay}
                      onChange={(e) => setAltDay(e.target.value)}
                      className="w-full py-1.5 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-xs text-slate-800 dark:text-slate-200"
                    >
                      <option value="MON">Monday</option>
                      <option value="TUE">Tuesday</option>
                      <option value="WED">Wednesday</option>
                      <option value="THU">Thursday</option>
                      <option value="FRI">Friday</option>
                      <option value="SAT">Saturday</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Start Period</label>
                    <select
                      value={altStart}
                      onChange={(e) => setAltStart(e.target.value)}
                      className="w-full py-1.5 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-xs text-slate-800 dark:text-slate-200"
                    >
                      <option value={9}>P9 (17:00)</option>
                      <option value={10}>P10 (18:00)</option>
                      <option value={11}>P11 (19:00)</option>
                      <option value={12}>P12 (20:00)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Administrative Comment / Justification Box (Approve, Reject, and Alternative) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  {actionModal.type === 'approve'
                    ? 'Administrative Approval Comment / Justification:'
                    : actionModal.type === 'alternative'
                    ? 'Alternative Offer Justification:'
                    : 'Rejection Reason / Mandatory Justification:'}
                </span>
              </label>
              <textarea
                rows={3}
                placeholder="Enter justification for the audit trail..."
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Rejection Quick Template Suggestions */}
            {actionModal.type === 'reject' && (
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="text-slate-400">Quick Reasons:</span>
                <button
                  type="button"
                  onClick={() => setDecisionReason('Venue capacity insufficient for expected attendance size.')}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  Capacity insufficient
                </button>
                <button
                  type="button"
                  onClick={() => setDecisionReason('Auditorium reserved for higher priority Institute Inaugural Event.')}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  Priority inversion protection
                </button>
                <button
                  type="button"
                  onClick={() => setDecisionReason('Requested venue is undergoing scheduled maintenance (Rule H8).')}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  Maintenance conflict
                </button>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDecisionSubmit}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-xs font-semibold transition cursor-pointer shadow-xs ${
                  actionModal.type === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : actionModal.type === 'alternative'
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {actionModal.type === 'approve' ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Confirm Approval</span>
                  </>
                ) : actionModal.type === 'alternative' ? (
                  <>
                    <ArrowRightLeft className="w-3.5 h-3.5 stroke-[2]" />
                    <span>Dispatch Alternative</span>
                  </>
                ) : (
                  <>
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Manual Request Modal ─────────────────────────────────────── */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form onSubmit={handleManualSubmit} className="bg-white dark:bg-[#111625] rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Manual Venue Booking Request</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Annual Coding Hackathon Closing Ceremony"
                  value={manualForm.title}
                  onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Event Category</label>
                  <select
                    value={manualForm.requested_category}
                    onChange={(e) => setManualForm({ ...manualForm, requested_category: e.target.value })}
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="club_event">Club Event (2p)</option>
                    <option value="department_event">Dept Event (3p)</option>
                    <option value="guest_lecture">Guest Lecture (4p)</option>
                    <option value="institute_event">Institute Event (5p)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Expected Attendance</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={800}
                    value={manualForm.attendance}
                    onChange={(e) => setManualForm({ ...manualForm, attendance: e.target.value })}
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Day</label>
                  <select
                    value={manualForm.day}
                    onChange={(e) => setManualForm({ ...manualForm, day: e.target.value })}
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="MON">Monday</option>
                    <option value="TUE">Tuesday</option>
                    <option value="WED">Wednesday</option>
                    <option value="THU">Thursday</option>
                    <option value="FRI">Friday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Period</label>
                  <select
                    value={manualForm.from_period}
                    onChange={(e) => setManualForm({ ...manualForm, from_period: e.target.value })}
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    {[9, 10, 11, 12].map((p) => (
                      <option key={p} value={p}>P{p} ({8 + p}:00)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Duration (Hours)</label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={manualForm.duration_periods}
                    onChange={(e) => setManualForm({ ...manualForm, duration_periods: e.target.value })}
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
              >
                Submit Booking
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
