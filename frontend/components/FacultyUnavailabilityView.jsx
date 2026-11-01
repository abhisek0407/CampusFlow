'use client';

import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Send,
  Trash2
} from 'lucide-react';

export default function FacultyUnavailabilityView() {
  const [day, setDay] = useState('FRI');
  const [periods, setPeriods] = useState([6, 7]);
  const [reason, setReason] = useState('');
  const [leaves, setLeaves] = useState([
    {
      id: 'UNAV-01',
      day: 'FRI',
      periods: [6, 7, 8],
      reason: 'Research Grant Committee Review Meeting',
      status: 'Active (Constraint H7 Bound)',
    }
  ]);
  const [success, setSuccess] = useState(null);

  function handlePeriodToggle(p) {
    if (periods.includes(p)) {
      setPeriods(periods.filter(x => x !== p));
    } else {
      setPeriods([...periods, p].sort());
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (periods.length === 0) {
      alert('Please select at least one period.');
      return;
    }
    const newEntry = {
      id: `UNAV-${Date.now().toString().slice(-4)}`,
      day,
      periods,
      reason: reason || 'Personal Leave',
      status: 'Registered into CP-SAT Solver',
    };
    setLeaves([...leaves, newEntry]);
    setSuccess(`Unavailability for ${day} P${periods.join(', P')} saved successfully.`);
    setReason('');
    setTimeout(() => setSuccess(null), 4000);
  }

  function handleDelete(id) {
    setLeaves(leaves.filter(l => l.id !== id));
  }

  return (
    <div className="space-y-6">
      
      {/* Header (Unboxed, Consistent text-2xl) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Mark Faculty Unavailability & Leave (Constraint H7)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Declare periods when you cannot teach. The CP-SAT solver strictly prohibits allocating classes to unavailable slots.
          </p>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            Declare Unavailability Window
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Day of Week
              </label>
              <div className="grid grid-cols-5 gap-2">
                {['MON', 'TUE', 'WED', 'THU', 'FRI'].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDay(d)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      day === d
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Unavailable Periods (Click to toggle)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(p => {
                  const isSelected = periods.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePeriodToggle(p)}
                      className={`p-2 rounded-xl border text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      P{p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reason / Note
              </label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="E.g., Medical appointment or university committee duties"
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center space-x-2 shadow-md shadow-indigo-600/20"
            >
              <Send className="w-4 h-4" />
              <span>Register Unavailability</span>
            </button>
          </form>
        </div>

        {/* Info Card */}
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-xs space-y-3">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Hard Constraint H7 Guarantee</span>
          </h4>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Whenever a faculty member marks unavailability, our Google OR-Tools CP-SAT model creates an absolute boolean constraint:
          </p>
          <div className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-indigo-300">
            x[s, day, period, r] == 0 for all sessions s of faculty F01
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            If a disruption occurs while classes are scheduled at this time, the minimal-move engine moves the affected class to another slot with zero human intervention.
          </p>
        </div>

      </div>

      {/* Active Unavailability List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
          Registered Unavailability Blocks
        </h3>
        <div className="space-y-2">
          {leaves.map((l) => (
            <div key={l.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <span className="font-bold font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                  {l.day} P{l.periods.join(', P')}
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{l.reason}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{l.status}</span>
                <button
                  onClick={() => handleDelete(l.id)}
                  className="p-1 rounded text-slate-400 hover:text-rose-500 transition"
                  title="Remove block"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
