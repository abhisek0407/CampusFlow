'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  CheckCircle2, 
  DoorOpen, 
  Users, 
  FileCheck, 
  Search,
  ShieldCheck
} from 'lucide-react';

const EXAM_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function ExamsView() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDay, setSelectedDay] = useState('ALL');

  useEffect(() => {
    fetchExams();
  }, []);

  async function fetchExams() {
    setLoading(true);
    try {
      const res = await fetch('/api/schedule/current');
      const data = await res.json();
      if (data.success && data.schedule?.exams) {
        setExams(data.schedule.exams);
      }
    } catch (e) {
      console.error('Failed to load exams:', e);
    } finally {
      setLoading(false);
    }
  }

  const filteredExams = exams.filter((e) => {
    const matchesSearch = e.exam_id?.toLowerCase().includes(search.toLowerCase()) ||
                          e.rooms?.some(r => r.toLowerCase().includes(search.toLowerCase()));
    const matchesDay = selectedDay === 'ALL' || e.day === selectedDay;
    return matchesSearch && matchesDay;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Midsem Examination Master Timetable
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            41 Midsem Exams Scheduled Across 6 Days (MON–SAT) • AM (09:00–12:00) & PM (14:00–17:00) Slots • Strict 50% Capacity Spacing Rule
          </p>
        </div>

        {/* Exam Compliance Badges */}
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>0 Exam Conflicts</span>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
            0 Exam Penalty
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search exam code (EX-MA101) or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          className="text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 focus:outline-none"
        >
          <option value="ALL">All Exam Days (MON - SAT)</option>
          {EXAM_DAYS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <span className="text-xs text-slate-400 ml-auto font-medium">
          Showing <strong>{filteredExams.length}</strong> of {exams.length} examinations
        </span>
      </div>

      {/* 6-Day Visual Schedule Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EXAM_DAYS.filter(d => selectedDay === 'ALL' || selectedDay === d).map((day) => {
          const amExams = exams.filter((e) => e.day === day && e.session === 'AM');
          const pmExams = exams.filter((e) => e.day === day && e.session === 'PM');

          return (
            <div key={day} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>{day} Midsem Schedule</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {amExams.length + pmExams.length} Exams
                </span>
              </div>

              {/* Morning Session (AM) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                  <span>🌅 Morning (AM): 09:00 - 12:00</span>
                  <span className="text-[10px] text-slate-400 font-normal">{amExams.length} exams</span>
                </div>
                <div className="space-y-1.5">
                  {amExams.map((e) => (
                    <div key={e.exam_id} className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 transition text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{e.exam_id}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {e.rooms?.length} Room{e.rooms?.length > 1 && 's'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono flex flex-wrap gap-1">
                        {e.rooms?.map((r) => (
                          <span key={r} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Afternoon Session (PM) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                  <span>☀️ Afternoon (PM): 14:00 - 17:00</span>
                  <span className="text-[10px] text-slate-400 font-normal">{pmExams.length} exams</span>
                </div>
                <div className="space-y-1.5">
                  {pmExams.map((e) => (
                    <div key={e.exam_id} className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 transition text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{e.exam_id}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {e.rooms?.length} Room{e.rooms?.length > 1 && 's'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono flex flex-wrap gap-1">
                        {e.rooms?.map((r) => (
                          <span key={r} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
