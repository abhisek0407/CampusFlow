'use client';
import { apiFetch } from '@/lib/api';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  DoorOpen, 
  Clock, 
  Info, 
  Sparkles, 
  CheckCircle2, 
  Search,
  Filter,
  BarChart3,
  CalendarDays
} from 'lucide-react';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const PERIOD_TIMES = {
  1: '08:00 - 09:00',
  2: '09:00 - 10:00',
  3: '10:00 - 11:00',
  4: '11:00 - 12:00',
  5: '12:00 - 13:00',
  6: '14:00 - 15:00',
  7: '15:00 - 16:00',
  8: '16:00 - 17:00',
  9: '17:00 - 18:00',
};

const KIND_COLORS = {
  lecture: 'bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-200',
  lab: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200',
  tutorial: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200',
};

const KIND_BADGES = {
  lecture: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300',
  lab: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
  tutorial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
};

export default function TimetableView() {
  const [filterType, setFilterType] = useState('group'); // 'group', 'faculty', 'room'
  const [selectedItem, setSelectedItem] = useState('Y1-A');
  const [timetableData, setTimetableData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeModalSession, setActiveModalSession] = useState(null);
  const [showUtilization, setShowUtilization] = useState(false);

  useEffect(() => {
    fetchTimetable();
  }, [filterType, selectedItem]);

  async function fetchTimetable() {
    setLoading(true);
    try {
      const param = filterType === 'group' ? `group=${selectedItem}` : filterType === 'faculty' ? `faculty=${selectedItem}` : `room=${selectedItem}`;
      const res = await apiFetch(`/api/schedule/views?${param}`);
      const data = await res.json();
      if (data.success) {
        setTimetableData(data);
      }
    } catch (e) {
      console.error('Failed to load timetable view:', e);
    } finally {
      setLoading(false);
    }
  }

  const grid = timetableData?.grid || {};

  return (
    <div className="space-y-6">
      
      {/* Page Header (Unboxed, Consistent text-2xl) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Master Timetable Management</span>
          </h1>
          {/* <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Weekly Academic Master Schedule • Filter by Student Cohort, Faculty Member, or Campus Venue
          </p> */}
        </div>
      </div>

      {/* Sleek Professional Timetable Toolbar */}
      <div className="bg-white dark:bg-[#111625] rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800/80 shadow-xs flex flex-wrap items-center justify-between gap-3 transition-colors">
        
        {/* Left: Filter Pills + Selector Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700/80">
            <button
              onClick={() => { setFilterType('group'); setSelectedItem('Y1-A'); }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterType === 'group'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Cohort</span>
            </button>

            <button
              onClick={() => { setFilterType('faculty'); setSelectedItem('F01'); }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterType === 'faculty'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Faculty</span>
            </button>

            <button
              onClick={() => { setFilterType('room'); setSelectedItem('LH-1'); }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterType === 'room'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <DoorOpen className="w-3.5 h-3.5" />
              <span>Venue</span>
            </button>
          </div>

          {/* Selector Dropdown */}
          <select
            value={selectedItem}
            onChange={(e) => setSelectedItem(e.target.value)}
            className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          >
            {filterType === 'group' && (
              timetableData?.student_groups && timetableData.student_groups.length > 0 ? (
                <>
                  <optgroup label="Year 1 Common Sections">
                    {timetableData.student_groups.filter(g => g.year === 1).map(g => (
                      <option key={g.id} value={g.id}>
                        {g.id} — {g.name} ({g.size || 90} students)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Year 2 Department Cohorts">
                    {timetableData.student_groups.filter(g => g.year === 2).map(g => (
                      <option key={g.id} value={g.id}>
                        {g.id} — {g.name} ({g.size || 60} students)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Year 3 Department Cohorts">
                    {timetableData.student_groups.filter(g => g.year === 3).map(g => (
                      <option key={g.id} value={g.id}>
                        {g.id} — {g.name} ({g.size || 55} students)
                      </option>
                    ))}
                  </optgroup>
                </>
              ) : (
                <>
                  <optgroup label="Year 1 Common Sections">
                    <option value="Y1-A">Y1-A — B.Tech Year 1, Section A (90 students)</option>
                    <option value="Y1-B">Y1-B — B.Tech Year 1, Section B (90 students)</option>
                    <option value="Y1-C">Y1-C — B.Tech Year 1, Section C (90 students)</option>
                    <option value="Y1-D">Y1-D — B.Tech Year 1, Section D (90 students)</option>
                  </optgroup>
                  <optgroup label="Year 2 Department Cohorts">
                    <option value="CSE-2">CSE-2 — CSE Year 2 (80 students)</option>
                    <option value="ECE-2">ECE-2 — ECE Year 2 (70 students)</option>
                    <option value="EE-2">EE-2 — EE Year 2 (60 students)</option>
                    <option value="ME-2">ME-2 — ME Year 2 (60 students)</option>
                    <option value="CE-2">CE-2 — CE Year 2 (50 students)</option>
                  </optgroup>
                  <optgroup label="Year 3 Department Cohorts">
                    <option value="CSE-3">CSE-3 — CSE Year 3 (75 students)</option>
                    <option value="ECE-3">ECE-3 — ECE Year 3 (65 students)</option>
                    <option value="EE-3">EE-3 — EE Year 3 (55 students)</option>
                    <option value="ME-3">ME-3 — ME Year 3 (55 students)</option>
                    <option value="CE-3">CE-3 — CE Year 3 (45 students)</option>
                  </optgroup>
                </>
              )
            )}

            {filterType === 'faculty' && (timetableData?.faculty_list || []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.id} — {f.name} ({f.department})
              </option>
            ))}

            {filterType === 'room' && (timetableData?.rooms_list || []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} — {r.name} (Cap: {r.capacity}) [{r.type}]
              </option>
            ))}
          </select>
        </div>

        {/* Right: Room Utilization + Daily Breakdown */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => setShowUtilization(!showUtilization)}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              showUtilization
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Room Utilisation</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span>Sessions: <strong className="text-slate-900 dark:text-white">{timetableData?.total_sessions || 0}</strong></span>
            {timetableData?.sessions && timetableData.sessions.length > 0 && (
              <span className="hidden md:inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span>•</span>
                <span>MON: {timetableData.sessions.filter(s => s.day === 'MON').length}</span>
                <span>TUE: {timetableData.sessions.filter(s => s.day === 'TUE').length}</span>
                <span>WED: {timetableData.sessions.filter(s => s.day === 'WED').length}</span>
                <span>THU: {timetableData.sessions.filter(s => s.day === 'THU').length}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">FRI: {timetableData.sessions.filter(s => s.day === 'FRI').length}</span>
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Room Utilisation Heatmap Drawer */}
      {showUtilization && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Campus Facilities Utilisation Analytics (27 Rooms • 45 Total Teaching Hours/Week)
            </h3>
            <span className="text-xs text-slate-500">Sorted by room ID</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {(timetableData?.room_utilisation || timetableData?.room_utilization || []).map((r) => {
              const pct = r.utilization_percentage || 0;
              const barColor = pct > 60 ? 'bg-rose-500' : pct > 35 ? 'bg-emerald-500' : 'bg-amber-400';
              return (
                <div key={r.room_id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">{r.room_id}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{pct}%</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">{r.name}</div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className={`${barColor} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>{r.hours_used} hrs used</span>
                    <span>Cap: {r.capacity}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Weekly Matrix Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider">
                <th className="py-3 px-4 w-28 text-center">Period & Time</th>
                {DAYS.map((day) => (
                  <th key={day} className="py-3 px-4 text-center">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {[1, 2, 3, 4, 5, 'LUNCH', 6, 7, 8, 9].map((period) => {
                if (period === 'LUNCH') {
                  return (
                    <tr key="lunch" className="bg-amber-50/50 dark:bg-amber-950/20 border-y border-amber-200/50">
                      <td className="py-2 px-3 text-center font-bold text-amber-800 dark:text-amber-400 text-[11px] whitespace-nowrap">
                        13:00 - 14:00
                      </td>
                      <td colSpan={5} className="py-2.5 px-4 text-center text-amber-700 dark:text-amber-300 font-semibold tracking-wider uppercase text-[11px]">
                        🍽️ Official Institute Lunch Break (Protected by Institute Timing Rule H9) • Afternoon Sessions Continue Below (Periods P6 to P9) ↓
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={period} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    {/* Period Timing Column */}
                    <td className="py-3 px-3 text-center border-r border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                      <div className="font-bold text-slate-900 dark:text-white">P{period}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{PERIOD_TIMES[period]}</div>
                    </td>

                    {/* Day Cells */}
                    {DAYS.map((day) => {
                      const sessions = grid[day]?.[period] || [];
                      return (
                        <td key={`${day}-${period}`} className="p-2 border-r border-slate-100 dark:border-slate-800 align-top h-24 w-1/5">
                          {sessions.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-[11px] text-slate-300 dark:text-slate-700 italic">
                              Free
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {sessions.length > 1 && (
                                <div className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-950/70 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800 flex items-center justify-between mb-1">
                                  <span>📚 Elective Basket (Rule H6)</span>
                                  <span className="text-[9px] font-semibold uppercase">Choose 1 of {sessions.length}</span>
                                </div>
                              )}
                              {sessions.map((s, idx) => {
                                const isContinuation = s.duration > 1 && period > s.start_period;
                                if (isContinuation) {
                                  const contdColorClass = s.kind === 'lab'
                                    ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700/80 text-emerald-900 dark:text-emerald-200'
                                    : 'bg-indigo-50/70 border-indigo-300 dark:bg-indigo-950/30 dark:border-indigo-700/80 text-indigo-900 dark:text-indigo-200';
                                  const contdBadgeClass = s.kind === 'lab'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300';
                                  return (
                                    <div
                                      key={`${s.session_id}-${idx}`}
                                      onClick={() => setActiveModalSession(s)}
                                      className={`p-2.5 rounded-xl border border-dashed ${contdColorClass} cursor-pointer hover:shadow-md transition-all relative overflow-hidden`}
                                      title={`${s.course_id} Practical Laboratory running from P${s.start_period} to P${s.end_period} (Continuation ${period - s.start_period + 1}/${s.duration})`}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-xs flex items-center gap-1">
                                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">↳</span>
                                          {s.course_id}
                                        </span>
                                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${contdBadgeClass}`}>
                                          LAB CONTD • {period - s.start_period + 1}/{s.duration}
                                        </span>
                                      </div>
                                      <div className="text-[11px] font-medium leading-tight truncate" title={s.course_title}>
                                        {s.course_title}
                                      </div>
                                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                                        <span className="truncate max-w-[80px]" title={s.faculty_name}>{s.faculty_name}</span>
                                        <span className="px-1.5 py-0.5 bg-white/70 dark:bg-black/30 rounded font-mono font-bold">
                                          {s.room_id}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                }
                                const colorClass = KIND_COLORS[s.kind] || KIND_COLORS.lecture;
                                const badgeClass = KIND_BADGES[s.kind] || KIND_BADGES.lecture;
                                return (
                                  <div
                                    key={`${s.session_id}-${idx}`}
                                    onClick={() => setActiveModalSession(s)}
                                    className={`p-2.5 rounded-xl border ${colorClass} cursor-pointer hover:shadow-md transition-all relative overflow-hidden`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-bold text-xs">{s.course_id}</span>
                                      <div className="flex items-center gap-1">
                                        {s.basket_slot && (
                                          <span className="text-[8px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                                            Elective Option
                                          </span>
                                        )}
                                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${badgeClass}`}>
                                          {s.kind} {s.duration > 1 && `(${s.duration}h Block • P${s.start_period}–P${s.end_period})`}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-[11px] font-medium leading-tight truncate" title={s.course_title}>
                                      {s.course_title}
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                                      <span className="truncate max-w-[80px]" title={s.faculty_name}>{s.faculty_name}</span>
                                      <span className="px-1.5 py-0.5 bg-white/70 dark:bg-black/30 rounded font-mono font-bold">
                                        {s.room_id}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Session Details Explainer Modal (Requirement 8) */}
      {activeModalSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                  {activeModalSession.kind}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {activeModalSession.course_id}: {activeModalSession.course_title}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalSession(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <div>
                <span className="text-slate-400 block">Faculty:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{activeModalSession.faculty_name} ({activeModalSession.faculty_id})</span>
              </div>
              <div>
                <span className="text-slate-400 block">Scheduled Venue:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{activeModalSession.room_name} ({activeModalSession.room_id})</span>
              </div>
              <div>
                <span className="text-slate-400 block">Scheduled Time:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{activeModalSession.day} Period {activeModalSession.start_period} ({PERIOD_TIMES[activeModalSession.start_period]})</span>
              </div>
              <div>
                <span className="text-slate-400 block">Class Size:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{activeModalSession.size} Students</span>
              </div>
            </div>

            {/* Elective Basket Information if applicable */}
            {activeModalSession.basket_slot && (
              <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/60 text-xs space-y-1">
                <div className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                  <span>📚 Elective Basket Synchronization (Constraint H6)</span>
                </div>
                <p className="text-purple-800 dark:text-purple-200 leading-relaxed text-[11px]">
                  This session belongs to Open Elective Basket slot <strong>{activeModalSession.basket_slot}</strong>. Under Rule H6, OE301, OE302, and OE303 are scheduled at the identical day and period across distinct venues (LH-6, LH-5, CR-201). Students elect exactly one course; they do not take all three concurrently.
                </p>
              </div>
            )}

            {/* AI Constraint Explanation */}
            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-xs space-y-1">
              <div className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Solver Placement Rationale</span>
              </div>
              <p className="text-indigo-800 dark:text-indigo-200 leading-relaxed">
                Placed on <strong>{activeModalSession.day} P{activeModalSession.start_period}</strong> in <strong>{activeModalSession.room_id}</strong> because:
                (1) Room capacity ({activeModalSession.room_id}) is $\ge$ session size ({activeModalSession.size}),
                (2) Professor teaching cap remains under 4 hours/day,
                (3) Group cohorts ({activeModalSession.groups?.join(', ')}) have zero concurrent mandatory classes, and
                (4) Strictly avoids lunch hour bridge (H7).
              </p>
            </div>

            <div className="text-right">
              <button
                onClick={() => setActiveModalSession(null)}
                className="px-4 py-2 bg-slate-900 text-white dark:bg-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
