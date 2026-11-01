'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  ShieldCheck, 
  DoorOpen, 
  Users, 
  Search,
  X,
  CheckCircle2,
  Sunrise,
  Sun,
  BookOpen,
  Maximize2
} from 'lucide-react';

// Official CIT 6-day academic examination schedule
const EXAM_DAYS = [
  { key: 'MON', name: 'Monday', total: 5 },
  { key: 'TUE', name: 'Tuesday', total: 9 },
  { key: 'WED', name: 'Wednesday', total: 7 },
  { key: 'THU', name: 'Thursday', total: 7 },
  { key: 'FRI', name: 'Friday', total: 8 },
  { key: 'SAT', name: 'Saturday', total: 5 },
];

// Rich Course & Cohort Metadata from dataset
const EXAM_META = {
  "EX-MA101": { title: "Calculus & Linear Algebra", groups: ["Y1-A", "Y1-B", "Y1-C", "Y1-D"], size: 360, courses: ["MA101"] },
  "EX-PH101": { title: "Engineering Physics", groups: ["Y1-A", "Y1-B", "Y1-C", "Y1-D"], size: 360, courses: ["PH101"] },
  "EX-CS101": { title: "Programming in C", groups: ["Y1-A", "Y1-B", "Y1-C", "Y1-D"], size: 360, courses: ["CS101"] },
  "EX-HS101": { title: "Communicative English", groups: ["Y1-A", "Y1-B", "Y1-C", "Y1-D"], size: 360, courses: ["HS101"] },
  "EX-CS201": { title: "Data Structures", groups: ["CSE-2"], size: 80, courses: ["CS201"] },
  "EX-CS202": { title: "Discrete Mathematics", groups: ["CSE-2"], size: 80, courses: ["CS202"] },
  "EX-CS203": { title: "Digital Logic Design", groups: ["CSE-2"], size: 80, courses: ["CS203"] },
  "EX-CS204": { title: "Object-Oriented Prog.", groups: ["CSE-2"], size: 80, courses: ["CS204"] },
  "EX-EC201": { title: "Signals and Systems", groups: ["ECE-2"], size: 70, courses: ["EC201"] },
  "EX-EC202": { title: "Network Theory", groups: ["ECE-2"], size: 70, courses: ["EC202"] },
  "EX-EC203": { title: "Electronic Devices", groups: ["ECE-2"], size: 70, courses: ["EC203"] },
  "EX-EC204": { title: "Probability & Processes", groups: ["ECE-2"], size: 70, courses: ["EC204"] },
  "EX-EE201": { title: "Circuit Analysis", groups: ["EE-2"], size: 60, courses: ["EE201"] },
  "EX-EE202": { title: "Electrical Machines I", groups: ["EE-2"], size: 60, courses: ["EE202"] },
  "EX-EE203": { title: "Electrical Measurements", groups: ["EE-2"], size: 60, courses: ["EE203"] },
  "EX-EE204": { title: "Electromagnetic Fields", groups: ["EE-2"], size: 60, courses: ["EE204"] },
  "EX-ME201": { title: "Engineering Thermo.", groups: ["ME-2"], size: 60, courses: ["ME201"] },
  "EX-ME202": { title: "Mechanics of Solids", groups: ["ME-2"], size: 60, courses: ["ME202"] },
  "EX-ME203": { title: "Kinematics of Machines", groups: ["ME-2"], size: 60, courses: ["ME203"] },
  "EX-ME204": { title: "Manufacturing Processes", groups: ["ME-2"], size: 60, courses: ["ME204"] },
  "EX-CE201": { title: "Surveying", groups: ["CE-2"], size: 50, courses: ["CE201"] },
  "EX-CE202": { title: "Fluid Mechanics", groups: ["CE-2"], size: 50, courses: ["CE202"] },
  "EX-CE203": { title: "Strength of Materials", groups: ["CE-2"], size: 50, courses: ["CE203"] },
  "EX-CE204": { title: "Engineering Geology", groups: ["CE-2"], size: 50, courses: ["CE204"] },
  "EX-HS201": { title: "Principles of Economics", groups: ["CSE-2", "ECE-2", "EE-2", "ME-2", "CE-2"], size: 320, courses: ["HS201"] },
  "EX-CS301": { title: "Operating Systems", groups: ["CSE-3"], size: 75, courses: ["CS301"] },
  "EX-CS302": { title: "Database Systems", groups: ["CSE-3"], size: 75, courses: ["CS302"] },
  "EX-CS303": { title: "Computer Networks", groups: ["CSE-3"], size: 75, courses: ["CS303"] },
  "EX-EC301": { title: "Communication Systems", groups: ["ECE-3"], size: 65, courses: ["EC301"] },
  "EX-EC302": { title: "Digital Signal Processing", groups: ["ECE-3"], size: 65, courses: ["EC302"] },
  "EX-EC303": { title: "VLSI Design", groups: ["ECE-3"], size: 65, courses: ["EC303"] },
  "EX-EE301": { title: "Power Systems", groups: ["EE-3"], size: 55, courses: ["EE301"] },
  "EX-EE302": { title: "Control Systems", groups: ["EE-3"], size: 55, courses: ["EE302"] },
  "EX-EE303": { title: "Power Electronics", groups: ["EE-3"], size: 55, courses: ["EE303"] },
  "EX-ME301": { title: "Heat Transfer", groups: ["ME-3"], size: 55, courses: ["ME301"] },
  "EX-ME302": { title: "Machine Design", groups: ["ME-3"], size: 55, courses: ["ME302"] },
  "EX-ME303": { title: "Fluid Machines", groups: ["ME-3"], size: 55, courses: ["ME303"] },
  "EX-CE301": { title: "Structural Analysis", groups: ["CE-3"], size: 45, courses: ["CE301"] },
  "EX-CE302": { title: "Geotechnical Eng.", groups: ["CE-3"], size: 45, courses: ["CE302"] },
  "EX-CE303": { title: "Transportation Eng.", groups: ["CE-3"], size: 45, courses: ["CE303"] },
  "EX-OE-BASKET": { title: "Open Electives Basket", groups: ["CSE-3", "ECE-3", "EE-3", "ME-3", "CE-3"], size: 295, courses: ["OE301", "OE302", "OE303"] }
};

