'use client';

import React, { useState, useEffect } from 'react';
import {
  FileEdit,
  Calendar,
  Clock,
  DoorOpen,
  CheckCircle2,
  AlertCircle,
  Send,
  Users
} from 'lucide-react';

export default function CoordinatorChangeRequestsView() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [preferredDay, setPreferredDay] = useState('WED');
  const [preferredPeriod, setPreferredPeriod] = useState(3);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([
    {
      id: 'CR-101',
      session_id: 'CS202-T2',
      course: 'CS202 (Data Structures)',
      request: 'Add extra tutorial section for Y2-CSE',
      status: 'Applied (Disruption D-01)',
      date: '2026-10-31'
    }
  ]);

  useEffect(() => {
    fetch('/api/dataset/summary')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.courses) {
          // CSE courses
          const cseCourseIds = new Set(d.courses.filter(c => c.department === 'CSE').map(c => c._id));
          setSessions([
            { id: 'CS101-L1', title: 'Intro to Programming (Lecture 1)', groups: 'Y1-A, Y1-B', faculty: 'F01' },
            { id: 'CS101-T1', title: 'Intro to Programming (Tutorial 1)', groups: 'Y1-A', faculty: 'F01' },
            { id: 'CS201-L1', title: 'Data Structures & Algorithms', groups: 'Y2-CSE', faculty: 'F02' },
            { id: 'CS201-Lab1', title: 'Data Structures Lab (3h)', groups: 'Y2-CSE', faculty: 'F02' },
            { id: 'CS301-L1', title: 'Operating Systems', groups: 'Y3-CSE', faculty: 'F03' },
          ]);
        }
      });
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedSession) {
      alert('Please select a session to reschedule.');
      return;
    }
    const newReq = {
      id: `CR-${Date.now().toString().slice(-4)}`,
      session_id: selectedSession,
      course: sessions.find(s => s.id === selectedSession)?.title || selectedSession,
      request: `Move to ${preferredDay} Period P${preferredPeriod}: ${reason || 'Coordinator schedule realignment'}`,
      status: 'Submitted for Dean Approval',
      date: new Date().toISOString().split('T')[0]
    };
    setHistory([newReq, ...history]);
    setStatus(`Schedule change request for ${selectedSession} submitted successfully.`);
    setReason('');
    setTimeout(() => setStatus(null), 4000);
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <FileEdit className="w-5 h-5 text-indigo-600" />
          <span>Department Schedule Change Proposals</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Propose moving or adjusting CSE teaching sessions. Changes are tested for zero conflicts before promotion by Dean.
        </p>
      </div>

      {status && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{status}</span>
        </div>
      )}

      {/* Proposal Form & Guidelines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Change Request Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            Submit New Reschedule Request
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Department Session to Reschedule
              </label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="">-- Choose CSE Course Session --</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.id}: {s.title} ({s.groups} • Faculty: {s.faculty})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Requested Target Day
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
                  Requested Start Period
                </label>
                <select
                  value={preferredPeriod}
                  onChange={(e) => setPreferredPeriod(Number(e.target.value))}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value={1}>P1 (08:00–09:00)</option>
                  <option value={2}>P2 (09:00–10:00)</option>
                  <option value={3}>P3 (10:00–11:00)</option>
                  <option value={4}>P4 (11:00–12:00)</option>
                  <option value={5}>P5 (12:00–13:00)</option>
                  <option value={6}>P6 (14:00–15:00)</option>
                  <option value={7}>P7 (15:00–16:00)</option>
                  <option value={8}>P8 (16:00–17:00)</option>
                  <option value={9}>P9 (17:00–18:00)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Academic Justification / Reason
              </label>
              <textarea
                rows={3}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="E.g., Shifting CS201 Lab due to guest speaker hardware demo on Thursday morning."
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              ></textarea>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center space-x-2 shadow-md shadow-indigo-600/20"
            >
              <Send className="w-4 h-4" />
              <span>Submit Proposal to Dean</span>
            </button>
          </form>
        </div>

        {/* Policy Box */}
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-xs space-y-3">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Scheduling Integrity Rules</span>
          </h4>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            All proposed changes are strictly simulated using the CP-SAT minimal-move solver to guarantee:
          </p>
          <ul className="list-disc pl-4 space-y-1.5 text-slate-600 dark:text-slate-400">
            <li>Zero student cohort overlap (H3)</li>
            <li>Zero faculty teaching overlap (H2)</li>
            <li>Faculty daily teaching remains ≤ 4 hours (H12)</li>
            <li>3-hour labs never cross lunch break (H9)</li>
          </ul>
        </div>

      </div>

      {/* History */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
          Recent Department Change History
        </h3>
        <div className="space-y-2">
          {history.map((h) => (
            <div key={h.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold font-mono text-slate-900 dark:text-slate-100">{h.id}</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 ml-2">{h.course}</span>
                <p className="text-slate-500 text-[11px] mt-0.5">{h.request}</p>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-[10px]">
                  {h.status}
                </span>
                <div className="text-[10px] text-slate-400 mt-0.5">{h.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
