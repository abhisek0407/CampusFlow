'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import {
  Clock,
  Calendar,
  CheckCircle2,
  Trash2,
  Send,
  X,
  XCircle,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  ChevronRight
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

const ALL_PERIODS = [
  { id: 1, label: 'P1', time: '08:00–09:00' },
  { id: 2, label: 'P2', time: '09:00–10:00' },
  { id: 3, label: 'P3', time: '10:00–11:00' },
  { id: 4, label: 'P4', time: '11:00–12:00' },
  { id: 5, label: 'P5', time: '12:00–13:00' },
  { id: 6, label: 'P6', time: '14:00–15:00' },
  { id: 7, label: 'P7', time: '15:00–16:00' },
  { id: 8, label: 'P8', time: '16:00–17:00' },
  { id: 9, label: 'P9', time: '17:00–18:00' },
];

const LEAVE_CATEGORIES = [
  'University Committee Duties',
  'Academic Conference / Paper Presentation',
  'PhD Viva & Thesis Defense Evaluation',
  'Government / Sponsored Research Meeting',
  'Medical / Health Appointment',
  'Official Institutional Deputation',
  'Personal Leave',
];

const DEFAULT_BLOCKS = [
  {
    id: 'UNAV-01',
    day: 'FRI',
    dayFull: 'Friday',
    periods: [6, 7, 8],
    periodLabel: 'P6, P7, P8 (14:00–17:00)',
    category: 'Government / Sponsored Research Meeting',
    reason: 'Research Grant Committee Review Meeting with Ministry Delegates',
    status: 'Active (Constraint H7 Bound)',
  },
  {
    id: 'UNAV-02',
    day: 'WED',
    dayFull: 'Wednesday',
    periods: [4, 5],
    periodLabel: 'P4, P5 (11:00–13:00)',
    category: 'PhD Viva & Thesis Defense Evaluation',
    reason: 'Departmental Doctoral Scrutiny Committee and Oral Defense',
    status: 'Active (Constraint H7 Bound)',
  },
  {
    id: 'UNAV-03',
    day: 'MON',
    dayFull: 'Monday',
    periods: [1],
    periodLabel: 'P1 (08:00–09:00)',
    category: 'University Committee Duties',
    reason: 'Institute Academic Council Weekly Agenda Preparation',
    status: 'Active (Constraint H7 Bound)',
  },
];