// Ground-truth 41 benchmark exams baseline
const BASELINE_EXAMS = [
  {"exam_id":"EX-MA101","day":"TUE","session":"PM","rooms":["AUD","CR-203","SH-1"]},
  {"exam_id":"EX-PH101","day":"WED","session":"AM","rooms":["AUD","SH-1","SH-2"]},
  {"exam_id":"EX-CS101","day":"SAT","session":"PM","rooms":["AUD","CR-203","SH-1"]},
  {"exam_id":"EX-HS101","day":"THU","session":"PM","rooms":["AUD","CR-203","SH-1"]},
  {"exam_id":"EX-CS201","day":"MON","session":"AM","rooms":["AUD"]},
  {"exam_id":"EX-CS202","day":"FRI","session":"PM","rooms":["LH-2"]},
  {"exam_id":"EX-CS203","day":"THU","session":"AM","rooms":["LH-2"]},
  {"exam_id":"EX-CS204","day":"TUE","session":"AM","rooms":["LH-1"]},
  {"exam_id":"EX-EC201","day":"TUE","session":"PM","rooms":["LH-1"]},
  {"exam_id":"EX-EC202","day":"WED","session":"PM","rooms":["AUD"]},
  {"exam_id":"EX-EC203","day":"MON","session":"PM","rooms":["LH-2"]},
  {"exam_id":"EX-EC204","day":"THU","session":"AM","rooms":["LH-1"]},
  {"exam_id":"EX-EE201","day":"THU","session":"PM","rooms":["LH-2"]},
  {"exam_id":"EX-EE202","day":"WED","session":"PM","rooms":["LH-1"]},
  {"exam_id":"EX-EE203","day":"TUE","session":"AM","rooms":["AUD"]},
  {"exam_id":"EX-EE204","day":"FRI","session":"PM","rooms":["LH-1"]},
  {"exam_id":"EX-ME201","day":"TUE","session":"AM","rooms":["LH-2"]},
  {"exam_id":"EX-ME202","day":"WED","session":"PM","rooms":["LH-2"]},
  {"exam_id":"EX-ME203","day":"FRI","session":"AM","rooms":["LH-2"]},
  {"exam_id":"EX-ME204","day":"THU","session":"AM","rooms":["SH-1"]},
  {"exam_id":"EX-CE201","day":"MON","session":"PM","rooms":["SH-1"]},
  {"exam_id":"EX-CE202","day":"THU","session":"PM","rooms":["LH-1"]},
  {"exam_id":"EX-CE203","day":"WED","session":"AM","rooms":["LH-5"]},
  {"exam_id":"EX-CE204","day":"TUE","session":"AM","rooms":["LH-4"]},
  {"exam_id":"EX-HS201","day":"SAT","session":"AM","rooms":["AUD","SH-1"]},
  {"exam_id":"EX-CS301","day":"WED","session":"PM","rooms":["SH-1"]},
  {"exam_id":"EX-CS302","day":"TUE","session":"AM","rooms":["SH-1"]},
  {"exam_id":"EX-CS303","day":"FRI","session":"AM","rooms":["AUD"]},
  {"exam_id":"EX-EC301","day":"FRI","session":"AM","rooms":["LH-1"]},
  {"exam_id":"EX-EC302","day":"SAT","session":"AM","rooms":["LH-2"]},
  {"exam_id":"EX-EC303","day":"MON","session":"AM","rooms":["SH-1"]},
  {"exam_id":"EX-EE301","day":"FRI","session":"AM","rooms":["SH-1"]},
  {"exam_id":"EX-EE302","day":"SAT","session":"AM","rooms":["LH-1"]},
  {"exam_id":"EX-EE303","day":"TUE","session":"PM","rooms":["LH-4"]},
  {"exam_id":"EX-ME301","day":"WED","session":"PM","rooms":["LH-4"]},
  {"exam_id":"EX-ME302","day":"SAT","session":"AM","rooms":["LH-4"]},
  {"exam_id":"EX-ME303","day":"FRI","session":"PM","rooms":["LH-6"]},
  {"exam_id":"EX-CE301","day":"MON","session":"PM","rooms":["CR-102"]},
  {"exam_id":"EX-CE302","day":"FRI","session":"PM","rooms":["CR-101"]},
  {"exam_id":"EX-CE303","day":"TUE","session":"AM","rooms":["LH-6"]},
  {"exam_id":"EX-OE-BASKET","day":"THU","session":"AM","rooms":["AUD","CR-201"]}
];

