'use client';

import React, { useState } from 'react';
import {
  PlusCircle,
  Calendar,
  Clock,
  DoorOpen,
  CheckCircle2,
  AlertCircle,
  Send,
  Users
} from 'lucide-react';

export default function FacultyRequestSessionView() {
  const [course, setCourse] = useState('CS101');
  const [sessionKind, setSessionKind] = useState('tutorial');
  const [targetGroup, setTargetGroup] = useState('Y1-A');
  const [duration, setDuration] = useState(1);
  const [preferredDay, setPreferredDay] = useState('THU');
  const [preferredPeriod, setPreferredPeriod] = useState(5);
  const [reason, setReason] = useState('');
  const [success, setSuccess] = useState(null);
  const [requests, setRequests] = useState([
    {
      id: 'REQ-EXTRA-01',
      course: 'CS101',
      kind: 'Tutorial Section 2 (Remedial)',
      target: 'Y1-A',
      slot: 'THU P5 (12:00)',
      status: 'Dean Academic Pending',
      date: '2026-10-31'
    }
  ]);

  function handleSubmit(e) {
    e.preventDefault();
    const newReq = {
      id: `REQ-EXTRA-${Date.now().toString().slice(-4)}`,
      course,
      kind: `${sessionKind === 'tutorial' ? 'Tutorial' : sessionKind === 'lab' ? 'Lab Block (3h)' : 'Lecture'} (Extra)`,
      target: targetGroup,
      slot: `${preferredDay} P${preferredPeriod}`,
      status: 'Submitted for Dean Approval',
      date: new Date().toISOString().split('T')[0]
    };
    setRequests([newReq, ...requests]);
    setSuccess(`Extra session request for ${course} submitted successfully.`);
    setReason('');
    setTimeout(() => setSuccess(null), 4000);
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <PlusCircle className="w-5 h-5 text-indigo-600" />
          <span>Request Extra Session or Class Rescheduling</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Rule Section 4: "Faculty requests extra or moved sessions." The platform validates all student group and room constraints.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            Session Request Details
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Course
                </label>
                <select
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="CS101">CS101 - Intro to Programming</option>
                  <option value="CS302">CS302 - Database Systems</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Session Type
                </label>
                <select
                  value={sessionKind}
                  onChange={(e) => {
                    setSessionKind(e.target.value);
                    setDuration(e.target.value === 'lab' ? 3 : 1);
                  }}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="tutorial">1-Hour Tutorial Section</option>
                  <option value="lecture">1-Hour Lecture</option>
                  <option value="lab">3-Hour Practical Laboratory</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Student Cohort
                </label>
                <select
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="Y1-A">Year 1 - Section A (Y1-A)</option>
                  <option value="Y1-B">Year 1 - Section B (Y1-B)</option>
                  <option value="CSE-2">Year 2 - CSE (CSE-2)</option>
                  <option value="CSE-3">Year 3 - CSE (CSE-3)</option>
                  <option value="ME-3">Year 3 - ME (ME-3)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Preferred Day
                </label>
                <select
                  value={preferredDay}
                  onChange={(e) => setPreferredDay(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="MON">Monday</option>
                  <option value="TUE">Tuesday</option>
                  <option value="WED">Wednesday</option>
                  <option value="THU">Thursday</option>
                  <option value="FRI">Friday</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Preferred Start Slot
                </label>
                <select
                  value={preferredPeriod}
                  onChange={(e) => setPreferredPeriod(Number(e.target.value))}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value={1}>P1 (08:00)</option>
                  <option value={2}>P2 (09:00)</option>
                  <option value={3}>P3 (10:00)</option>
                  <option value={4}>P4 (11:00)</option>
                  <option value={5}>P5 (12:00)</option>
                  <option value={6}>P6 (14:00)</option>
                  <option value={7}>P7 (15:00)</option>
                  <option value={8}>P8 (16:00)</option>
                  <option value={9}>P9 (17:00)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason / Note for Dean
              </label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="E.g., Additional tutorial session for students preparing for midsem programming exam next week."
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              ></textarea>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center space-x-2 shadow-md shadow-indigo-600/20"
            >
              <Send className="w-4 h-4" />
              <span>Submit Session Request</span>
            </button>
          </form>
        </div>

        {/* Accessibility & Cap Info */}
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-xs space-y-3">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
            <Users className="w-4 h-4 text-blue-500" />
            <span>Automated Constraint Validation</span>
          </h4>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Every session request is pre-validated by the backend before reaching the Dean:
          </p>
          <ul className="list-disc pl-4 space-y-1.5 text-slate-600 dark:text-slate-400">
            <li><strong>Accessibility Check:</strong> Automatically checks if Dr. Ananya Mishra or Y1-C require a ground/lift room.</li>
            <li><strong>Teaching Cap Check:</strong> Ensures daily hours do not exceed 4h limit.</li>
            <li><strong>Room Capacity:</strong> Validates room capacity ≥ cohort size.</li>
          </ul>
        </div>

      </div>

      {/* Submitted Requests */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
          My Submitted Session Requests
        </h3>
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{r.id}</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 ml-2">{r.course}</span>
                <span className="text-slate-500 ml-2">({r.kind} for {r.target})</span>
                <div className="text-[11px] text-slate-400 mt-0.5">Preferred Slot: {r.slot}</div>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold text-[10px]">
                  {r.status}
                </span>
                <div className="text-[10px] text-slate-400 mt-0.5">{r.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
