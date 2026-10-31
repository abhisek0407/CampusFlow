'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  ArrowRight, 
  Bot, 
  UserCheck, 
  Building2,
  FileText,
  HelpCircle
} from 'lucide-react';

const SAMPLE_PROMPTS = [
  {
    label: 'Hinglish Fest Request',
    text: 'Bhai Auditorium chahiye Thursday 6pm se 8pm for 450 people, stage aur PA system lagega for Dramatics Club'
  },
  {
    label: 'Guest Lecture Request',
    text: 'Requesting Main Auditorium on Wednesday evening from 18:00 to 20:00 for 400 attendees for Industry Keynote'
  },
  {
    label: 'Lab Booking Request',
    text: 'Need Computing Lab 1 on Friday from 14:00 to 17:00 for 80 students with computers and projector for CSE workshop'
  },
  {
    label: 'Tricky (Lunch Hour Bridge)',
    text: 'Want CR-101 on Monday from 13:00 to 14:00 for urgent club meeting'
  }
];

export default function AIAssistantView({ currentUser }) {
  const [promptText, setPromptText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedBooking, setParsedBooking] = useState(null);
  const [conflictReport, setConflictReport] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Faculty Assistant State
  const [facultyPrompt, setFacultyPrompt] = useState('');
  const [facultyResponse, setFacultyResponse] = useState(null);
  const [isFacultyLoading, setIsFacultyLoading] = useState(false);

  // Decision Explainer State
  const [explainQuery, setExplainQuery] = useState('BR-01');
  const [explainResult, setExplainResult] = useState(null);
  const [isExplaining, setIsExplaining] = useState(false);

  async function handleParseBooking() {
    if (!promptText.trim()) return;
    setIsParsing(true);
    setParsedBooking(null);
    setConflictReport(null);
    setSubmitSuccess(false);

    try {
      const res = await fetch('/api/ai/parse-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_text: promptText,
          requester_role: currentUser?.role || 'club',
          requester_name: currentUser?.name || 'Club Representative',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setParsedBooking(data.parsed);
        setConflictReport(data.conflict_check);
      } else {
        alert(data.error || 'Parsing failed');
      }
    } catch (e) {
      console.error('Error parsing booking:', e);
    } finally {
      setIsParsing(false);
    }
  }

  async function handleConfirmSubmit() {
    if (!parsedBooking) return;
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedBooking),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitSuccess(true);
        setParsedBooking(null);
      } else {
        alert(data.error || 'Failed to submit booking');
      }
    } catch (e) {
      console.error('Submit error:', e);
    }
  }

  async function handleFacultyAssistant() {
    if (!facultyPrompt.trim()) return;
    setIsFacultyLoading(true);
    setFacultyResponse(null);

    try {
      const res = await fetch('/api/ai/faculty-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: facultyPrompt,
          faculty_id: currentUser?.linked_faculty_id || 'F01',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFacultyResponse(data);
      }
    } catch (e) {
      console.error('Faculty assistant error:', e);
    } finally {
      setIsFacultyLoading(false);
    }
  }

  async function handleExplainDecision() {
    if (!explainQuery.trim()) return;
    setIsExplaining(true);
    setExplainResult(null);

    try {
      const res = await fetch(`/api/ai/explain?query=${encodeURIComponent(explainQuery)}`);
      const data = await res.json();
      if (data.success) {
        setExplainResult(data);
      }
    } catch (e) {
      console.error('Explain error:', e);
    } finally {
      setIsExplaining(false);
    }
  }

  return (
    <div className="space-y-8">
      
      {/* Module 1: Natural Language & Hinglish Booking Extraction (Requirement 3) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              AI Natural Language & Hinglish Booking Assistant
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Transforms unstructured English or Hinglish event requests into structured venue bookings with instant constraint checking.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800">
            Requirement 3 & 4
          </span>
        </div>

        {/* Quick Sample Prompt Chips */}
        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
            Try Sample Benchmark Prompts (English & Hinglish):
          </span>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setPromptText(p.text)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition text-left"
              >
                💡 {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Input Box */}
        <div className="space-y-3">
          <textarea
            rows={3}
            placeholder="Type your venue request in plain English or Hinglish... e.g. 'Bhai Auditorium chahiye Thursday 6pm se 8pm for 450 people with stage and PA system'..."
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            className="w-full text-xs p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <div className="flex justify-between items-center">
            <span className="text-[11px] text-slate-400 italic">
              *All extractions strictly validated by deterministic constraint code before commit (Section 6 Rule)
            </span>
            <button
              onClick={handleParseBooking}
              disabled={isParsing || !promptText.trim()}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isParsing ? 'Analyzing with NLP...' : 'Extract & Check Feasibility'}</span>
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {submitSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span><strong>Booking Submitted Successfully!</strong> Added to the Spectra database with complete constraint verification.</span>
          </div>
        )}

        {/* Parsed Output Verification Card (Section 2 Requirement 3) */}
        {parsedBooking && (
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Extracted Structured Booking (Review & Edit Before Submitting)</span>
              </h3>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded">
                Confidence: High
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 text-[10px]">Title</label>
                <input
                  type="text"
                  value={parsedBooking.title || ''}
                  onChange={(e) => setParsedBooking({ ...parsedBooking, title: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg font-semibold mt-0.5"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[10px]">Expected Attendance</label>
                <input
                  type="number"
                  value={parsedBooking.attendance || 0}
                  onChange={(e) => setParsedBooking({ ...parsedBooking, attendance: Number(e.target.value) })}
                  className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg font-semibold mt-0.5"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[10px]">Assigned Category</label>
                <input
                  type="text"
                  value={parsedBooking.requested_category || ''}
                  readOnly
                  className="w-full p-2 bg-slate-100 dark:bg-slate-800 border rounded-lg font-semibold mt-0.5 capitalize cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[10px]">Requested Venue</label>
                <input
                  type="text"
                  value={parsedBooking.requested_room || 'AUD'}
                  onChange={(e) => setParsedBooking({ ...parsedBooking, requested_room: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg font-semibold mt-0.5"
                />
              </div>
            </div>

            {/* Deterministic Conflict & Feasibility Indicator */}
            {conflictReport && (
              <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                conflictReport.is_feasible
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
              }`}>
                <div className="flex items-center gap-2">
                  {conflictReport.is_feasible ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{conflictReport.message}</span>
                </div>
                <span className="font-bold uppercase text-[10px]">
                  {conflictReport.is_feasible ? 'Valid Slot' : 'Conflict Detected'}
                </span>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setParsedBooking(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
              >
                Discard
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition"
              >
                Confirm & Submit Request
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Module 2: Faculty Natural Language Assistant (Requirement 7) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              Faculty Timetable Change Assistant
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enables faculty to request medical leave or schedule swaps using conversational prompts. Strict algorithmic code checks ensure zero clashing.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200">
            Requirement 7
          </span>
        </div>

        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="e.g. 'I cannot take classes on Wednesday morning due to HOD duties, can my CS101 session be moved to Thursday?'..."
            value={facultyPrompt}
            onChange={(e) => setFacultyPrompt(e.target.value)}
            className="flex-1 text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
          />
          <button
            onClick={handleFacultyAssistant}
            disabled={isFacultyLoading || !facultyPrompt.trim()}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow transition disabled:opacity-50"
          >
            {isFacultyLoading ? 'Checking...' : 'Ask Assistant'}
          </button>
        </div>

        {facultyResponse && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Bot className="w-4 h-4 text-indigo-600" />
              <span>AI Proposal & Constraint Feasibility Report:</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {facultyResponse.answer}
            </p>
            {facultyResponse.suggested_solution && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-800 dark:text-emerald-300 font-semibold text-[11px]">
                Recommended Fix: {facultyResponse.suggested_solution}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Module 3: Institutional Decision Explainer (Requirement 8) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              Administrative Decision Explainer
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Instant transparent explanations for why a class was scheduled at a specific period or why a booking request was rejected or moved.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-200">
            Requirement 8
          </span>
        </div>

        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Enter Request ID (BR-01, BR-04, BR-09, BR-17) or Session ID (e.g. ID101-ALL-L1)..."
            value={explainQuery}
            onChange={(e) => setExplainQuery(e.target.value)}
            className="flex-1 text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
          />
          <button
            onClick={handleExplainDecision}
            disabled={isExplaining || !explainQuery.trim()}
            className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow transition disabled:opacity-50"
          >
            {isExplaining ? 'Explaining...' : 'Explain Decision'}
          </button>
        </div>

        {explainResult && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white">Explanation for {explainQuery}:</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold uppercase">
                {explainResult.entity_type}
              </span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {explainResult.explanation}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
