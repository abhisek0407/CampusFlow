'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { Inbox, CheckCircle2, XCircle, RefreshCw, AlertCircle, History, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Admin queue of timetable-change requests.
 *  - "Pending" tab : requests waiting for a decision (status 'analyzed'). Only live work lives here,
 *                    so a new request is always visible at the top.
 *  - "Decisions" tab: everything already approved / rejected (kept out of the pending list).
 *
 * Props:
 *  refreshKey      - change this number to make the queue reload (e.g. after the parent commits a version)
 *  hideId          - disruption id to hide from Pending (the one currently shown in the parent's simulation panel)
 *  onVersionChange - called with the live timetable version number whenever it is (re)loaded
 */
export default function AdminRequestsQueue({ onApproved, refreshKey = 0, hideId = null, onVersionChange }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [message, setMessage] = useState(null); // {type:'ok'|'err', text}
    const [tab, setTab] = useState('pending'); // 'pending' | 'decisions'
    const [decisionFilter, setDecisionFilter] = useState('all'); // all | approved | rejected
    const [expandedId, setExpandedId] = useState(null);
    const [currentVersion, setCurrentVersion] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/disruptions');
            const data = await res.json();
            if (data.success) setItems(data.disruptions || []);
            try {
                const vr = await apiFetch('/api/schedule/current');
                const vd = await vr.json();
                if (vd.success && vd.schedule?.version != null) {
                    setCurrentVersion(vd.schedule.version);
                    if (onVersionChange) onVersionChange(vd.schedule.version);
                }
            } catch (e) {
                /* version badge is optional */
            }
        } catch (e) {
            console.error('Failed to load requests', e);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        load();
    }, [load, refreshKey]);

    const pending = items.filter((d) => d.status === 'analyzed' && d._id !== hideId);
    const decided = items.filter((d) => ['approved', 'rejected', 'applied'].includes(d.status));
    const shownDecisions = decided.filter((d) => decisionFilter === 'all' || d.status === decisionFilter);

    async function approve(d) {
        setBusyId(d._id);
        setMessage(null);
        try {
            const res = await apiFetch('/api/disruptions/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ disruption_id: d._id }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setMessage({ type: 'err', text: data.error || 'Approval failed' });
            } else {
                setMessage({ type: 'ok', text: `${d._id} approved. The live timetable is now version ${data.new_version ?? data.version ?? ''}. It moved to the "Decisions" tab. Other pending requests made on the old version are now marked Outdated - use Re-check.` });
                if (onApproved) onApproved(data);
                await load();
            }
        } catch (e) {
            setMessage({ type: 'err', text: e.message || 'Network error' });
        } finally {
            setBusyId(null);
        }
    }

    async function reject(d) {
        const reason = window.prompt('Reason for rejecting this request (the faculty will see it):');
        if (!reason || !reason.trim()) return;
        setBusyId(d._id);
        setMessage(null);
        try {
            const res = await apiFetch('/api/disruptions/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ disruption_id: d._id, reason }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setMessage({ type: 'err', text: data.error || 'Reject failed' });
            } else {
                setMessage({ type: 'ok', text: `${d._id} rejected. It moved to the "Decisions" tab.` });
                await load();
            }
        } catch (e) {
            setMessage({ type: 'err', text: e.message || 'Network error' });
        } finally {
            setBusyId(null);
        }
    }

    // Outdated request (timetable changed after it was made): re-run the solver on the latest
    // timetable with the same changes, then retire the old one.
    async function recheck(d) {
        setBusyId(d._id);
        setMessage(null);
        try {
            const res = await apiFetch('/api/disruptions/propose', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: `${d.title} (re-checked)`, changes: d.changes, reason: `Re-check of ${d._id} on latest timetable` }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setMessage({ type: 'err', text: data.error || 'Re-check failed' });
                return;
            }
            await apiFetch('/api/disruptions/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ disruption_id: d._id, reason: `Superseded by ${data.disruption_id} (timetable changed)` }),
            });
            setMessage({ type: 'ok', text: `${d._id} re-checked on the latest timetable as ${data.disruption_id}. Review and approve the new one.` });
            await load();
        } catch (e) {
            setMessage({ type: 'err', text: e.message || 'Network error' });
        } finally {
            setBusyId(null);
        }
    }

    const staleList = pending.filter((d) => currentVersion != null && (d.base_version || 1) !== currentVersion);

    // Retire every outdated request in one go (they can no longer be approved anyway).
    async function rejectAllOutdated() {
        if (staleList.length === 0) return;
        if (!window.confirm(`Reject ${staleList.length} outdated request(s)? They were made on an older timetable and can no longer be approved.`)) return;
        setBusyId('__bulk__');
        setMessage(null);
        let ok = 0;
        for (const d of staleList) {
            try {
                const res = await apiFetch('/api/disruptions/reject', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ disruption_id: d._id, reason: `Outdated: timetable changed from v${d.base_version || 1} to v${currentVersion} (bulk cleanup)` }),
                });
                const data = await res.json();
                if (res.ok && data.success) ok += 1;
            } catch (e) { /* keep going */ }
        }
        setMessage({ type: ok === staleList.length ? 'ok' : 'err', text: `${ok} of ${staleList.length} outdated request(s) rejected. See the Decisions tab.` });
        await load();
        setBusyId(null);
    }

    function describeChange(ch) {
        if (ch.type === 'faculty_unavailable') {
            const p = Array.isArray(ch.periods) && ch.periods.length ? `P${Math.min(...ch.periods)}-P${Math.max(...ch.periods)}` : '';
            const when = ch.date_from ? `${ch.date_from}${ch.date_to && ch.date_to !== ch.date_from ? ' to ' + ch.date_to : ''}` : (ch.days || []).join(', ');
            return `Faculty ${ch.faculty_id} unavailable ${when} ${p}${ch.reason ? ` - "${ch.reason}"` : ''}`;
        }
        if (ch.type === 'room_unavailable') return `Room ${ch.room_id} closed ${(ch.days || []).join(', ')}`;
        if (ch.type === 'add_session') return `Add session ${ch.session?.id || ''}`.trim();
        return ch.type;
    }

    const tabBtn = (id, label, count, Icon) => (
        <button
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                tab === id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
        >
            <Icon className="w-3.5 h-3.5" />
            {label}
            <span className={`px-1.5 rounded-full text-[10px] font-bold ${tab === id ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                {count}
            </span>
        </button>
    );

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Faculty Requests</h3>
                    {currentVersion != null && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Live timetable v{currentVersion}
                        </span>
                    )}
                </div>
                <button type="button" onClick={load} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            <div className="flex items-center gap-2">
                {tabBtn('pending', 'Pending', pending.length, Inbox)}
                {tabBtn('decisions', 'Decisions', decided.length, History)}
            </div>

            {message && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${message.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                    {message.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{message.text}</span>
                </div>
            )}

            {/* ---------------- PENDING TAB ---------------- */}
            {tab === 'pending' && (
                <>
                    {!loading && pending.length === 0 && (
                        <p className="text-xs text-slate-500 italic">No pending requests. New requests from faculty will appear here.</p>
                    )}

                    {staleList.length > 0 && (
                        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs">
                            <span>{staleList.length} request(s) are outdated and cannot be approved as they are.</span>
                            <button type="button" disabled={busyId === '__bulk__'} onClick={rejectAllOutdated}
                                className="px-3 py-1.5 rounded-lg font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 whitespace-nowrap">
                                {busyId === '__bulk__' ? 'Rejecting...' : 'Reject all outdated'}
                            </button>
                        </div>
                    )}

                    <div className="space-y-3">
                        {pending.map((d) => {
                            const p = d.proposal || {};
                            const moved = Array.isArray(p.diff) ? p.diff : [];
                            const stale = currentVersion != null && (d.base_version || 1) !== currentVersion;
                            return (
                                <div key={d._id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{d.title}</p>
                                            <p className="text-[11px] text-slate-500 font-mono">
                                                {d._id} · from {d.source} · base v{d.base_version}
                                                {d.createdAt ? ` · ${new Date(d.createdAt).toLocaleString()}` : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] font-semibold flex-wrap">
                                            {stale && (
                                                <span className="px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-300">
                                                    Outdated (made on v{d.base_version || 1}, timetable is now v{currentVersion})
                                                </span>
                                            )}
                                            <span className={`px-2 py-0.5 rounded-full border ${p.feasible ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                {p.feasible ? 'Feasible' : 'Not fully feasible'}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200">
                                                {moved.length} moved · {p.unchanged_count ?? '-'} unchanged · {p.validator?.hard_violation_count ?? 0} violations
                                            </span>
                                        </div>
                                    </div>

                                    <ul className="text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                                        {(d.changes || []).map((ch, i) => (
                                            <li key={i}>{describeChange(ch)}</li>
                                        ))}
                                    </ul>

                                    {moved.length > 0 && (
                                        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 uppercase text-[10px]">
                                                    <tr><th className="p-2">Session</th><th className="p-2">From</th><th className="p-2">To</th></tr>
                                                </thead>
                                                <tbody>
                                                    {moved.map((m, i) => (
                                                        <tr key={i}>
                                                            <td className="p-2 font-mono font-semibold">{m.session_id}</td>
                                                            <td className="p-2 text-slate-500">{m.old ? `${m.old.day} P${m.old.start_period} (${m.old.room_id})` : '-'}</td>
                                                            <td className="p-2 font-semibold text-indigo-600">{m.new ? `${m.new.day} P${m.new.start_period} (${m.new.room_id})` : 'Dropped'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-end gap-2">
                                        <button type="button" disabled={busyId === d._id} onClick={() => reject(d)}
                                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 disabled:opacity-50 flex items-center gap-1">
                                            <XCircle className="w-4 h-4" /> Reject
                                        </button>
                                        {stale ? (
                                            <button type="button" disabled={busyId === d._id} onClick={() => recheck(d)}
                                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow disabled:opacity-50 flex items-center gap-1">
                                                <RefreshCw className="w-4 h-4" /> {busyId === d._id ? 'Re-checking...' : 'Re-check on latest timetable'}
                                            </button>
                                        ) : (
                                            <button type="button" disabled={busyId === d._id || !p.feasible} onClick={() => approve(d)}
                                                title={!p.feasible ? 'Solver proposal is not fully feasible' : ''}
                                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow disabled:opacity-50 flex items-center gap-1">
                                                <CheckCircle2 className="w-4 h-4" /> {busyId === d._id ? 'Working...' : 'Approve & Apply'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* ---------------- DECISIONS TAB ---------------- */}
            {tab === 'decisions' && (
                <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                        {[['all', 'All'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([id, label]) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setDecisionFilter(id)}
                                className={`px-2.5 py-1 rounded-full border transition ${
                                    decisionFilter === id
                                        ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900'
                                        : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {shownDecisions.length === 0 && (
                        <p className="text-xs text-slate-500 italic">No decisions yet.</p>
                    )}

                    <ul className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                        {shownDecisions.map((d) => {
                            const isRejected = d.status === 'rejected';
                            const open = expandedId === d._id;
                            const moved = Array.isArray(d.proposal?.diff) ? d.proposal.diff : [];
                            return (
                                <li key={d._id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    <button
                                        type="button"
                                        onClick={() => setExpandedId(open ? null : d._id)}
                                        className="w-full flex items-center justify-between gap-3 p-3 text-left"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{d.title}</p>
                                            <p className="text-[11px] text-slate-500 font-mono truncate">
                                                {d._id} · from {d.source}
                                                {d.approved_by ? ` · decided by ${d.approved_by}` : ''}
                                                {d.updatedAt ? ` · ${new Date(d.updatedAt).toLocaleString()}` : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {!isRejected && d.applied_version != null && (
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                    → v{d.applied_version}
                                                </span>
                                            )}
                                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${isRejected ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                {d.status}
                                            </span>
                                            {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                        </div>
                                    </button>
                                    {open && (
                                        <div className="px-3 pb-3 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                                            <ul className="list-disc list-inside">
                                                {(d.changes || []).map((ch, i) => <li key={i}>{describeChange(ch)}</li>)}
                                            </ul>
                                            {d.decision_reason && (
                                                <p className="italic text-slate-500">Reason: {d.decision_reason}</p>
                                            )}
                                            {moved.length > 0 && (
                                                <p className="text-[11px] text-slate-500">
                                                    {moved.length} session(s) moved: {moved.map((m) => m.session_id).join(', ')}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
