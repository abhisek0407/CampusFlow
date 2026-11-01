'use client';
import { apiFetch } from '@/lib/api';

import React, { useState } from 'react';
import {
  Sparkles,
  Building2,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Send,
  Edit3,
  PlusCircle,
  X
} from 'lucide-react';

const SAMPLE_HINGLISH_PROMPTS = [
  "Humhe Auditorium chahiye Thursday ko shaam 6 baje se 9 baje tak Dramatics play rehearsal ke liye, around 180 students honge.",
  "Need Seminar Hall 1 on Wednesday from 14:00 to 16:00 for Dramatics Club script reading and stage setup. Expected 45 people.",
  "Open Air Theatre (OAT) chahiye Friday 18:00 to 22:00 for Spectra street play finale, audio system aur mic compulsory hai.",
];

export default function ClubNewBookingView({ setActiveTab }) {
  const [activeMode, setActiveMode] = useState('ai'); // 'ai' or 'manual'
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Editable Structured Form State
  const [title, setTitle] = useState('Spectra Annual Play Rehearsal');
  const [category, setCategory] = useState('club_event');
  const [attendance, setAttendance] = useState(150);
  const [durationPeriods, setDurationPeriods] = useState(3);
  const [preferredDay, setPreferredDay] = useState('THU');
  const [startPeriod, setStartPeriod] = useState(10); // P10 = 18:00 (Evening events)
  const [preferredRoom, setPreferredRoom] = useState('AUD');
  const [needs, setNeeds] = useState(['pa_system', 'projector']);

  async function handleParsePrompt() {
    if (!rawText.trim()) return;
    setIsParsing(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/ai/parse-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_text: rawText,
        }),
      });
      const data = await res.json();
      if (data.success && data.booking) {
        setParsedData(data.booking);
        // Fill form fields for review and editing
        setTitle(data.booking.title || title);
        setAttendance(data.booking.attendance || 100);
        setDurationPeriods(data.booking.duration_periods || 3);
        if (data.booking.requested_room) {
          {
            const known = ['AUD', 'OAT', 'SH-1', 'SH-2', 'LH-1', 'CR-101'];
            const r = data.booking.requested_room === 'AUD-1' ? 'AUD' : data.booking.requested_room;
            if (known.includes(r)) setPreferredRoom(r);
          }
        }
        if (data.booking.windows && data.booking.windows[0]) {
          const w = data.booking.windows[0];
          if (w.day) setPreferredDay(w.day);
          const start = w.from_period ?? (Array.isArray(w.periods) ? w.periods[0] : 10);
          setStartPeriod(Number(start));
        }
        if (data.booking.requested_category) {
          setCategory(data.booking.requested_category);
        }
        if (Array.isArray(data.booking.needs) && data.booking.needs.length > 0) {
          setNeeds(data.booking.needs);
        }
      } else {
        setErrorMsg(data.error || 'Failed to extract booking details');
      }
    } catch (e) {
      console.error('Error parsing booking text:', e);
      setErrorMsg(e.message || 'Error parsing text with AI');
    } finally {
      setIsParsing(false);
    }
  }

  async function handleFinalSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const start = Number(startPeriod);
      const dur = Number(durationPeriods);
      const bookingPayload = {
        title,
        requested_category: category,
        attendance: Number(attendance),
        duration_periods: dur,
        windows: [{
          day: preferredDay,
          from_period: start,
          to_period: start + dur - 1,
        }],
        // FIX: values must match the Room model enum (old code sent 'open_air_theatre')
        room_types: preferredRoom.includes('AUD')
          ? ['auditorium']
          : preferredRoom.includes('OAT')
            ? ['outdoor']
            : preferredRoom.includes('SH')
              ? ['seminar_hall']
              : preferredRoom.includes('LH')
                ? ['lecture_hall']
                : ['classroom'],
        requested_room: preferredRoom === 'AUD-1' ? 'AUD' : preferredRoom,
        needs,
        raw_text: rawText || 'Submitted via structured booking form',
      };

      const res = await apiFetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg(`Venue request "${title}" successfully submitted! Request ID: ${data.booking?._id || 'REQ-NEW'}. Status: Pending Dean Approval.`);
        setParsedData(null);
        setRawText('');
        setTimeout(() => {
          setSuccessMsg(null);
          if (setActiveTab) setActiveTab('my-bookings');
        }, 2500);
      } else {
        setErrorMsg(data.error || 'Submission failed');
      }
    } catch (e) {
      console.error('Error submitting booking:', e);
      setErrorMsg(e.message || 'Network error submitting booking');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header (Unboxed, Consistent text-2xl) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <PlusCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>New Venue Booking — English & Hinglish NLP</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Rule 3: "Accept venue requests written in plain English or Hinglish, turn them into a structured booking, and let the user check and edit it before submitting."
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setActiveMode('ai')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeMode === 'ai'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
          >
            AI Natural Language / Hinglish
          </button>
          <button
            onClick={() => setActiveMode('manual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeMode === 'manual'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
          >
            Manual Form (Rule 6 Fallback)
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AI Mode: Prompt Input */}
      {activeMode === 'ai' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>Step 1: Write Request in Plain English or Hinglish</span>
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold">Zero rigid keywords required</span>
          </div>

          <textarea
            rows={3}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Type here in Hinglish or English, e.g.: Humhe Auditorium chahiye Thursday ko shaam 6 baje se 9 baje tak Dramatics play rehearsal ke liye, attendance around 180 log honge..."
            className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed"
          ></textarea>

          {/* Sample Prompts */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Click a sample Hinglish prompt to test:</span>
            <div className="mt-1.5 space-y-1.5">
              {SAMPLE_HINGLISH_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRawText(p)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 hover:border-emerald-300 dark:hover:border-emerald-700 hover:scale-[1.006] active:scale-[0.99] transition-all duration-200 flex items-center justify-between group cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleParsePrompt}
              disabled={isParsing || !rawText.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs transition-all flex items-center space-x-2 shadow-md hover:shadow-lg shadow-emerald-600/20 disabled:opacity-50 cursor-pointer group"
            >
              <Sparkles className={`w-4 h-4 ${isParsing ? 'animate-spin' : ''}`} />
              <span>{isParsing ? 'Parsing NLP Request...' : 'Parse & Populate Review Card'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Check & Edit Form (Always available and populated after parse) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <Edit3 className="w-4 h-4 text-indigo-600" />
              <span>Step 2: Check and Edit Structured Booking Details</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review all extracted parameters and make adjustments before submitting to the Deans Office.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            Rule 3 Compliant
          </span>
        </div>

        <form onSubmit={handleFinalSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Event Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Requested Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="club_event">Club & Society Event (Rank 6)</option>
                <option value="guest_lecture">Guest Lecture / Workshop (Rank 4)</option>
                <option value="institute_event">Spectra Main Institute Event (Rank 3)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expected Attendance
              </label>
              <input
                type="number"
                min={10}
                max={500}
                required
                value={attendance}
                onChange={(e) => setAttendance(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Duration (Periods)
              </label>
              <select
                value={durationPeriods}
                onChange={(e) => setDurationPeriods(Number(e.target.value))}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value={1}>1 Period (1 Hour)</option>
                <option value={2}>2 Periods (2 Hours)</option>
                <option value={3}>3 Periods (3 Hours)</option>
                <option value={4}>4 Periods (4 Hours)</option>
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
                Start Time
              </label>
              <select
                value={startPeriod}
                onChange={(e) => setStartPeriod(Number(e.target.value))}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value={1}>P1 (08:00 - Morning)</option>
                <option value={2}>P2 (09:00)</option>
                <option value={3}>P3 (10:00)</option>
                <option value={4}>P4 (11:00)</option>
                <option value={5}>P5 (12:00)</option>
                <option value={6}>P6 (14:00 - Afternoon)</option>
                <option value={7}>P7 (15:00)</option>
                <option value={8}>P8 (16:00)</option>
                <option value={9}>P9 (17:00)</option>
                <option value={10}>P10 (18:00 - Evening Event)</option>
                <option value={11}>P11 (19:00 - Evening Event)</option>
                <option value={12}>P12 (20:00 - Evening Event)</option>
                <option value={13}>P13 (21:00 - Evening Event)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Requested Venue / Room
            </label>
            <select
              value={preferredRoom}
              onChange={(e) => setPreferredRoom(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="AUD">AUD: Main Auditorium (Capacity: 500, Projector, Stage, Audio System)</option>
              <option value="OAT">OAT: Open Air Theatre (Capacity: 400, Outdoor)</option>
              <option value="SH-1">SH-1: Seminar Hall 1 (Capacity: 80, Audio/Video)</option>
              <option value="SH-2">SH-2: Seminar Hall 2 (Capacity: 80, Audio/Video)</option>
              <option value="LH-1">LH-1: Large Lecture Hall 1 (Capacity: 120)</option>
              <option value="CR-101">CR-101: Classroom 101 (Capacity: 60)</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Note: Withdrawn requests can be cancelled directly by the club under Rule B3.
            </span>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center space-x-2 shadow-lg shadow-emerald-600/30 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting to Dean...' : 'Confirm & Submit Venue Request'}</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
