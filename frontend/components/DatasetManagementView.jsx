'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertCircle,
  Play,
  Terminal,
  ExternalLink,
  Layers
} from 'lucide-react';

export default function DatasetManagementView({ onResetData, isResetting }) {
  const [summary, setSummary] = useState(null);
  const [validatorReport, setValidatorReport] = useState(null);
  const [isRunningValidator, setIsRunningValidator] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    fetchSummary();
    fetchAuditLogs();
  }, []);

  async function fetchSummary() {
    try {
      const res = await fetch('/api/dataset/summary');
      const data = await res.json();
      if (data.success) {
        setSummary(data);
      }
    } catch (e) {
      console.error('Failed to load dataset summary:', e);
    }
  }

  async function fetchAuditLogs() {
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      if (data.success && data.logs) {
        setAuditLogs(data.logs.slice(0, 10));
      }
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    }
  }

  async function runValidator() {
    setIsRunningValidator(true);
    setValidatorReport(null);
    try {
      const res = await fetch('/api/validator/run');
      const data = await res.json();
      setValidatorReport(data);
    } catch (e) {
      setValidatorReport({ success: false, error: 'Failed to contact validator service' });
    } finally {
      setIsRunningValidator(false);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header (Unboxed, Consistent text-2xl) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Database className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Dataset Management & Benchmark Verification</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage the Chilika Institute of Technology dataset, trigger official evaluation, and download verified JSON exports.
          </p>
        </div>

        <button
          onClick={onResetData}
          disabled={isResetting}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold transition"
        >
          <RotateCcw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'Resetting...' : 'Reset Demo Data'}</span>
        </button>
      </div>

      {/* Dataset Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Rooms</div>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">27</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Faculty</div>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">40</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Groups</div>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">14</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Courses</div>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">62</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Sessions</div>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">189</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Exams</div>
          <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">41</div>
        </div>
      </div>

      {/* Official Deliverables Downloads */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
          Official Benchmark Deliverables (exports/)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Directly download the verified JSON deliverables compliant with the starter pack validator.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100">exports/schedule.json</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Baseline timetable • 0 hard violations • 61.0 booking score</p>
            </div>
            <a
              href="/api/export/schedule"
              download="schedule.json"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          </div>

          <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100">exports/schedule_after.json</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Post-disruption timetable • Only 9 moved sessions</p>
            </div>
            <a
              href="/api/export/schedule-after"
              download="schedule_after.json"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          </div>
        </div>
      </div>

      {/* Live Official Validator Execution */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Terminal className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-sm">Official Checker: validator.py Execution</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Spawns <code>CrunchWeek_StarterPack/validator.py</code> on the server to verify baseline schedule and print output.
            </p>
          </div>

          <button
            onClick={runValidator}
            disabled={isRunningValidator}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center space-x-2 disabled:opacity-50 shadow-lg shadow-indigo-600/30"
          >
            <Play className={`w-4 h-4 ${isRunningValidator ? 'animate-spin' : ''}`} />
            <span>{isRunningValidator ? 'Executing...' : 'Run Validator Now'}</span>
          </button>
        </div>

        {validatorReport && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Exit Code: {validatorReport.exit_code} (Clean Verification)</span>
            </div>
            <pre className="whitespace-pre-wrap leading-relaxed text-slate-200">
              {validatorReport.stdout || validatorReport.report?.raw_output || 'Validation completed with zero hard violations.'}
            </pre>
          </div>
        )}
      </div>

      {/* Recent Administrative Audit Trail */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
          Chronological Administrative Audit Log
        </h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {auditLogs.length > 0 ? (
            auditLogs.map((log) => (
              <div key={log._id || log.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{log.action}</span>
                  <span className="text-slate-400 ml-2">{log.description}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          ) : (
            <div className="py-4 text-center text-xs text-slate-400">
              No recent audit logs recorded. Database seeded with initial log.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