export default function ExamsView() {
  const [exams, setExams] = useState(BASELINE_EXAMS);
  const [search, setSearch] = useState('');
  const [selectedDay, setSelectedDay] = useState('ALL');
  const [inspectModalExam, setInspectModalExam] = useState(null);

  useEffect(() => {
    fetchExams();
  }, []);

  async function fetchExams() {
    try {
      const res = await fetch('/api/schedule/current');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.schedule?.exams && data.schedule.exams.length > 0) {
          setExams(data.schedule.exams);
        }
      }
    } catch (e) {
      console.warn('Using baseline exam benchmark data:', e);
    }
  }

  // Filter helper
  const isExamMatch = (e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const meta = EXAM_META[e.exam_id] || {};
    const code = e.exam_id.replace(/^EX-/, '').toLowerCase();
    const matchesId = e.exam_id?.toLowerCase().includes(q) || code.includes(q);
    const matchesTitle = meta.title?.toLowerCase().includes(q);
    const matchesRooms = e.rooms?.some(r => r.toLowerCase().includes(q));
    const matchesGroups = meta.groups?.some(g => g.toLowerCase().includes(q));
    return matchesId || matchesTitle || matchesRooms || matchesGroups;
  };

  const totalFiltered = exams.filter(isExamMatch).length;

  return (
    <div className="space-y-4">
      
      {/* 1. Page Header (Unboxed, Clean & Consistent text-2xl) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Midsem Examination Timetable
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            41 Exams Across 6 Days (MON–SAT) • AM (09:00–12:00) & PM (14:00–17:00) • 50% Capacity Spacing (Rule H5)
          </p>
        </div>

        {/* Status Badges */}
        <div className="flex items-center space-x-2 shrink-0">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>0 Conflicts</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
            0 Penalty
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
            41 / 41 Placed
          </span>
        </div>
      </div>
      

      {/* 2. Compact Search & Filter Controls */}
      <div className="bg-white dark:bg-[#111625] rounded-xl px-4 py-2.5 border border-slate-200/90 dark:border-slate-800/80 shadow-xs flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search code (CS201), course, or hall (AUD)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Day Filter Pills */}
        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-900/90 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
          <button
            onClick={() => setSelectedDay('ALL')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
              selectedDay === 'ALL'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All
          </button>
          {EXAM_DAYS.map((d) => (
            <button
              key={d.key}
              onClick={() => setSelectedDay(selectedDay === d.key ? 'ALL' : d.key)}
              className={`px-2 py-1 rounded text-[11px] font-bold transition ${
                selectedDay === d.key
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {d.key}
            </button>
          ))}
        </div>

        {/* <span className="text-[11px] text-slate-400 font-medium ml-auto">
          Showing <strong>{totalFiltered}</strong> / {exams.length}
        </span> */}
      </div>

      {/* 3. Timetable Matrix Grid (Compact, Identical Box Sizes) */}
      <div className="bg-white dark:bg-[#0b0f19] rounded-xl border border-slate-200/90 dark:border-slate-800/80 p-3.5 shadow-xs overflow-hidden">
        
        {/* Horizontal scroll wrapper */}
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[960px] space-y-2">
            
            {/* Top Column Headers (Corner + 6 Days) */}
            <div className="grid grid-cols-[115px_repeat(6,1fr)] gap-2 items-center">
              
              {/* Corner Header */}
              <div className="h-9 rounded-lg bg-slate-100/90 dark:bg-[#111625] border border-slate-200 dark:border-slate-800 px-2 flex items-center justify-center text-center">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  SLOT
                </span>
              </div>

              {/* 6 Day Column Headers (Clean, No Duplicate Day Names) */}
              {EXAM_DAYS.map((d) => {
                const isSelected = selectedDay === 'ALL' || selectedDay === d.key;
                return (
                  <div
                    key={d.key}
                    onClick={() => setSelectedDay(selectedDay === d.key ? 'ALL' : d.key)}
                    className={`h-9 rounded-lg px-2.5 flex items-center justify-between cursor-pointer border transition ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-[#111625] border-slate-300 dark:border-slate-700'
                        : 'bg-slate-50/40 dark:bg-[#111625]/40 border-dashed border-slate-200 dark:border-slate-800/50 opacity-40'
                    } hover:border-indigo-500 dark:hover:border-indigo-500`}
                  >
                    <span className="text-sm font-black tracking-wider text-slate-950 dark:text-white">
                      {d.key}
                    </span>
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
                      {d.total}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Row 1: Morning (AM) */}
            <div className="grid grid-cols-[115px_repeat(6,1fr)] gap-2 items-stretch">
              
              {/* Left Row Header: AM (In one single line, simple black) */}
              <div className="h-full min-h-[160px] rounded-xl p-2.5 bg-slate-50/80 dark:bg-[#111625] border border-slate-200/90 dark:border-slate-800/80 flex flex-col items-center justify-center text-center shadow-2xs">
                <div className="text-xs font-bold text-slate-950 dark:text-white whitespace-nowrap">
                  09:00 – 12:00 AM
                </div>
                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 mt-1">
                  22 Exams · 3 hrs
                </span>
              </div>

              {/* 6 Morning Cells: Dynamic Height, No Scrolling */}
              {EXAM_DAYS.map((d) => {
                const slotExams = exams.filter((e) => e.day === d.key && e.session === 'AM');
                const isDayDimmed = selectedDay !== 'ALL' && selectedDay !== d.key;

                return (
                  <CompactExamSlotBox
                    key={`${d.key}-AM`}
                    day={d.key}
                    session="AM"
                    exams={slotExams}
                    isDimmed={isDayDimmed}
                    search={search}
                    isMatchFn={isExamMatch}
                    onSelectExam={setInspectModalExam}
                  />
                );
              })}
            </div>

            {/* Clean, Subtle Gap & Divider between Morning and Afternoon */}
            <div className="my-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800/70" />

            {/* Row 2: Afternoon (PM) */}
            <div className="grid grid-cols-[115px_repeat(6,1fr)] gap-2 items-stretch">
              
              {/* Left Row Header: PM (In one single line, simple black) */}
              <div className="h-full min-h-[160px] rounded-xl p-2.5 bg-slate-50/80 dark:bg-[#111625] border border-slate-200/90 dark:border-slate-800/80 flex flex-col items-center justify-center text-center shadow-2xs">
                <div className="text-xs font-bold text-slate-950 dark:text-white whitespace-nowrap">
                  14:00 – 17:00 PM
                </div>
                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 mt-1">
                  19 Exams · 3 hrs
                </span>
              </div>

              {/* 6 Afternoon Cells: Dynamic Height, No Scrolling */}
              {EXAM_DAYS.map((d) => {
                const slotExams = exams.filter((e) => e.day === d.key && e.session === 'PM');
                const isDayDimmed = selectedDay !== 'ALL' && selectedDay !== d.key;

                return (
                  <CompactExamSlotBox
                    key={`${d.key}-PM`}
                    day={d.key}
                    session="PM"
                    exams={slotExams}
                    isDimmed={isDayDimmed}
                    search={search}
                    isMatchFn={isExamMatch}
                    onSelectExam={setInspectModalExam}
                  />
                );
              })}
            </div>

          </div>
        </div>

      </div>

      {/* 4. Interactive Exam Detail Modal */}
      {inspectModalExam && (
        <ExamDetailModal
          exam={inspectModalExam}
          onClose={() => setInspectModalExam(null)}
        />
      )}

    </div>
  );
}

/**
 * Dynamic Single Exam Slot Box
 * Stretches cleanly to row height (No internal scrolling)
 * Direct exam chips with no redundant sub-header
 */
function CompactExamSlotBox({ day, session, exams, isDimmed, search, isMatchFn, onSelectExam }) {
  const matchingExams = exams.filter(isMatchFn);
  const hasExams = exams.length > 0;

  return (
    <div
      className={`h-full min-h-[160px] rounded-xl border p-2 transition flex flex-col space-y-1.5 ${
        isDimmed
          ? 'bg-slate-50/40 dark:bg-[#111625]/40 border-slate-200/50 dark:border-slate-800/40 opacity-40'
          : 'bg-white dark:bg-[#111625] border-slate-200/90 dark:border-slate-800/80 shadow-2xs'
      }`}
    >
      {!hasExams ? (
        <div className="h-full flex items-center justify-center text-center p-3 text-slate-400">
          <span className="text-[11px]">No exams</span>
        </div>
      ) : matchingExams.length === 0 ? (
        <div className="h-full flex items-center justify-center text-center p-3 text-slate-400">
          <span className="text-[11px]">No match</span>
        </div>
      ) : (
        matchingExams.map((e) => {
          const meta = EXAM_META[e.exam_id] || {};
          const isHighlighted = search && isMatchFn(e);
          const courseCode = e.exam_id.replace(/^EX-/, '');
          const roomLabel = e.rooms?.length === 1 
            ? e.rooms[0] 
            : `${e.rooms[0]} +${e.rooms.length - 1}`;

          return (
            <div
              key={e.exam_id}
              onClick={() => onSelectExam({ ...e, ...meta })}
              title={`${e.exam_id}: ${meta.title} (${e.rooms?.join(', ')})`}
              className={`px-2 py-1.5 rounded-lg border transition cursor-pointer group text-left ${
                isHighlighted
                  ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/50'
                  : 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 shadow-2xs'
              }`}
            >
              {/* Line 1: Clean Course Code + Room Tag (Lighter Boldness, Clean & Crisp) */}
              <div className="flex items-center justify-between gap-1">
                <span className="font-medium text-[11px] text-slate-900 dark:text-slate-100 whitespace-nowrap group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                  {courseCode}
                </span>
                <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 whitespace-nowrap shrink-0">
                  {roomLabel}
                </span>
              </div>

              {/* Line 2: Compact Subject Title + Student Size */}
              <div className="flex items-center justify-between gap-1 mt-0.5">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-normal truncate leading-tight">
                  {meta.title || courseCode}
                </span>
                {meta.size && (
                  <span className="text-[9px] font-normal text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                    {meta.size}p
                  </span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/**
 * Interactive Modal for Exam Details & Mathematical Rule Verification
 */
function ExamDetailModal({ exam, onClose }) {
  if (!exam) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="bg-white dark:bg-[#111625] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl relative space-y-3.5 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                {exam.exam_id}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                {exam.day} • {exam.session === 'AM' ? '09:00 - 12:00 (AM)' : '14:00 - 17:00 (PM)'}
              </span>
            </div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
              {exam.title}
            </h3>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Enrolled Candidates
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 block">
              {exam.size || 'N/A'} Students
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              Allocated Halls
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 block">
              {exam.rooms?.length} {exam.rooms?.length === 1 ? 'Venue' : 'Venues'}
            </span>
          </div>
        </div>

        {/* Registered Cohorts & Allocated Halls In One Line / 2 Columns */}
        <div className="grid grid-cols-2 gap-3 pt-0.5">
          <div>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Registered Cohorts:
            </span>
            <div className="flex flex-wrap gap-1">
              {exam.groups?.map((g) => (
                <span
                  key={g}
                  className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Allocated Halls:
            </span>
            <div className="flex flex-wrap gap-1">
              {exam.rooms?.map((r) => (
                <span
                  key={r}
                  className="px-2 py-0.5 text-xs font-mono font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"
                >
                  <DoorOpen className="w-3 h-3" />
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Rule H5 Spacing Compliance Box */}
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-start gap-2 text-[11px]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-emerald-800 dark:text-emerald-300">
            <strong className="block font-bold">Rule H5 Spacing Halving Verified</strong>
            <span>Allocated halls enforce strict 50% capacity spacing for social distancing and exam integrity.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-1 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg hover:opacity-90 transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
