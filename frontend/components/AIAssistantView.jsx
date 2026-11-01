'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import VoiceMicButton from './VoiceMicButton';
import {
  Sparkles,
  Send,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowRight,
  Bot,
  UserCheck,
  FileText,
  HelpCircle,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  ShieldCheck,
  ShieldAlert
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
    label: 'Faculty Swap Request',
    text: 'I cannot take classes on Wednesday morning due to HOD duties, can my CS101 session be moved to Thursday?'
  }
];

// Caring / reminder message shown for faculty requests, based on the reason they typed.
function getCareMessage(text) {
  const t = String(text || '').toLowerCase();
  const has = (re) => re.test(t);
  const rel = (t.match(/\b(son|daughter|father|mother|wife|husband|brother|sister|parents?|child|kid|beta|beti|papa|mummy|maa)\b/) || [])[1];
  const msgs = [];
  if (has(/\b(wedding|marriage|married|shaadi|shadi|engagement|vivah)\b/)) {
    msgs.push({ tone: 'happy', text: rel === 'son' || rel === 'beta' ? 'Congratulations on your son\u2019s wedding! Wishing the whole family joy and happiness.' : rel === 'daughter' || rel === 'beti' ? 'Congratulations on your daughter\u2019s wedding! Wishing the whole family joy and happiness.' : 'Congratulations on the wedding! Wishing you and your family lots of happiness. Enjoy every moment.' });
  }
  if (has(/\b(baby|newborn|new born|delivery|birth of|blessed with|paternity|maternity)\b/)) {
    msgs.push({ tone: 'happy', text: 'Congratulations on the new arrival! Wishing you and your family good health and happiness.' });
  }
  if (has(/\b(death|passed away|funeral|demise|bereavement|antim|expired)\b/)) {
    msgs.push({ tone: 'sad', text: 'We are very sorry for your loss. Please take the time you need with your family. Sending our condolences.' });
  }
  if (has(/\b(sick|ill|illness|unwell|fever|surgery|hospital|admitted|injury|injured|medical|doctor|health|weak|bimar|tabiyat|not feeling well|operation|checkup|check-up)\b/)) {
    msgs.push({ tone: 'care', text: rel && !has(/\b(i am|i\u2019m|i'm|my health|myself)\b/) ? `We hope your ${rel} recovers soon. Please take care of your family and yourself. Do not worry about the classes.` : 'Take care and get well soon. Your health comes first, so please rest properly. Do not worry about the classes.' });
  }
  if (has(/\b(hod|meeting|conference|workshop|seminar|invigilation|exam duty|committee|audit|naac|nba|interview|training)\b/)) {
    msgs.push({ tone: 'remind', text: 'Reminder: please inform your students about the change and share notes or assignments for the affected classes. You may also plan a make-up class if possible.' });
  }
  return msgs;
}

// "B R zero seven" / "BR 7" / "br-07" -> "BR-07" (so the explainer works by voice)
const SPOKEN_DIGITS = { zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
function normalizeSpokenBookingId(text) {
  let t = String(text || '').toLowerCase().replace(/[.,]/g, ' ');
  t = t.split(/\s+/).map((w) => (w in SPOKEN_DIGITS ? String(SPOKEN_DIGITS[w]) : w)).join(' ');
  const m = t.match(/b\s*r\s*[-\s]*((?:\d\s*){1,3})/);
  if (m) return `BR-${m[1].replace(/\s+/g, '').padStart(2, '0')}`;
  return text;
}

export default function AIAssistantView({ currentUser: currentUserProp }) {
  // FIX: page.js used to render <AIAssistantView /> with NO props, so role was undefined
  // (admin buttons hidden, wrong requester role). Fall back to the saved login if prop is missing.
  const [storedUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cit_user') || 'null');
    } catch (e) {
      return null;
    }
  });
  const currentUser = currentUserProp || storedUser;
  const role = currentUser?.role;
  const showBooking = role !== 'faculty';
  const showFaculty = role === 'admin' || role === 'faculty';
  const showExplainer = role !== 'faculty';

  // ================= MODULE 1: BOOKING ASSISTANT STATE =================
  const [promptText, setPromptText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [bookingSessionId, setBookingSessionId] = useState(() => `sess_booking_${Date.now()}`);

  const [agentReply, setAgentReply] = useState('');
  const [assumptions, setAssumptions] = useState([]);
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [followUpAnswer, setFollowUpAnswer] = useState('');

  const [draft, setDraft] = useState(null);
  const [checkResult, setCheckResult] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(null);

  // ================= MODULE 2: FACULTY ASSISTANT STATE =================
  const [facultyPrompt, setFacultyPrompt] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const todayLocal = new Date().toLocaleDateString('en-CA');
  const [isFacultyLoading, setIsFacultyLoading] = useState(false);
  const [facultyError, setFacultyError] = useState(null);
  const [facultyResponse, setFacultyResponse] = useState(null);
  const [proposalData, setProposalData] = useState(null);
  const [proposalId, setProposalId] = useState(null);
  const [facultySessionId] = useState(() => `sess_faculty_${Date.now()}`);

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [staleError, setStaleError] = useState(false);
  const [careMessages, setCareMessages] = useState([]);
  const [submitState, setSubmitState] = useState('idle'); // idle | submitting | submitted | discarded

  // ---- FIX: unsent drafts used to live only in React state and vanished on tab switch / reload ----
  const [myDrafts, setMyDrafts] = useState([]);
  const [restoredNote, setRestoredNote] = useState(null);
  const FORM_KEY = 'cf_faculty_form';

  const loadMyDrafts = useCallback(async (autoOpen = false) => {
    if (role !== 'faculty') return;
    try {
      const res = await apiFetch('/api/disruptions');
      const data = await res.json();
      if (!res.ok || !data.success) return;
      const mine = (data.disruptions || []).filter(
        (d) => d.status === 'draft' && [currentUser?.id, currentUser?.name].includes(d.requested_by)
      );
      setMyDrafts(mine);
      if (autoOpen && mine.length) openDraft(mine[0], true);
    } catch (e) { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, currentUser?.id, currentUser?.name]);

  function openDraft(d, auto = false) {
    setProposalId(d._id);
    setProposalData(d.proposal || null);
    setFacultyResponse(null);
    setSubmitState('idle');
    setActionSuccess(null);
    setFacultyError(null);
    setRestoredNote(
      `${auto ? 'Restored your unsent draft' : 'Opened draft'}: "${d.title}" (${d._id}). It is saved but NOT yet sent to the admin - press Submit when ready.`
    );
  }

  // restore on every visit
  useEffect(() => { loadMyDrafts(true); }, [loadMyDrafts]);

  // remember what the faculty typed (prompt + dates) across tab switches
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(FORM_KEY) || 'null');
      if (saved) {
        if (saved.prompt) setFacultyPrompt(saved.prompt);
        if (saved.from) setDateFrom(saved.from);
        if (saved.to) setDateTo(saved.to);
      }
    } catch (e) { /* ignore */ }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(FORM_KEY, JSON.stringify({ prompt: facultyPrompt, from: dateFrom, to: dateTo }));
    } catch (e) { /* ignore */ }
  }, [facultyPrompt, dateFrom, dateTo]);

  // ================= MODULE 3: DECISION EXPLAINER STATE =================
  const [explainQuery, setExplainQuery] = useState('BR-01');
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainResult, setExplainResult] = useState(null);
  const [explainError, setExplainError] = useState(null);

  // ---------------------------------------------------------------------
  // MODULE 1 HANDLERS: BOOKING ASSISTANT
  // ---------------------------------------------------------------------
  async function runFeasibilityCheck(draftToTest) {
    setIsChecking(true);
    try {
      const res = await apiFetch('/api/bookings/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: draftToTest }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCheckResult(data);
      } else {
        setCheckResult({
          verdict: 'invalid',
          reasons: [data.error || 'Feasibility check failed']
        });
      }
    } catch (err) {
      console.error('Feasibility check error:', err);
      setCheckResult({
        verdict: 'invalid',
        reasons: ['Network error running feasibility check']
      });
    } finally {
      setIsChecking(false);
    }
  }

  async function handleParseBooking(overrideMessage = null) {
    const textToSend = overrideMessage || promptText;
    if (!textToSend.trim()) return;

    setIsParsing(true);
    setBookingError(null);
    setSubmitSuccess(null);
    setStaleError(false);

    try {
      // 1. Send to POST /api/agent/chat
      const chatRes = await apiFetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          session_id: bookingSessionId,
        }),
      });

      if (chatRes.status === 503) {
        // Fallback to rules-based parse-booking in Offline Mode
        setOfflineMode(true);
        const fallbackRes = await apiFetch('/api/ai/parse-booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            raw_text: textToSend,
            requester_role: currentUser?.role || 'club',
            requester_name: currentUser?.name || 'Club Representative',
          }),
        });
        const fbData = await fallbackRes.json();
        if (fbData.success) {
          const parsed = fbData.booking || fbData.parsed || {};
          const window = parsed.windows?.[0] || {};
          const assembledDraft = {
            title: parsed.title || 'Event Booking',
            day: window.day || 'MON',
            from_period: Number(window.from_period || 10),
            to_period: Number(window.to_period || 11),
            duration_periods: Number(parsed.duration_periods || 2),
            attendance: Number(parsed.attendance || 50),
            room_types: Array.isArray(parsed.room_types) ? parsed.room_types.join(', ') : (parsed.room_types || ''),
            needs: Array.isArray(parsed.needs) ? parsed.needs.join(', ') : (parsed.needs || ''),
            requested_room: parsed.requested_room || '',
            requested_category: parsed.requested_category || 'club_event',
          };
          setDraft(assembledDraft);
          setAgentReply('Extracted draft using offline rule parser.');
          setAssumptions(['Parsed in offline fallback mode']);
          setFollowUpQuestions([]);
          await runFeasibilityCheck({
            ...assembledDraft,
            room_types: assembledDraft.room_types ? assembledDraft.room_types.split(',').map(s => s.trim()) : [],
            needs: assembledDraft.needs ? assembledDraft.needs.split(',').map(s => s.trim()) : [],
            windows: [{ day: assembledDraft.day, from_period: assembledDraft.from_period, to_period: assembledDraft.to_period }]
          });
        } else {
          setBookingError(fbData.error || 'Parsing failed in offline mode.');
        }
        return;
      }

      const data = await chatRes.json();
      if (!chatRes.ok || !data.success) {
        setBookingError(data.error || 'Agent service encountered an error.');
        return;
      }

      setOfflineMode(false);
      setAgentReply(data.reply || '');
      setAssumptions(data.assumptions || []);
      setFollowUpQuestions(data.follow_up_questions || []);

      // Extract tool trace results if check_booking was called
      let toolCheckResult = null;
      if (Array.isArray(data.tool_trace)) {
        for (const trace of data.tool_trace) {
          if (trace.tool === 'check_booking' && trace.type === 'response') {
            toolCheckResult = trace.result;
          }
        }
      }

      if (data.draft) {
        const window = data.draft.windows?.[0] || {};
        const fromP = Number(window.from_period || 10);
        const toP = Number(window.to_period || 11);
        const assembledDraft = {
          title: data.draft.title || 'Club Event',
          day: window.day || 'MON',
          from_period: fromP,
          to_period: toP,
          duration_periods: Number(data.draft.duration_periods || (toP - fromP + 1) || 2),
          attendance: Number(data.draft.attendance || 50),
          room_types: Array.isArray(data.draft.room_types) ? data.draft.room_types.join(', ') : (data.draft.room_types || ''),
          needs: Array.isArray(data.draft.needs) ? data.draft.needs.join(', ') : (data.draft.needs || ''),
          requested_room: data.draft.requested_room || '',
          requested_category: data.draft.requested_category || 'club_event',
        };
        setDraft(assembledDraft);

        if (toolCheckResult) {
          setCheckResult(toolCheckResult);
        } else {
          await runFeasibilityCheck({
            ...assembledDraft,
            room_types: assembledDraft.room_types ? assembledDraft.room_types.split(',').map(s => s.trim()) : [],
            needs: assembledDraft.needs ? assembledDraft.needs.split(',').map(s => s.trim()) : [],
            windows: [{ day: assembledDraft.day, from_period: assembledDraft.from_period, to_period: assembledDraft.to_period }]
          });
        }
      } else if (toolCheckResult) {
        setCheckResult(toolCheckResult);
      }
    } catch (err) {
      console.error('Chat booking error:', err);
      setBookingError(err.message || 'Error communicating with assistant.');
    } finally {
      setIsParsing(false);
    }
  }

  function handleDraftFieldChange(field, value) {
    setDraft(prev => ({ ...prev, [field]: value }));
  }

  async function handleManualRecheck() {
    if (!draft) return;
    const roomTypesList = draft.room_types
      ? draft.room_types.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const needsList = draft.needs
      ? draft.needs.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const payload = {
      title: draft.title,
      attendance: Number(draft.attendance),
      duration_periods: Number(draft.duration_periods),
      windows: [{
        day: draft.day,
        from_period: Number(draft.from_period),
        to_period: Number(draft.to_period),
      }],
      room_types: roomTypesList,
      needs: needsList,
      requested_room: draft.requested_room.trim() || undefined,
      requested_category: draft.requested_category,
    };
    await runFeasibilityCheck(payload);
  }

  async function handleConfirmSubmit() {
    if (!draft || isSubmitting) return;
    setIsSubmitting(true);
    setBookingError(null);

    try {
      const roomTypesList = draft.room_types
        ? draft.room_types.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const needsList = draft.needs
        ? draft.needs.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const payload = {
        title: draft.title,
        attendance: Number(draft.attendance),
        duration_periods: Number(draft.duration_periods),
        windows: [{
          day: draft.day,
          from_period: Number(draft.from_period),
          to_period: Number(draft.to_period),
        }],
        room_types: roomTypesList,
        needs: needsList,
        requested_room: draft.requested_room.trim() || undefined,
        requested_category: draft.requested_category,
      };

      // Generate client-side UUID for idempotency
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `key_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const res = await apiFetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitSuccess({
          message: 'Booking submitted and saved successfully with verified constraint check!',
          bookingId: data.booking?.request_id || data.request_id || 'Submitted',
        });
        setDraft(null);
        setCheckResult(null);
      } else {
        setBookingError(data.error || 'Failed to submit booking request.');
      }
    } catch (err) {
      console.error('Submit booking error:', err);
      setBookingError(err.message || 'Network error submitting booking request.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFollowUpReply() {
    if (!followUpAnswer.trim()) return;
    const answer = followUpAnswer;
    setFollowUpAnswer('');
    handleParseBooking(answer);
  }

  // ---------------------------------------------------------------------
  // MODULE 2 HANDLERS: FACULTY DISRUPTION ASSISTANT
  // ---------------------------------------------------------------------
  async function handleFacultyAssistant(overrideText) {
    const promptNow = typeof overrideText === 'string' ? overrideText : facultyPrompt;
    if (!promptNow.trim()) return;
    setIsFacultyLoading(true);
    setFacultyError(null);
    setProposalData(null);
    setProposalId(null);
    setActionSuccess(null);
    setSubmitState('idle');
    setCareMessages(getCareMessage(promptNow));
    setStaleError(false);

    const facultyMessage = dateFrom
      ? `${promptNow} [Dates: from ${dateFrom}${dateTo && dateTo !== dateFrom ? ' to ' + dateTo : ''}]`
      : promptNow;

    try {
      let res = await apiFetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: facultyMessage,
          session_id: facultySessionId,
        }),
      });

      // FIX: if the Gemini agent service is down / not configured, automatically fall back
      // to the rule-based faculty assistant so the faculty feature still works.
      if (res.status === 503 || res.status === 500 || !res.ok) {
        res = await apiFetch('/api/ai/faculty-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: facultyMessage, date_from: dateFrom || undefined, date_to: dateTo || undefined }),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg = data.error === 'ai_unavailable'
          ? 'AI Agent service is temporarily unavailable or timed out. Please try again or submit via the manual request form.'
          : (data.error || 'Agent service could not process the timetable request.');
        setFacultyError(errMsg);
        return;
      }

      setFacultyResponse(data);
      setProposalId(data.proposal_id || null);

      // Check tool trace for proposal
      let foundProposal = null;
      let foundId = data.proposal_id;
      if (Array.isArray(data.tool_trace)) {
        for (const trace of data.tool_trace) {
          if (trace.tool === 'propose_timetable_change' && trace.type === 'response') {
            if (trace.result?.proposal) {
              foundProposal = trace.result.proposal;
              foundId = trace.result.disruption_id || trace.result.id;
            }
          }
        }
      }

      if (foundProposal) {
        setProposalData(foundProposal);
        if (foundId) setProposalId(foundId);
      } else if (foundId) {
        // Fetch proposal details directly
        const pRes = await apiFetch(`/api/disruptions/${foundId}`);
        const pData = await pRes.json();
        if (pRes.ok && pData.success && pData.disruption?.proposal) {
          setProposalData(pData.disruption.proposal);
        }
      }
    } catch (err) {
      console.error('Faculty assistant error:', err);
      const msg = (err.message && !err.message.includes('Unexpected token')) ? err.message : 'AI Agent service is temporarily unavailable. Please try again or submit via the manual request form.';
      setFacultyError(msg);
    } finally {
      setIsFacultyLoading(false);
      loadMyDrafts(false);
    }
  }

  async function handleFacultySubmit(action) {
    if (!proposalId || submitState === 'submitting') return;
    setSubmitState('submitting');
    setFacultyError(null);
    try {
      const res = await apiFetch('/api/disruptions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disruption_id: proposalId, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFacultyError(data.error || 'Could not complete this action.');
        setSubmitState('idle');
        return;
      }
      setRestoredNote(null);
      loadMyDrafts(false);
      try { sessionStorage.removeItem(FORM_KEY); } catch (e) { /* ignore */ }
      setFacultyPrompt('');
      if (action === 'discard') {
        setSubmitState('discarded');
        setProposalData(null);
        setActionSuccess('Draft discarded. Nothing was sent to the admin.');
      } else {
        setSubmitState('submitted');
        setActionSuccess(`Request ${proposalId} submitted to the admin for approval. You will see the change in your timetable once it is approved.`);
      }
    } catch (err) {
      setFacultyError(err.message || 'Network error. Please try again.');
      setSubmitState('idle');
    }
  }

  async function handleAdminApproveProposal() {
    if (!proposalId || isActionLoading) return;
    setIsActionLoading(true);
    setStaleError(false);
    setActionSuccess(null);

    try {
      const res = await apiFetch('/api/disruptions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disruption_id: proposalId }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setStaleError(true);
      } else if (res.ok && data.success) {
        setActionSuccess(`Proposal ${proposalId} approved! Timetable upgraded to version ${data.new_version}.`);
      } else {
        setFacultyError(data.error || 'Failed to approve proposal.');
      }
    } catch (err) {
      console.error('Approve proposal error:', err);
      setFacultyError(err.message || 'Network error approving proposal.');
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleAdminRejectProposal() {
    if (!proposalId || isActionLoading) return;
    setIsActionLoading(true);
    setActionSuccess(null);

    try {
      const res = await apiFetch('/api/disruptions/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disruption_id: proposalId, reason: 'Rejected by administrator' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess(`Proposal ${proposalId} rejected.`);
      } else {
        setFacultyError(data.error || 'Failed to reject proposal.');
      }
    } catch (err) {
      console.error('Reject proposal error:', err);
      setFacultyError(err.message || 'Network error rejecting proposal.');
    } finally {
      setIsActionLoading(false);
    }
  }

  // ---------------------------------------------------------------------
  // MODULE 3 HANDLERS: DECISION EXPLAINER
  // ---------------------------------------------------------------------
  async function handleExplainDecision(overrideQuery) {
    const q = (typeof overrideQuery === 'string' ? overrideQuery : explainQuery).trim();
    if (!q) return;

    // Explainer accepts booking IDs only (BR-...)
    if (!/^BR-/i.test(q)) {
      setExplainResult(null);
      setExplainError('Please enter a valid Booking ID starting with "BR-" (e.g. BR-01, BR-07). Session explanations are not supported.');
      return;
    }

    setIsExplaining(true);
    setExplainResult(null);
    setExplainError(null);

    try {
      const endpoint = `/api/decisions/booking/${encodeURIComponent(q)}`;
      const res = await apiFetch(endpoint);
      const data = await res.json();

      if (res.status === 404) {
        setExplainError(`No recorded decision found for booking: "${q}".`);
        return;
      }
      if (res.status === 403) {
        setExplainError(`Access Denied: You do not have permission to view decisions for "${q}".`);
        return;
      }
      if (!res.ok || !data.success) {
        setExplainError(data.error || 'Could not retrieve decision details.');
        return;
      }

      setExplainResult(data);
    } catch (err) {
      console.error('Explain error:', err);
      setExplainError(err.message || 'Error fetching decision explanation.');
    } finally {
      setIsExplaining(false);
    }
  }

  return (
    <div className="space-y-8">

      {/* ============================================================= */}
      {/* MODULE 1: AI NATURAL LANGUAGE & HINGLISH BOOKING ASSISTANT    */}
      {/* ============================================================= */}
      {showBooking && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                AI Natural Language & Hinglish Booking Assistant
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Transforms unstructured English or Hinglish event requests into structured venue bookings with instant deterministic constraint checking.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {offlineMode && (
                <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-300">
                  Offline mode
                </span>
              )}
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800">
                Deterministic Gate
              </span>
            </div>
          </div>

          {/* Quick Sample Prompts */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Try Sample Benchmark Prompts (English & Hinglish):
            </span>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
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
            <div className="flex items-start gap-2">
            <textarea
              rows={3}
              placeholder="Type or speak your venue request in plain English or Hinglish... e.g. 'Bhai Auditorium chahiye Thursday 6pm se 8pm for 450 people with stage and PA system'..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="flex-1 text-xs p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <VoiceMicButton value={promptText} onChange={setPromptText} onDone={(t) => handleParseBooking(t)} />
          </div>

            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-400 italic">
                *All booking validity is decided by deterministic backend solver rules, never by the LLM.
              </span>
              <button
                type="button"
                onClick={() => handleParseBooking()}
                disabled={isParsing || !promptText.trim()}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isParsing ? 'Analyzing Request...' : 'Extract & Check Feasibility'}</span>
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {bookingError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{bookingError}</span>
              </div>
              <button type="button" onClick={() => setBookingError(null)} className="text-rose-500 hover:text-rose-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Success Alert */}
          {submitSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">{submitSuccess.message}</p>
                <p className="text-[11px] mt-0.5">Booking Reference: <code className="bg-emerald-100 dark:bg-emerald-900 px-1 py-0.5 rounded font-mono">{submitSuccess.bookingId}</code></p>
              </div>
            </div>
          )}

          {/* Agent Reply Text */}
          {agentReply && (
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-300">
                <Bot className="w-4 h-4 text-indigo-600" />
                <span>Assistant Message:</span>
              </div>
              <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{agentReply}</p>
            </div>
          )}

          {/* Assumptions List (Yellow) */}
          {assumptions && assumptions.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
                <Info className="w-4 h-4 text-amber-600" />
                <span>Assumptions & Inferred Parameters:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-amber-900/90 dark:text-amber-200/90 pl-1">
                {assumptions.map((asm, idx) => (
                  <li key={idx}>{asm}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Follow-up Questions Box */}
          {followUpQuestions && followUpQuestions.length > 0 && (
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span>Follow-up Clarification Needed:</span>
              </div>
              <ul className="space-y-1 text-blue-900/90 dark:text-blue-200/90">
                {followUpQuestions.map((q, idx) => (
                  <li key={idx} className="font-medium">• {q}</li>
                ))}
              </ul>
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Type your answer to clarify..."
                  value={followUpAnswer}
                  onChange={(e) => setFollowUpAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleFollowUpReply(); }}
                  className="flex-1 text-xs p-2.5 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-lg text-slate-900 dark:text-white"
                />
                <VoiceMicButton size="sm" value={followUpAnswer} onChange={setFollowUpAnswer} onDone={(t) => { setFollowUpAnswer(''); handleParseBooking(t); }} />
                <button
                  type="button"
                  onClick={handleFollowUpReply}
                  disabled={!followUpAnswer.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  Reply
                </button>
              </div>
            </div>
          )}

          {/* Extracted Structured Booking (Editable Inputs) */}
          {draft && (
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Extracted Booking Parameters (Review & Edit)</span>
                </h3>
                <button
                  type="button"
                  onClick={handleManualRecheck}
                  disabled={isChecking}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-3 py-1 rounded-lg transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>{isChecking ? 'Re-checking...' : 'Re-check Feasibility'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-semibold">Event Title</label>
                  <input
                    type="text"
                    value={draft.title || ''}
                    onChange={(e) => handleDraftFieldChange('title', e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg font-semibold mt-0.5 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-semibold">Day (MON-FRI)</label>
                  <select
                    value={draft.day || 'MON'}
                    onChange={(e) => handleDraftFieldChange('day', e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg font-semibold mt-0.5 text-slate-900 dark:text-white"
                  >
                    <option value="MON">Monday</option>
                    <option value="TUE">Tuesday</option>
                    <option value="WED">Wednesday</option>
                    <option value="THU">Thursday</option>
                    <option value="FRI">Friday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-semibold">Period Range (From - To)</label>
                  <div className="flex items-center gap-1 mt-0.5">
                    <input
                      type="number"
                      min="1"
                      max="13"
                      value={draft.from_period || 10}
                      onChange={(e) => handleDraftFieldChange('from_period', Number(e.target.value))}
                      className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg font-semibold text-slate-900 dark:text-white"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                      type="number"
                      min="1"
                      max="13"
                      value={draft.to_period || 11}
                      onChange={(e) => handleDraftFieldChange('to_period', Number(e.target.value))}
                      className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-semibold">Duration (Periods)</label>
                  <input
                    type="number"
                    min="1"
                    max="13"
                    value={draft.duration_periods || 2}
                    onChange={(e) => handleDraftFieldChange('duration_periods', Number(e.target.value))}
                    className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg font-semibold mt-0.5 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-semibold">Expected Attendance</label>
                  <input
                    type="number"
                    min="1"
                    value={draft.attendance || 0}
                    onChange={(e) => handleDraftFieldChange('attendance', Number(e.target.value))}
                    className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg font-semibold mt-0.5 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-semibold">Specific Venue Requested</label>
                  <input
                    type="text"
                    placeholder="e.g. AUD, SH-1, CR-101"
                    value={draft.requested_room || ''}
                    onChange={(e) => handleDraftFieldChange('requested_room', e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg font-semibold mt-0.5 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-semibold">Room Types (comma separated)</label>
                  <input
                    type="text"
                    placeholder="auditorium, seminar_hall"
                    value={draft.room_types || ''}
                    onChange={(e) => handleDraftFieldChange('room_types', e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg font-semibold mt-0.5 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-[10px] font-semibold">Special Needs (comma separated)</label>
                  <input
                    type="text"
                    placeholder="stage, pa_system, projector"
                    value={draft.needs || ''}
                    onChange={(e) => handleDraftFieldChange('needs', e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg font-semibold mt-0.5 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Deterministic Check Result Box */}
              {checkResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${checkResult.verdict === 'approved'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                    : checkResult.verdict === 'alternative_offered'
                      ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300'
                      : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold">
                      {checkResult.verdict === 'approved' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : checkResult.verdict === 'alternative_offered' ? (
                        <Info className="w-5 h-5 text-blue-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                      <span className="uppercase tracking-wider">
                        Solver Verdict: {checkResult.verdict?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {checkResult.room_id && (
                      <span className="px-2.5 py-0.5 rounded bg-white dark:bg-slate-900 font-mono font-bold text-xs border">
                        Room: {checkResult.room_id} ({checkResult.day} P{checkResult.start_period}-{checkResult.end_period})
                      </span>
                    )}
                  </div>

                  {checkResult.reason && (
                    <p className="text-[11px] leading-relaxed font-medium">{checkResult.reason}</p>
                  )}

                  {Array.isArray(checkResult.reasons) && checkResult.reasons.length > 0 && (
                    <ul className="list-disc list-inside text-[11px] space-y-0.5 pl-1 opacity-90">
                      {checkResult.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}

                  {Array.isArray(checkResult.affects_existing) && checkResult.affects_existing.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-amber-100/70 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-[11px]">
                      <strong>Caution:</strong> Approving this request would displace or alter existing booking(s):{' '}
                      <span className="font-mono font-bold">{checkResult.affects_existing.join(', ')}</span>.
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => { setDraft(null); setCheckResult(null); }}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting || (checkResult && checkResult.verdict === 'invalid')}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting with Idempotency Key...' : 'Submit Booking Request'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* MODULE 2: FACULTY TIMETABLE CHANGE ASSISTANT                  */}
      {/* ============================================================= */}
      {showFaculty && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                Faculty Timetable Change Assistant
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enables faculty to request medical leave, session swaps, or unavailability. Changes run through the CP-SAT repair engine without touching the active schedule until approved.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200">
              CP-SAT Solver Repair
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Affects dates (optional, for Calendar):</span>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-slate-500">From:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  if (!dateTo || dateTo < e.target.value) setDateTo(e.target.value);
                }}
                className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-slate-500">To:</label>
              <input
                type="date"
                min={dateFrom || undefined}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-[11px] text-rose-500 hover:underline"
              >
                Clear dates
              </button>
            )}
          </div>

          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="e.g. 'I cannot take classes on Wednesday morning due to HOD duties, can my CS101 session be moved to Thursday?'..."
              value={facultyPrompt}
              onChange={(e) => setFacultyPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleFacultyAssistant(); }}
              className="flex-1 text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <VoiceMicButton value={facultyPrompt} onChange={setFacultyPrompt} onDone={(t) => handleFacultyAssistant(t)} />
            <button
              type="button"
              onClick={handleFacultyAssistant}
              disabled={isFacultyLoading || !facultyPrompt.trim()}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow transition disabled:opacity-50"
            >
              {isFacultyLoading ? 'Running Solver...' : 'Ask Assistant'}
            </button>
          </div>

          {/* Error Alert */}
          {facultyError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{facultyError}</span>
              </div>
              <button type="button" onClick={() => setFacultyError(null)} className="text-rose-500 hover:text-rose-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Stale Proposal Alert (409) */}
          {staleError && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold">Timetable changed since this proposal — request again</p>
                <p className="text-[11px] mt-0.5">The baseline schedule version was upgraded by another approved disruption. Please regenerate the proposal against current version.</p>
              </div>
            </div>
          )}

          {/* Action Success Alert */}
          {actionSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{actionSuccess}</span>
            </div>
          )}

          {/* Caring reminders */}
          {careMessages.length > 0 && (
            <div className="space-y-2">
              {careMessages.map((m, i) => (
                <div key={i} className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${m.tone === 'happy' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                    : m.tone === 'remind' ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-800 dark:text-amber-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-300'}`}>
                  <span className="text-base leading-none">{m.tone === 'happy' ? '🎉' : m.tone === 'remind' ? '📝' : '💙'}</span>
                  <span className="font-medium leading-relaxed">{m.text}</span>
                </div>
              ))}
            </div>
          )}

          {restoredNote && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
              {restoredNote}
            </div>
          )}

          {role === 'faculty' && myDrafts.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200">My unsent drafts ({myDrafts.length})</div>
              {myDrafts.map((d) => (
                <div key={d._id} className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    <span className="font-mono">{d._id}</span> - {d.title}
                    <span className="text-slate-400"> · {new Date(d.createdAt).toLocaleString('en-IN')}</span>
                  </span>
                  <button type="button" onClick={() => openDraft(d)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-semibold shrink-0">
                    {proposalId === d._id ? 'Open' : 'Resume'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Conversational Reply */}
          {facultyResponse && facultyResponse.reply && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Bot className="w-4 h-4 text-indigo-600" />
                <span>Assistant Response:</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {facultyResponse.reply}
              </p>
            </div>
          )}

          {/* Detailed Proposal & Diff Card */}
          {proposalData && (
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-xs">Solver Repair Proposal</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[11px] font-bold border border-amber-300 dark:border-amber-700">
                    {role === 'faculty' ? (submitState === 'submitted' ? 'submitted - awaiting admin approval' : 'draft - not sent yet') : 'proposal – awaiting admin approval'}
                  </span>
                </div>
                {proposalId && (
                  <span className="text-[11px] font-mono text-slate-500">ID: {proposalId}</span>
                )}
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border">
                  <span className="text-slate-400 text-[10px] block">Moved Sessions</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {proposalData.diff ? proposalData.diff.length : 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border">
                  <span className="text-slate-400 text-[10px] block">Unchanged Sessions</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {proposalData.unchanged_count ?? 'N/A'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border">
                  <span className="text-slate-400 text-[10px] block">Hard Violations</span>
                  <span className={`font-bold text-sm ${(proposalData.validator?.hard_violation_count || 0) === 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                    {proposalData.validator?.hard_violation_count ?? 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border">
                  <span className="text-slate-400 text-[10px] block">Feasible</span>
                  <span className={`font-bold text-sm ${proposalData.feasible ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {proposalData.feasible ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              {/* Dropped Sessions Alert */}
              {proposalData.dropped && Object.keys(proposalData.dropped).length > 0 && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-800 dark:text-rose-300 text-xs space-y-1">
                  <strong>Dropped Sessions:</strong>
                  <ul className="list-disc list-inside">
                    {Object.entries(proposalData.dropped).map(([sessId, reasons]) => (
                      <li key={sessId}>
                        <span className="font-mono font-bold">{sessId}</span>: {Array.isArray(reasons) ? reasons.join(', ') : reasons}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Diff Table */}
              {Array.isArray(proposalData.diff) && proposalData.diff.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Session ID</th>
                        <th className="p-2.5">Original Slot</th>
                        <th className="p-2.5">New Repaired Slot</th>
                        <th className="p-2.5">Change Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                      {proposalData.diff.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2.5 font-mono font-semibold text-slate-900 dark:text-white">
                            {item.session_id}
                          </td>
                          <td className="p-2.5 text-slate-500">
                            {item.old ? `${item.old.day} P${item.old.start_period ?? item.old.period} (${item.old.room_id ?? item.old.room})` : 'None (Added)'}
                          </td>
                          <td className="p-2.5 font-semibold text-indigo-600 dark:text-indigo-400">
                            {item.new ? `${item.new.day} P${item.new.start_period ?? item.new.period} (${item.new.room_id ?? item.new.room})` : 'Dropped'}
                          </td>
                          <td className="p-2.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.type === 'time_and_room' ? 'bg-amber-100 text-amber-800' :
                                item.type === 'room_only' ? 'bg-blue-100 text-blue-800' :
                                  'bg-purple-100 text-purple-800'
                              }`}>
                              {item.type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No schedule moves required for this change.</p>
              )}

              {/* Faculty confirm step: review -> submit to admin */}
              {role === 'faculty' && proposalId && submitState !== 'submitted' && submitState !== 'discarded' && (
                <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-xs text-indigo-900 dark:text-indigo-200 font-medium">
                    Please review the changes above. This is only a draft until you submit it. Do you want to send this request to the admin?
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => handleFacultySubmit('discard')} disabled={submitState === 'submitting'}
                      className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold disabled:opacity-50">
                      Discard
                    </button>
                    <button type="button" onClick={() => handleFacultySubmit('submit')} disabled={submitState === 'submitting' || !proposalData?.feasible}
                      title={!proposalData?.feasible ? 'The solver could not find a fully feasible repair' : ''}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow disabled:opacity-50">
                      {submitState === 'submitting' ? 'Submitting...' : 'Submit to Admin'}
                    </button>
                  </div>
                </div>
              )}

              {/* Admin Action Buttons */}
              {currentUser?.role === 'admin' && (
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={handleAdminRejectProposal}
                    disabled={isActionLoading || !proposalId}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                  >
                    Reject Proposal
                  </button>
                  <button
                    type="button"
                    onClick={handleAdminApproveProposal}
                    disabled={isActionLoading || !proposalId || proposalData.feasible === false}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow transition disabled:opacity-50"
                  >
                    {isActionLoading ? 'Committing...' : 'Approve & Apply to Schedule'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* MODULE 3: INSTITUTIONAL DECISION EXPLAINER                    */}
      {/* ============================================================= */}
      {showExplainer && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                Administrative Decision Explainer
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Transparent, facts-only explanations for why a booking request was approved, rejected, capped, or moved. (Booking IDs only, e.g. BR-01)
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-200">
              Audit Facts
            </span>
          </div>

          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter Booking ID (e.g. BR-01, BR-04, BR-07)..."
              value={explainQuery}
              onChange={(e) => setExplainQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleExplainDecision(); }}
              className="flex-1 text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            <VoiceMicButton value={explainQuery} onChange={setExplainQuery} normalize={normalizeSpokenBookingId} lang="en-IN" onDone={(t) => handleExplainDecision(t)} />
            <button
              type="button"
              onClick={handleExplainDecision}
              disabled={isExplaining || !explainQuery.trim()}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow transition disabled:opacity-50"
            >
              {isExplaining ? 'Looking up facts...' : 'Explain Decision'}
            </button>
          </div>

          {/* Explainer Error Display */}
          {explainError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{explainError}</span>
              </div>
              <button type="button" onClick={() => setExplainError(null)} className="text-rose-500 hover:text-rose-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Decision Facts Display */}
          {explainResult && (
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">Facts for {explainQuery}:</span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded font-bold uppercase ${explainResult.decision_status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                      explainResult.decision_status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                        explainResult.decision_status === 'cancelled' ? 'bg-slate-200 text-slate-700' :
                          'bg-amber-100 text-amber-800'
                    }`}>
                    {explainResult.decision_status || 'Pending'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Requester: {explainResult.booking?.requester || 'Recorded'}
                </span>
              </div>

              {/* Facts Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border">
                  <span className="text-[10px] text-slate-400 block">Requested Category</span>
                  <span className="font-semibold text-slate-900 dark:text-white capitalize">
                    {explainResult.booking?.requested_category || 'N/A'}
                  </span>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border">
                  <span className="text-[10px] text-slate-400 block">Effective Category (Capped)</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 capitalize">
                    {explainResult.effective_category || explainResult.booking?.requested_category || 'N/A'}
                  </span>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border">
                  <span className="text-[10px] text-slate-400 block">Allocated Room</span>
                  <span className="font-semibold text-slate-900 dark:text-white font-mono">
                    {explainResult.fest_week_decision?.room_id || explainResult.booking?.allocated_room || 'None'}
                  </span>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border">
                  <span className="text-[10px] text-slate-400 block">Allocated Time</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {explainResult.fest_week_decision?.day
                      ? `${explainResult.fest_week_decision.day} P${explainResult.fest_week_decision.start_period}-${explainResult.fest_week_decision.end_period}`
                      : 'Not scheduled'}
                  </span>
                </div>
              </div>

              {/* Decision Reasons List with Hard / Soft Badges */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                  Decision Factors & Constraints Evaluated:
                </span>

                {Array.isArray(explainResult.facts) && explainResult.facts.length > 0 ? (
                  <div className="space-y-1.5">
                    {explainResult.facts.map((fact, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border text-xs">
                        <span className="text-slate-800 dark:text-slate-200">{fact.text || fact.reason}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${fact.type === 'hard' || fact.constraint_type === 'hard'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                          {fact.type || fact.constraint_type || 'HARD'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : explainResult.reason_recorded === false ? (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 italic text-xs">
                    No explicit reason text was recorded during decision.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border text-xs">
                      <span className="text-slate-800 dark:text-slate-200">
                        {explainResult.fest_week_decision?.rejection_reason || explainResult.booking?.decision_reason || 'Feasibility evaluated against campus timetable'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        HARD
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border text-xs">
                      <span className="text-slate-800 dark:text-slate-200">
                        Role Priority Order: {explainResult.priority_order ? explainResult.priority_order.join(' > ') : 'exam > regular_session > institute_event > guest_lecture > department_event > club_event'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        HARD
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}