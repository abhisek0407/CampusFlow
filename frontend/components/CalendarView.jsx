'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { ChevronLeft, ChevronRight, CalendarDays, Download, ExternalLink, PlusCircle, RefreshCw } from 'lucide-react';

/**
 * Role-aware calendar.
 *  - faculty:  own classes + own leave requests (draft / pending / approved / rejected)
 *  - admin / coordinator: all submitted faculty leave requests
 * Every event can be added to Google Calendar (one click) and the whole month can be exported as .ics
 */

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ---------- tiny ISO date helpers (UTC based) ----------
const iso = (d) => d.toISOString().slice(0, 10);
const parse = (s) => new Date(`${s}T00:00:00Z`);
const addDays = (s, n) => {
  const d = parse(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const todayIso = () => new Date().toLocaleDateString('en-CA'); // local date, YYYY-MM-DD

function buildGrid(year, month) {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7; // Monday first
  const start = addDays(iso(first), -offset);
  const last = new Date(Date.UTC(year, month + 1, 0));
  const total = Math.ceil((offset + last.getUTCDate()) / 7) * 7;
  return Array.from({ length: total }, (_, i) => addDays(start, i));
}

// ---------- Google Calendar / ICS ----------
const compact = (date, time) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;

function googleUrl(e) {
  const heading = e.heading || e.title;
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: heading,
    dates: `${compact(e.date, e.start)}/${compact(e.date, e.end)}`,
    ctz: 'Asia/Kolkata',
    details: [
      e.course_id && `Course: ${e.course_id} ${e.course_title || ''}`,
      e.class_kind && `Type: ${e.class_kind}`,
      e.room && `Room: ${e.room}`,
      e.period_label && `Period: ${e.period_label} (${e.start}-${e.end})`,
      e.groups?.length && `Cohort: ${e.groups.join(', ')}`,
      e.faculty_name && `Faculty: ${e.faculty_name}`,
      e.session_id && `Session: ${e.session_id}`,
      e.status && e.kind === 'leave' && `Status: ${e.status}${e.recurring ? ' (weekly)' : ''}`,
      e.subtitle,
      e.request_id && `Request ${e.request_id}`,
    ].filter(Boolean).join('\n'),
    location: e.room ? `Room ${e.room}, Chilika Institute of Technology` : '',
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

const icsEsc = (t) => String(t || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

function buildIcs(events) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CampusFlow//CIT//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@campusflow.cit`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Asia/Kolkata:${compact(e.date, e.start)}`,
      `DTEND;TZID=Asia/Kolkata:${compact(e.date, e.end)}`,
      `SUMMARY:${icsEsc(e.heading || e.title)}`,
      `DESCRIPTION:${icsEsc([
        e.course_id && `Course: ${e.course_id} ${e.course_title || ''}`,
        e.class_kind && `Type: ${e.class_kind}`,
        e.room && `Room: ${e.room}`,
        e.period_label && `Period: ${e.period_label}`,
        e.groups?.length && `Cohort: ${e.groups.join(', ')}`,
        e.faculty_name && `Faculty: ${e.faculty_name}`,
        e.subtitle,
      ].filter(Boolean).join('\n'))}`,
      `LOCATION:${icsEsc(e.room ? `Room ${e.room}, CIT` : '')}`,
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function chipClass(e) {
  if (e.kind === 'class') return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
  switch (e.status) {
    case 'approved': return 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300';
    case 'pending': return 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300';
    case 'rejected': return 'bg-slate-100 text-slate-500 border-slate-300 line-through dark:bg-slate-800';
    case 'draft': return 'bg-indigo-50 text-indigo-700 border-indigo-300 border-dashed dark:bg-indigo-950/40 dark:text-indigo-300';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

export default function CalendarView({ currentUser: currentUserProp, setActiveTab }) {
  const [storedUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cit_user') || 'null'); } catch (e) { return null; }
  });
  const user = currentUserProp || storedUser;
  const role = user?.role;

  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(todayIso());
  const [showClasses, setShowClasses] = useState(true);
  const [facultyFilter, setFacultyFilter] = useState('all');

  const grid = useMemo(() => buildGrid(cursor.y, cursor.m), [cursor]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/calendar/events?from=${grid[0]}&to=${grid[grid.length - 1]}`);
      const data = await res.json();
      if (!res.ok || !data.success) setError(data.error || 'Could not load calendar');
      else setEvents(data.events || []);
    } catch (e) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [grid]);

  useEffect(() => { load(); }, [load]);

  const facultyIds = useMemo(() => [...new Set(events.filter((e) => e.kind === 'leave').map((e) => e.faculty_id))].sort(), [events]);

  const visible = useMemo(() => events.filter((e) => {
    if (e.kind === 'class' && !showClasses) return false;
    if (role !== 'faculty' && facultyFilter !== 'all' && e.faculty_id !== facultyFilter) return false;
    return true;
  }), [events, showClasses, facultyFilter, role]);

  const byDate = useMemo(() => {
    const m = {};
    for (const e of visible) (m[e.date] = m[e.date] || []).push(e);
    return m;
  }, [visible]);

  const monthEvents = visible.filter((e) => e.date.startsWith(`${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`));
  const dayEvents = byDate[selected] || [];
  const today = todayIso();

  function move(delta) {
    setCursor((c) => {
      const d = new Date(Date.UTC(c.y, c.m + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    });
  }

  function exportIcs() {
    const blob = new Blob([buildIcs(monthEvents)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campusflow-${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function requestLeaveOn(date) {
    try { sessionStorage.setItem('cf_prefill_date', date); } catch (e) { /* ignore */ }
    if (setActiveTab) setActiveTab('ai-faculty-assistant');
  }

  const manageTab = role === 'admin' ? 'disruptions' : role === 'department_coordinator' ? 'schedule-change-requests' : null;

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {role === 'faculty' ? 'My Calendar' : 'Faculty Leave Calendar'}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {role !== 'faculty' && (
              <select value={facultyFilter} onChange={(e) => setFacultyFilter(e.target.value)}
                className="text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
                <option value="all">All faculty</option>
                {facultyIds.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            )}
            {role === 'faculty' && (
              <label className="text-xs flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={showClasses} onChange={(e) => setShowClasses(e.target.checked)} /> Show my classes
              </label>
            )}
            <button type="button" onClick={load} className="text-xs flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button type="button" onClick={exportIcs} disabled={monthEvents.length === 0}
              title="Download this month as .ics - import it into Google Calendar (Settings > Import & export)"
              className="text-xs flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50">
              <Download className="w-3.5 h-3.5" /> Export month (.ics)
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <button type="button" onClick={() => move(-1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft className="w-4 h-4" /></button>
          <div className="text-sm font-bold text-slate-900 dark:text-white">{MONTH_NAMES[cursor.m]} {cursor.y}</div>
          <button type="button" onClick={() => move(1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight className="w-4 h-4" /></button>
        </div>

        {error && <p className="mt-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">{error}</p>}

        <div className="grid grid-cols-7 mt-3 text-[11px] font-semibold text-slate-500 text-center">
          {WEEKDAYS.map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
          {grid.map((date) => {
            const inMonth = parse(date).getUTCMonth() === cursor.m;
            const list = byDate[date] || [];
            const isToday = date === today;
            const isSel = date === selected;
            return (
              <button key={date} type="button" onClick={() => setSelected(date)}
                className={`min-h-[84px] text-left p-1.5 align-top bg-white dark:bg-slate-900 hover:bg-indigo-50/60 dark:hover:bg-slate-800 transition ${inMonth ? '' : 'opacity-40'} ${isSel ? 'ring-2 ring-indigo-500 z-10' : ''}`}>
                <div className={`text-[11px] font-semibold mb-1 ${isToday ? 'inline-flex w-5 h-5 items-center justify-center rounded-full bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                  {parse(date).getUTCDate()}
                </div>
                <div className="space-y-0.5">
                  {list.slice(0, 2).map((e) => (
                    <div key={e.id} title={e.heading} className={`truncate text-[10px] px-1 py-0.5 rounded border ${chipClass(e)}`}>
                      {e.start} {e.title}{e.room ? ` · ${e.room}` : ''}
                    </div>
                  ))}
                  {list.length > 2 && <div className="text-[10px] text-slate-500">+{list.length - 2} more</div>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-slate-600 dark:text-slate-300">
          {role === 'faculty' && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200 border border-blue-300" /> Class</span>}
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-100 border border-dashed border-indigo-400" /> Draft</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-200 border border-amber-300" /> Pending approval</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-300" /> Approved</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-200 border border-slate-300" /> Rejected</span>
        </div>
      </div>

      {/* Selected day panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {parse(selected).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
          </h3>
          {role === 'faculty' && selected >= today && (
            <button type="button" onClick={() => requestLeaveOn(selected)}
              className="text-xs flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
              <PlusCircle className="w-3.5 h-3.5" /> Request unavailability for this date
            </button>
          )}
        </div>

        {dayEvents.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Nothing scheduled on this day.</p>
        ) : (
          <ul className="space-y-2">
            {dayEvents.map((e) => (
              <li key={e.id} className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${chipClass(e)}`}>
                <div>
                  <p className="font-bold">{e.heading || `${e.start} - ${e.end} · ${e.title}`}</p>
                  <p className="opacity-80">
                    {e.kind === 'leave'
                      ? `${e.status.toUpperCase()}${e.recurring ? ' (weekly)' : ''} · ${e.request_id} · ${e.subtitle || ''}`
                      : `${e.start}–${e.end} · ${e.subtitle || ''}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={googleUrl(e)} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 no-underline">
                    <ExternalLink className="w-3 h-3" /> Add to Google Calendar
                  </a>
                  {e.kind === 'leave' && manageTab && setActiveTab && (
                    <button type="button" onClick={() => setActiveTab(manageTab)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold">Open request</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
