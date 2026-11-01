'use client';
import { apiFetch } from '@/lib/api';

import React, { useState, useEffect } from 'react';
import AdminRequestsQueue from './AdminRequestsQueue';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Clock,
  DoorOpen,
  UserMinus,
  Sparkles,
  RotateCcw,
  Layers,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

export default function DisruptionView({ currentUser }) {
  const [disruptions, setDisruptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [activeVersion, setActiveVersion] = useState(null); // real live version, loaded from the server
  const [queueRefresh, setQueueRefresh] = useState(0);
  const [isApproving, setIsApproving] = useState(false);
  const [approvedSuccess, setApprovedSuccess] = useState(false);
  const [diffPage, setDiffPage] = useState(1);
  const DIFF_PER_PAGE = 5;

  useEffect(() => {
    fetchDisruptions();
    fetchLiveVersion();
  }, []);

  async function fetchLiveVersion() {
    try {
      const res = await apiFetch('/api/schedule/current');
      const data = await res.json();
      if (data.success && data.schedule?.version != null) {
        setActiveVersion(data.schedule.version);
        return data.schedule.version;
      }
    } catch (e) {
      console.error('Failed to load live timetable version:', e);
    }
    return null;
  }

  async function fetchDisruptions() {
    setLoading(true);
    try {
      const res = await apiFetch('/api/disruptions');
      const data = await res.json();
      if (data.success) {
        setDisruptions(data.disruptions || []);
      }
    } catch (e) {
      console.error('Failed to load disruptions:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadSampleDisruption() {
    setIsSimulating(true);
    setSimulationResult(null);
    setApprovedSuccess(false);

    try {
      // Retire earlier un-approved sample proposals so only one exists at a time.
      try {
        const listRes = await apiFetch('/api/disruptions');
        const listData = await listRes.json();
        const oldSamples = (listData.disruptions || []).filter(
          (d) => d.status === 'analyzed' && d.source === 'admin' && String(d.title || '').startsWith('Official Sample Disruption')
        );
        for (const d of oldSamples) {
          await apiFetch('/api/disruptions/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ disruption_id: d._id, reason: 'Superseded by a newer sample simulation' }),
          });
        }
      } catch (e) {
        console.warn('Could not retire old sample proposals:', e);
      }

      const samplePayload = {
        title: "Official Sample Disruption: F07 Leave + CR-102 Leak + CS202-T2 Added",
        changes: [
          {
            type: "faculty_unavailable",
            faculty_id: "F07",
            days: ["MON"],
            periods: [1, 2, 3, 4, 5, 6, 7, 8, 9],
            reason: "Conference travel every Monday for the rest of the semester"
          },
          {
            type: "room_unavailable",
            room_id: "CR-102",
            days: ["MON", "TUE", "WED", "THU", "FRI"],
            periods: [1, 2, 3, 4, 5, 6, 7, 8, 9],
            reason: "Water leak, room closed for the rest of the semester"
          },
          {
            type: "add_session",
            session: {
              id: "CS202-T2",
              course_id: "CS202",
              kind: "tutorial",
              groups: ["CSE-2"],
              faculty_id: "F06",
              size: 80,
              duration: 1,
              room_types: ["classroom", "lecture_hall", "auditorium"],
              needs_accessible: false,
              basket_slot: null,
              fixed_slot: null
            }
          }
        ]
      };

      const res = await apiFetch('/api/disruptions/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samplePayload),
      });
      const data = await res.json();
      if (data.success) {
        setSimulationResult(data);
        setDiffPage(1);
        fetchLiveVersion();
        setQueueRefresh((n) => n + 1);
      } else {
        alert(data.error || 'Rescheduling failed');
      }
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setIsSimulating(false);
    }
  }

  async function handleApproveDisruption() {
    if (!simulationResult?.disruption_id) return;
    setIsApproving(true);
    try {
      const res = await apiFetch('/api/disruptions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disruption_id: simulationResult.disruption_id,
          approved_by: currentUser?.name || "Dean Academic Office",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setApprovedSuccess(true);
        const committed = data.new_version ?? (typeof data.version === 'object' ? data.version?.version : data.version);
        if (committed != null) setActiveVersion(committed);
        else await fetchLiveVersion();
        setSimulationResult(null); // it is now a decision; it lives in the "Decisions" tab
        fetchDisruptions();
        setQueueRefresh((n) => n + 1);
      } else {
        alert(data.error || 'Approval failed');
      }
    } catch (e) {
      console.error('Approve error:', e);
    } finally {
      setIsApproving(false);
    }
  }

  const proposal = simulationResult?.proposal || null;
  const formatSlot = (a) => (a ? `${a.day} P${a.start_period} (${a.room_id})` : '-');
  const allDiffItems = (proposal?.diff || []).map((m) => ({
    id: m.session_id,
    old: formatSlot(m.old),
    new: m.new ? formatSlot(m.new) : 'Dropped',
    type: m.type || 'time_and_room', // 'room_only' | 'time_and_room' | 'added'
  }));
  const movedCount = allDiffItems.length;
  const totalSessions = (proposal?.unchanged_count ?? 0) + allDiffItems.filter((i) => i.type !== 'added').length;
  const retentionPct = totalSessions > 0 ? (((proposal?.unchanged_count ?? 0) / totalSessions) * 100).toFixed(1) : null;
  const roomOnlyCount = allDiffItems.filter((i) => i.type === 'room_only').length;
  const timeChangeCount = allDiffItems.filter((i) => i.type === 'time_and_room').length;
  const nextVersion = activeVersion != null ? activeVersion + 1 : null;
  const diffTotalPages = Math.max(1, Math.ceil(allDiffItems.length / DIFF_PER_PAGE));
  const safeDiffPage = Math.min(diffPage, diffTotalPages);
  const paginatedDiff = allDiffItems.slice((safeDiffPage - 1) * DIFF_PER_PAGE, safeDiffPage * DIFF_PER_PAGE);

  return (
    <div className="space-y-6">

      {/* NEW: faculty requests waiting for admin approval */}
      <AdminRequestsQueue
        refreshKey={queueRefresh}
        hideId={simulationResult?.disruption_id || null}
        onVersionChange={(v) => setActiveVersion(v)}
        onApproved={() => fetchDisruptions()}
      />

      {/* Header & Quick Simulation Bar (Unboxed, Consistent text-2xl) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              Dynamic Disruption Management
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700" title="Live timetable version">
              {activeVersion != null ? `v${activeVersion}` : 'v…'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Handles emergency faculty leaves, room closures, or new sessions with CP-SAT minimal-move stability.
          </p>
        </div>

        {/* 1-Click Official Sample Disruption Runner */}
        <button
          onClick={handleLoadSampleDisruption}
          disabled={isSimulating}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition disabled:opacity-50 self-start md:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isSimulating ? 'Computing Optimal Reschedule...' : 'Simulate Sample Disruption'}</span>
        </button>
      </div>

      {/* Success Notification */}
      {approvedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>
              <strong>Timetable promoted to v{activeVersion}!</strong> Admin approved the changes. The decision is listed under Faculty Requests → Decisions.
            </span>
          </div>
          <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900">
            0 Hard Violations
          </span>
        </div>
      )}

      {/* Simulation Result Diff View (Section 2 Requirement 5) */}
      {simulationResult && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5 animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Proposed Candidate Schedule
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                Stability Diff Analysis (CP-SAT Solver)
              </h3>
            </div>

            {/* Stability KPI Badges */}
            <div className="flex items-center space-x-2">
              <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-center border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] text-slate-400 font-medium">Sessions Moved</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {movedCount} / {totalSessions || '-'}
                </div>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-center border border-emerald-200 dark:border-emerald-800">
                <div className="text-[10px] text-emerald-600 font-medium">Stability Retention</div>
                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  {retentionPct != null ? `${retentionPct}%` : '-'}
                </div>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-center border border-blue-200 dark:border-blue-800">
                <div className="text-[10px] text-blue-600 font-medium">Room-Only Moves</div>
                <div className="text-sm font-bold text-blue-700 dark:text-blue-300">
                  {proposal?.validator?.stability?.room_only_changed ?? roomOnlyCount}
                </div>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-center border border-indigo-200 dark:border-indigo-800">
                <div className="text-[10px] text-indigo-600 font-medium">Time Changes</div>
                <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                  {proposal?.validator?.stability?.time_changed ?? timeChangeCount}
                </div>
              </div>
            </div>
          </div>

          {/* Table of Changes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Exact Modifications Diff ({movedCount} Moved Sessions)
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                Page {safeDiffPage} of {diffTotalPages}
              </span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2 px-3 text-[11px]">Session ID</th>
                    <th className="py-2 px-3 text-[11px]">Baseline Slot</th>
                    <th className="py-2 px-3 text-center text-[11px]">Move</th>
                    <th className="py-2 px-3 text-[11px]">Proposed Slot</th>
                    <th className="py-2 px-3 text-[11px]">Change Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedDiff.length === 0 && (
                    <tr><td colSpan={5} className="py-4 px-3 text-center text-slate-400 italic">No sessions needed to move.</td></tr>
                  )}
                  {paginatedDiff.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {item.id}
                      </td>
                      <td className="py-2 px-3 text-slate-500 line-through text-[11px]">
                        {item.old}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-400">
                        &rarr;
                      </td>
                      <td className="py-2 px-3 font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">
                        {item.new}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                          item.type === 'room_only'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                          {item.type === 'room_only' ? 'Room Swap Only (Cost: 1)' : item.type === 'added' ? 'New Session' : 'Time Shift (Cost: 10)'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Diff */}
            {diffTotalPages > 1 && (
              <div className="flex items-center justify-between pt-2 px-1 text-xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Showing {(safeDiffPage - 1) * DIFF_PER_PAGE + 1}–{Math.min(safeDiffPage * DIFF_PER_PAGE, allDiffItems.length)} of {allDiffItems.length}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setDiffPage(p => Math.max(1, p - 1))}
                    disabled={safeDiffPage === 1}
                    className="p-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {Array.from({ length: diffTotalPages }, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      onClick={() => setDiffPage(num)}
                      className={`min-w-[24px] h-6 px-1.5 rounded-md text-[11px] font-semibold transition ${
                        safeDiffPage === num
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => setDiffPage(p => Math.min(diffTotalPages, p + 1))}
                    disabled={safeDiffPage === diffTotalPages}
                    className="p-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Admin Approval Button (Section 2 Requirement 5) */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Role Permission: Only <strong>Dean Academic Office (Admin)</strong> can approve and commit.
            </span>

            {currentUser?.role === 'admin' ? (
              <button
                onClick={handleApproveDisruption}
                disabled={isApproving || proposal?.feasible === false}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isApproving ? 'Promoting to Active Version...' : `Approve & Commit Reschedule${nextVersion != null ? ` (→ v${nextVersion})` : ''}`}</span>
              </button>
            ) : (
              <div className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Switch to Dean Account (Admin) to approve</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disruption Registry Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          Registered Disruption Events
        </h3>

        {loading && <p className="text-xs text-slate-500 italic">Loading…</p>}
        {!loading && disruptions.length === 0 && (
          <p className="text-xs text-slate-500 italic">No disruption events registered yet.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-[26rem] overflow-y-auto pr-1">
          {disruptions.filter((d) => d.status !== 'draft').slice(0, 12).map((d) => {
            const first = (d.changes || [])[0] || {};
            const Icon = first.type === 'room_unavailable' ? DoorOpen : first.type === 'add_session' ? Sparkles : UserMinus;
            const iconColor = first.type === 'room_unavailable' ? 'text-amber-500' : first.type === 'add_session' ? 'text-blue-500' : 'text-rose-500';
            const badge =
              d.status === 'approved' ? { text: `Applied in v${d.applied_version ?? (d.base_version || 1) + 1}`, cls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950' }
              : d.status === 'rejected' ? { text: 'Rejected', cls: 'text-rose-600 bg-rose-50 dark:bg-rose-950' }
              : { text: `Awaiting decision (base v${d.base_version || 1})`, cls: 'text-amber-700 bg-amber-50 dark:bg-amber-950' };
            return (
              <div key={d._id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                  <span className="truncate">{d.title}</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                  {d._id} · from {d.source}{d.createdAt ? ` · ${new Date(d.createdAt).toLocaleDateString()}` : ''}
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  {(d.changes || []).length} change(s){d.proposal?.diff ? ` · ${d.proposal.diff.length} session(s) moved` : ''}
                </p>
                <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded ${badge.cls}`}>
                  {badge.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