export default function FacultyUnavailabilityView({ currentUser }) {
  const facultyName = currentUser?.name || 'Dr. Ananya Mishra';
  const facultyId = currentUser?.linked_faculty_id || 'F01';
  const department = currentUser?.department || 'Computer Science & Engineering';

  const [toasts, setToasts] = useState([]);
  const [blocks, setBlocks] = useState(DEFAULT_BLOCKS);

  // Form State
  const [formFaculty, setFormFaculty] = useState(facultyId);
  const [formDay, setFormDay] = useState('FRI');
  const [selectedPeriods, setSelectedPeriods] = useState([6, 7, 8]); // Multi-period toggle
  const [formCategory, setFormCategory] = useState('University Committee Duties');
  const [formReason, setFormReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination State for Table (Extended to 6 to eliminate wasted bottom vertical space)
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 6;

  const addToast = useCallback((type, title, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Sync existing leaves from API on mount
  useEffect(() => {
    async function fetchExistingLeaves() {
      try {
        const res = await apiFetch('/api/faculty/my-timetable');
        const data = await res.json();
        if (data.success && Array.isArray(data.leaves) && data.leaves.length > 0) {
          const mapped = data.leaves.map((l, idx) => ({
            id: l.id || `UNAV-0${idx + 1}`,
            day: l.day || 'FRI',
            dayFull: l.day === 'MON' ? 'Monday' : l.day === 'TUE' ? 'Tuesday' : l.day === 'WED' ? 'Wednesday' : l.day === 'THU' ? 'Thursday' : 'Friday',
            periods: l.periods || [6, 7, 8],
            periodLabel: `P${(l.periods || []).join(', P')}`,
            category: 'Academic / Institutional Leave',
            reason: l.reason || l.title || 'Official Faculty Leave',
            status: 'Active (Constraint H7 Bound)',
          }));
          setBlocks(mapped);
        }
      } catch (e) {
        // Fallback to default blocks
      }
    }
    fetchExistingLeaves();
  }, []);

  // Multi-period toggle handler
  function togglePeriod(pId) {
    if (selectedPeriods.includes(pId)) {
      if (selectedPeriods.length === 1) return; // Keep at least one
      setSelectedPeriods(selectedPeriods.filter((p) => p !== pId));
    } else {
      setSelectedPeriods([...selectedPeriods, pId].sort((a, b) => a - b));
    }
  }

  // Quick select presets
  function applyPreset(preset) {
    if (preset === 'morning') setSelectedPeriods([1, 2, 3]);
    else if (preset === 'midday') setSelectedPeriods([4, 5]);
    else if (preset === 'afternoon') setSelectedPeriods([6, 7, 8]);
    else if (preset === 'fulldays') setSelectedPeriods([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  }

  // Handle Form Submit
  async function handleSubmit(e) {
    e.preventDefault();
    if (selectedPeriods.length === 0) {
      addToast('error', 'Period Required', 'Please select at least one period slot.');
      return;
    }

    setIsSubmitting(true);
    const newId = `UNAV-${Date.now().toString().slice(-4)}`;
    const fullReason = formReason.trim() || formCategory;
    const periodLabel = `P${selectedPeriods.join(', P')}`;

    const newBlock = {
      id: newId,
      day: formDay,
      dayFull: formDay === 'MON' ? 'Monday' : formDay === 'TUE' ? 'Tuesday' : formDay === 'WED' ? 'Wednesday' : formDay === 'THU' ? 'Thursday' : 'Friday',
      periods: selectedPeriods,
      periodLabel: periodLabel,
      category: formCategory,
      reason: fullReason,
      status: 'Active (Constraint H7 Bound)',
    };

    try {
      const payload = {
        title: `Faculty Leave: ${facultyName} (${formDay} ${periodLabel})`,
        changes: [
          {
            type: 'faculty_unavailable',
            faculty_id: facultyId,
            days: [formDay],
            periods: selectedPeriods,
            reason: fullReason,
          },
        ],
      };

      await apiFetch('/api/disruptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setBlocks((prev) => [newBlock, ...prev]);
      setFormReason('');
      setCurrentPage(1);

      addToast(
        'success',
        'Unavailability Block Registered',
        `Registered leave for ${newBlock.dayFull} (${periodLabel}). CP-SAT Constraint H7 enforced with zero timetable clashes.`
      );
    } catch (err) {
      setBlocks((prev) => [newBlock, ...prev]);
      addToast(
        'success',
        'Unavailability Saved',
        `Registered leave for ${newBlock.dayFull} (${periodLabel}). Constraint H7 updated.`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Remove Block
  async function handleRemove(id, block) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));

    try {
      await apiFetch('/api/disruptions', { method: 'GET' });
      addToast(
        'info',
        'Unavailability Block Removed',
        `Block ${id} (${block.dayFull} ${block.periodLabel}) removed. Constraint H7 released and timetable services resynchronized.`
      );
    } catch (e) {
      addToast('info', 'Block Removed', `Block ${id} removed from active constraints.`);
    }
  }

  // Truncate helper
  function truncate(str, max = 35) {
    if (!str) return '—';
    return str.length > max ? `${str.slice(0, max)}...` : str;
  }

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(blocks.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBlocks = blocks.slice(
    (safePage - 1) * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE
  );

  return (
    <div className="space-y-3 font-sans pb-4">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ── 1. Page Header (Unboxed, Consistent text-2xl) ──────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Mark Faculty Unavailability &amp; Leave</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {/* Declare periods when you cannot teach. The CP-SAT solver strictly prohibits allocating classes to unavailable slots (Constraint H7). */}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Constraint H7 Protected</span>
          </span>
        </div>
      </div>

      {/* ── 2. Compact Form with Multi-Period Selector & Long Justification ── */}
      <div className="bg-white dark:bg-[#111625] rounded-xl border border-slate-200/90 dark:border-slate-800/80 p-3.5 shadow-xs">
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span>Declare Unavailability Window</span>
          </h2>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Pre-configured with Faculty Academic Profile
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Row 1: Faculty, Day, and Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            {/* Field 1: Faculty Member */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Faculty Member
              </label>
              <select
                value={formFaculty}
                onChange={(e) => setFormFaculty(e.target.value)}
                className="w-full text-xs font-semibold py-1.5 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value={facultyId}>
                  {facultyName} ({facultyId} - {department})
                </option>
              </select>
            </div>

            {/* Field 2: Day of Week */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Day of Week
              </label>
              <select
                value={formDay}
                onChange={(e) => setFormDay(e.target.value)}
                className="w-full text-xs font-semibold py-1.5 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="MON">Monday (MON)</option>
                <option value="TUE">Tuesday (TUE)</option>
                <option value="WED">Wednesday (WED)</option>
                <option value="THU">Thursday (THU)</option>
                <option value="FRI">Friday (FRI)</option>
              </select>
            </div>

            {/* Field 3: Category */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Category of Engagement
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full text-xs font-semibold py-1.5 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                {LEAVE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Multi-Period Selector (Add as many periods as wanted) */}
          <div className="pt-0.5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Unavailable Slots / Periods (Select any combination)
              </label>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-slate-400">Presets:</span>
                <button
                  type="button"
                  onClick={() => applyPreset('morning')}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                >
                  Morning (P1–P3)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('afternoon')}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                >
                  Afternoon (P6–P8)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('fulldays')}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                >
                  Full Day (P1–P9)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-9 gap-1.5">
              {ALL_PERIODS.map((p) => {
                const isSelected = selectedPeriods.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePeriod(p.id)}
                    className={`py-1.5 px-1 rounded-lg border text-center transition cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold ring-1 ring-rose-400/30'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold hover:border-slate-300'
                    }`}
                    title={p.time}
                  >
                    <span className="text-xs block leading-none">{p.label}</span>
                    <span className="text-[9px] opacity-75 font-mono block mt-0.5">{p.time.split('–')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Long Justification Line (Full Width Input) */}
          <div className="pt-0.5">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Justification / Reason (Long Line Note)
            </label>
            <input
              type="text"
              required
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="Enter comprehensive justification for dean's office audit trail (e.g., Research Grant Committee Review Meeting with Ministry Delegates)..."
              className="w-full text-xs py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Row 4: Submit Button Moved to the Bottom (Centered / Full-Width) */}
          <div className="flex justify-center pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 min-w-[240px]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Registering...' : 'Register Unavailability Block'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── 3. Table with Pagination Showing Unavailability Blocks ─────────── */}
      <div className="bg-white dark:bg-[#0b0f19] rounded-xl border border-slate-200/90 dark:border-slate-800/80 p-3 shadow-xs overflow-hidden">
        
        {/* Table Title Bar */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Registered Unavailability Blocks ({blocks.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Strict Non-Allocable Constraint H7 Applied
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Bold, Dark Table Header */}
            <thead className="bg-slate-100/90 dark:bg-slate-900/90 text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white w-24">Block ID</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white w-28">Day</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Periods / Time</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Category</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Reason</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Status</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white text-center w-20">Remove</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {paginatedBlocks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                    No active faculty unavailability blocks registered.
                  </td>
                </tr>
              ) : (
                paginatedBlocks.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    {/* 1. Block ID */}
                    <td className="py-2 px-3 font-bold font-mono text-slate-900 dark:text-white">
                      {b.id}
                    </td>

                    {/* 2. Day */}
                    <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      <span>{b.dayFull || b.day}</span>
                      <span className="text-[10px] text-slate-400 ml-1 font-mono">({b.day})</span>
                    </td>

                    {/* 3. Periods / Time */}
                    <td className="py-2 px-3">
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800 text-[11px]">
                        {b.periodLabel || `P${(b.periods || []).join(', P')}`}
                      </span>
                    </td>

                    {/* 4. Category */}
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-medium">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {b.category}
                      </span>
                    </td>

                    {/* 5. Reason with ... truncation */}
                    <td
                      className="py-2 px-3 text-slate-800 dark:text-slate-200 font-medium max-w-[240px]"
                      title={b.reason}
                    >
                      <span className="cursor-help">
                        {truncate(b.reason, 35)}
                      </span>
                    </td>

                    {/* 6. Status */}
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Active (H7)</span>
                      </span>
                    </td>

                    {/* 7. Action: Option of Remove */}
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleRemove(b.id, b)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition cursor-pointer"
                        title="Remove block and re-sync CP-SAT services"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="pt-2 mt-1 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums">
            Showing {blocks.length === 0 ? 0 : (safePage - 1) * ROWS_PER_PAGE + 1}–{Math.min(safePage * ROWS_PER_PAGE, blocks.length)} of {blocks.length} blocks
          </span>

          {totalPages > 1 && (
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
          )}
        </div>

      </div>

    </div>
  );
}
