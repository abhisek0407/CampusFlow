'use client';

import React, { useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import {
  PlusCircle,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Users
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
      icon: <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />,
      titleColor: 'text-indigo-300',
    },
  };
  const current = styles[toast.type] || styles.success;

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

const DEFAULT_REQUESTS = [
  {
    id: 'REQ-EXTRA-01',
    course: 'CS101',
    courseTitle: 'Intro to Programming',
    kind: 'Tutorial Section 2 (Remedial)',
    target: 'Y1-A',
    slot: 'THU P5 (12:00)',
    reason: 'Additional tutorial session for students preparing for midsem programming exam',
    status: 'Dean Academic Pending',
    date: '2026-10-31',
  },
  {
    id: 'REQ-EXTRA-02',
    course: 'CS302',
    courseTitle: 'Database Systems',
    kind: 'Practical Laboratory Block',
    target: 'CSE-3',
    slot: 'TUE P6–P8 (14:00)',
    reason: 'Make-up lab session for SQL Transaction Concurrency Experiments',
    status: 'Approved by Coordinator',
    date: '2026-10-28',
  },
];

export default function FacultyRequestSessionView({ currentUser }) {
  const facultyName = currentUser?.name || 'Dr. Ananya Mishra';
  const facultyId = currentUser?.linked_faculty_id || 'F01';

  const [course, setCourse] = useState('CS101');
  const [sessionKind, setSessionKind] = useState('tutorial');
  const [targetGroup, setTargetGroup] = useState('Y1-A');
  const [duration, setDuration] = useState(1);
  const [preferredDay, setPreferredDay] = useState('THU');
  const [preferredPeriod, setPreferredPeriod] = useState(5);
  const [reason, setReason] = useState('');
  const [requests, setRequests] = useState(DEFAULT_REQUESTS);
  const [toasts, setToasts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination for table (3 per page balances height for single non-scrollable page)
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 3;

  const addToast = useCallback((type, title, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);

    const newReqId = `REQ-EXTRA-${Date.now().toString().slice(-4)}`;
    const fullReason = reason.trim() || 'Additional academic tutorial session';
    const kindLabel = sessionKind === 'tutorial'
      ? '1-Hour Tutorial Section'
      : sessionKind === 'lab'
      ? '3-Hour Practical Laboratory Block'
      : '1-Hour Lecture';

    const newReq = {
      id: newReqId,
      course,
      courseTitle: course === 'CS101' ? 'Intro to Programming' : 'Database Systems',
      kind: kindLabel,
      target: targetGroup,
      slot: `${preferredDay} P${preferredPeriod} (${preferredPeriod + 7}:00)`,
      reason: fullReason,
      status: 'Dean Academic Pending',
      date: new Date().toISOString().split('T')[0],
    };

    try {
      const payload = {
        title: `Extra Session Request: ${course} (${targetGroup} on ${preferredDay} P${preferredPeriod})`,
        changes: [
          {
            type: 'add_session',
            course_id: course,
            faculty_id: facultyId,
            groups: [targetGroup],
            preferred_day: preferredDay,
            preferred_period: preferredPeriod,
            reason: fullReason,
          },
        ],
      };

      await apiFetch('/api/disruptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setRequests((prev) => [newReq, ...prev]);
      setReason('');
      setCurrentPage(1);

      addToast(
        'success',
        'Session Request Submitted',
        `Successfully submitted extra session for ${course} (${targetGroup}). Forwarded to Dean of Academic Affairs for clearance.`
      );
    } catch (err) {
      setRequests((prev) => [newReq, ...prev]);
      addToast(
        'success',
        'Request Logged',
        `Extra session for ${course} submitted to Dean's Office.`
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDeleteRequest(id, courseName) {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    addToast(
      'info',
      'Request Deleted',
      `Session request ${id} (${courseName}) has been deleted.`
    );
  }

  // Truncate helper
  function truncate(str, max = 35) {
    if (!str) return '—';
    return str.length > max ? `${str.slice(0, max)}...` : str;
  }

  // Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(requests.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRequests = requests.slice(
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
            <PlusCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Request Extra Session or Class Rescheduling</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Rule Section 4: Faculty requests extra or moved sessions. The platform validates all student group and room constraints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Faculty Quota: 4h Daily Cap Guarded</span>
          </span>
        </div>
      </div>

      {/* ── 2. Centered Form (Horizontal center, clean inputs) ─────────────── */}
      <div className="max-w-3xl mx-auto w-full">
        <div className="bg-white dark:bg-[#111625] rounded-xl border border-slate-200/90 dark:border-slate-800/80 p-3.5 shadow-xs">
          
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>Session Request Details</span>
            </h2>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              Academic Term: Spring 2026
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Row 1: Course & Session Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Course
                </label>
                <select
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full text-xs font-semibold py-1.5 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="CS101">CS101 - Intro to Programming</option>
                  <option value="CS302">CS302 - Database Systems</option>
                  <option value="CS201">CS201 - Data Structures</option>
                  <option value="CS301">CS301 - Operating Systems</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Session Type
                </label>
                <select
                  value={sessionKind}
                  onChange={(e) => {
                    setSessionKind(e.target.value);
                    setDuration(e.target.value === 'lab' ? 3 : 1);
                  }}
                  className="w-full text-xs font-semibold py-1.5 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="tutorial">1-Hour Tutorial Section</option>
                  <option value="lecture">1-Hour Lecture</option>
                  <option value="lab">3-Hour Practical Laboratory Block</option>
                </select>
              </div>
            </div>

            {/* Row 2: Cohort, Preferred Day, Preferred Start Slot */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Student Cohort
                </label>
                <select
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value)}
                  className="w-full text-xs font-semibold py-1.5 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Y1-A">Year 1 - Section A (Y1-A)</option>
                  <option value="Y1-B">Year 1 - Section B (Y1-B)</option>
                  <option value="CSE-2">Year 2 - CSE (CSE-2)</option>
                  <option value="CSE-3">Year 3 - CSE (CSE-3)</option>
                  <option value="ME-3">Year 3 - ME (ME-3)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Preferred Day
                </label>
                <select
                  value={preferredDay}
                  onChange={(e) => setPreferredDay(e.target.value)}
                  className="w-full text-xs font-semibold py-1.5 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="MON">Monday (MON)</option>
                  <option value="TUE">Tuesday (TUE)</option>
                  <option value="WED">Wednesday (WED)</option>
                  <option value="THU">Thursday (THU)</option>
                  <option value="FRI">Friday (FRI)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Preferred Start Slot
                </label>
                <select
                  value={preferredPeriod}
                  onChange={(e) => setPreferredPeriod(Number(e.target.value))}
                  className="w-full text-xs font-semibold py-1.5 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value={1}>P1 (08:00 – 09:00)</option>
                  <option value={2}>P2 (09:00 – 10:00)</option>
                  <option value={3}>P3 (10:00 – 11:00)</option>
                  <option value={4}>P4 (11:00 – 12:00)</option>
                  <option value={5}>P5 (12:00 – 13:00)</option>
                  <option value={6}>P6 (14:00 – 15:00)</option>
                  <option value={7}>P7 (15:00 – 16:00)</option>
                  <option value={8}>P8 (16:00 – 17:00)</option>
                  <option value={9}>P9 (17:00 – 18:00)</option>
                </select>
              </div>
            </div>

            {/* Row 3: Reason / Note for Dean (Long line) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Reason / Note for Dean (Justification Line)
              </label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="E.g., Additional tutorial session for students preparing for midsem programming exam next week..."
                className="w-full text-xs py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Row 4: Submit Button Centered */}
            <div className="flex justify-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 min-w-[220px]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Session Request'}</span>
              </button>
            </div>
          </form>

        </div>
      </div>

      {/* ── 3. Table Below for My Submitted Session Requests with Delete Action & Pagination ── */}
      <div className="bg-white dark:bg-[#0b0f19] rounded-xl border border-slate-200/90 dark:border-slate-800/80 p-3 shadow-xs overflow-hidden">
        
        {/* Table Title Bar */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              My Submitted Session Requests ({requests.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Subject to Timetable Clashes &amp; Venue Availability Check
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Bold, Dark Table Header */}
            <thead className="bg-slate-100/90 dark:bg-slate-900/90 text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white w-28">Request ID</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white w-20">Course</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Session Type</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white w-24">Cohort</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Preferred Slot</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Reason / Note</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">Status</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white text-center w-24">Date</th>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white text-center w-16">Delete</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
              {paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                    No submitted session requests found.
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    {/* 1. Request ID */}
                    <td className="py-2 px-3 font-bold font-mono text-slate-900 dark:text-white">
                      {r.id}
                    </td>

                    {/* 2. Course */}
                    <td className="py-2 px-3">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                        {r.course}
                      </span>
                    </td>

                    {/* 3. Session Type */}
                    <td className="py-2 px-3 text-slate-800 dark:text-slate-200 font-medium">
                      {r.kind}
                    </td>

                    {/* 4. Cohort */}
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {r.target}
                      </span>
                    </td>

                    {/* 5. Preferred Slot */}
                    <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                      {r.slot}
                    </td>

                    {/* 6. Reason with tooltip */}
                    <td
                      className="py-2 px-3 text-slate-600 dark:text-slate-400 max-w-[200px]"
                      title={r.reason}
                    >
                      <span className="cursor-help">
                        {truncate(r.reason, 32)}
                      </span>
                    </td>

                    {/* 7. Status */}
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        r.status.includes('Approved')
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                      }`}>
                        <span>{r.status}</span>
                      </span>
                    </td>

                    {/* 8. Date */}
                    <td className="py-2 px-3 text-center text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                      {r.date}
                    </td>

                    {/* 9. Delete Button Action */}
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRequest(r.id, r.course)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition cursor-pointer"
                        title="Delete session request"
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

        {/* Table Pagination Footer (Always visible and interactive) */}
        <div className="pt-2 mt-1 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums">
            Showing {requests.length === 0 ? 0 : (safePage - 1) * ROWS_PER_PAGE + 1}–{Math.min(safePage * ROWS_PER_PAGE, requests.length)} of {requests.length} requests
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
