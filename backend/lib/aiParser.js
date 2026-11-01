/**
 * CampusFlow AI Natural Language Parser (rule-based, no LLM needed)
 * - parseNaturalLanguageBooking: event/venue booking text -> structured draft
 * - parseFacultyRequest:        faculty leave/unavailability text -> faculty_unavailable change
 * - explainDecision:            human readable decision explanation
 *
 * FIXES vs old version:
 *  - attendance no longer picks up clock times ("18:00" used to become 18 people)
 *  - "6 baje se 9 baje", "shaam", "subah" Hinglish time ranges understood
 *  - word-boundary matching ("ac" no longer matches "accessible", "mic" no longer matches "academic")
 *  - room type for open-air theatre is 'outdoor' (matches Room model enum)
 *  - NEW parseFacultyRequest() used by /api/ai/faculty-assistant fallback
 */

const DAY_MAP = {
  monday: 'MON', mon: 'MON', somwar: 'MON', somvaar: 'MON',
  tuesday: 'TUE', tue: 'TUE', tues: 'TUE', mangal: 'TUE', mangalwar: 'TUE', mangalvaar: 'TUE',
  wednesday: 'WED', wed: 'WED', budh: 'WED', budhwar: 'WED', budhvaar: 'WED',
  thursday: 'THU', thu: 'THU', thur: 'THU', thurs: 'THU', guru: 'THU', guruwar: 'THU', guruvaar: 'THU', brihaspativar: 'THU',
  friday: 'FRI', fri: 'FRI', shukra: 'FRI', shukrawar: 'FRI', shukravaar: 'FRI',
  saturday: 'SAT', sat: 'SAT', shanivar: 'SAT',
};

const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const JS_DAY_TO_CODE = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// P1: 8-9, P2: 9-10, P3: 10-11, P4: 11-12, P5: 12-13, Lunch 13-14, P6: 14-15 ... P13: 21-22
function timeToPeriod(hour24) {
  const h = hour24;
  if (h >= 8 && h < 13) return h - 7; // 8->1 ... 12->5
  if (h >= 14 && h < 22) return h - 8; // 14->6 ... 21->13
  return null;
}

function to24(hour, meridiem) {
  let h = parseInt(hour, 10);
  if (meridiem === 'pm' && h < 12) h += 12;
  if (meridiem === 'am' && h === 12) h = 0;
  return h;
}

function kolkataNow() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(new Date());
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[parts] ?? new Date().getDay();
}

function isoKolkata(offsetDays = 0) {
  const base = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()) + 'T00:00:00Z');
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}

/** relative words -> ISO dates (Asia/Kolkata). Past tense "kal" only when clearly past. */
function detectRelativeDates(lower) {
  const out = [];
  if (/\b(today|aaj)\b/.test(lower)) out.push(isoKolkata(0));
  if (/\b(yesterday|beeta hua kal)\b/.test(lower) || /\bkal\b.*\b(tha|thi|the|aaya|aayi|gaya|nahi aaya|absent)\b/.test(lower)) out.push(isoKolkata(-1));
  else if (/\b(tomorrow|kal|kl)\b/.test(lower)) out.push(isoKolkata(1));
  if (/\bparso\b/.test(lower)) out.push(isoKolkata(/\b(tha|thi|the|aaya|gaya|absent)\b/.test(lower) ? -2 : 2));
  return [...new Set(out)].sort();
}

function detectDays(lower) {
  const found = [];
  for (const [key, val] of Object.entries(DAY_MAP)) {
    if (new RegExp(`\\b${key}\\b`, 'i').test(lower) && !found.includes(val)) found.push(val);
  }
  // relative days
  const today = kolkataNow();
  const rel = (offset) => {
    let d = (((today + offset) % 7) + 7) % 7;
    return JS_DAY_TO_CODE[d];
  };
  if (/\b(tomorrow|kal|kl)\b/.test(lower)) found.push(rel(1));
  if (/\b(today|aaj)\b/.test(lower)) found.push(rel(0));
  if (/\b(yesterday|beeta hua kal)\b/.test(lower)) found.push(rel(-1));
  return found.filter((d) => DAY_ORDER.includes(d)).sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b)).filter((d, i, a) => a.indexOf(d) === i);
}

/** Parse "6pm se 8pm", "18:00 to 20:00", "11 am to 1 pm", "6 baje se 9 baje", "P4 to P5". Returns {from,to} or null */
function detectPeriodRange(lowerRaw) {
  const lower = lowerRaw.replace(/\bbaje\b/g, ' ').replace(/\btak\b/g, ' ').replace(/\bko\b/g, ' ');

  const pMatch = lower.match(/\bp(\d{1,2})\s*(?:to|-|se|till|until)\s*p(\d{1,2})\b/i);
  if (pMatch) {
    const a = parseInt(pMatch[1], 10);
    const b = parseInt(pMatch[2], 10);
    if (a >= 1 && b >= a && b <= 13) return { from: a, to: b };
  }

  const rangeMatch = lower.match(/(\d{1,2})(?::\d{2})?\s*(am|pm)?\s*(?:to|se|-|until|till)\s*(\d{1,2})(?::\d{2})?\s*(am|pm)?/i);
  if (!rangeMatch) return null;

  const startH = parseInt(rangeMatch[1], 10);
  let startM = rangeMatch[2];
  const endH = parseInt(rangeMatch[3], 10);
  let endM = rangeMatch[4];

  const eveningWord = /\b(shaam|sham|evening|raat|night)\b/.test(lower);
  const morningWord = /\b(subah|subha|morning)\b/.test(lower);
  const afternoonWord = /\b(dopahar|afternoon)\b/.test(lower);

  let start24;
  let end24;
  if (startH >= 13 || endH >= 13) {
    // already 24h
    start24 = startH;
    end24 = endH;
  } else {
    if (!startM) {
      if (eveningWord || afternoonWord) startM = 'pm';
      else if (morningWord) startM = 'am';
      else if (endM) startM = endM === 'pm' && startH <= endH && startH !== 12 && endH !== 12 ? 'pm' : (startH >= 8 && startH <= 11 ? 'am' : 'pm');
      else startM = startH >= 8 && startH <= 11 ? 'am' : 'pm';
    }
    if (!endM) {
      if (eveningWord || afternoonWord) endM = 'pm';
      else if (morningWord) endM = 'am';
      else endM = endH <= 7 || endH === 12 ? 'pm' : startM;
    }
    start24 = to24(startH, startM);
    end24 = to24(endH, endM);
  }

  const from = timeToPeriod(start24);
  const to = timeToPeriod(end24 - 1);
  if (from && to && to >= from) return { from, to };
  return null;
}

function detectAttendance(lowerRaw) {
  // remove everything that can be confused with a head-count
  let t = lowerRaw
    .replace(/\b\d{1,2}:\d{2}\b/g, ' ')
    .replace(/\b\d{1,2}\s*(am|pm)\b/g, ' ')
    .replace(/\bp\d{1,2}\b/g, ' ')
    .replace(/\b(cr|sh|lh|lab|cs-lab|room)[-\s]?\d+\b/g, ' ')
    .replace(/\b\d{1,2}\s*(baje|bje)\b/g, ' ');

  let m = t.match(/(\d{2,4})\s*\+?\s*(?:people|students|attendees|log|persons|seats|participants|pax|audience|members|guests|bachhe|bacche)/);
  if (m) return parseInt(m[1], 10);
  m = t.match(/(?:for|around|approx(?:imately)?|about|capacity(?: of)?|seating|expected|nearly|almost)\s*(\d{2,4})\b/);
  if (m) return parseInt(m[1], 10);
  m = t.match(/\b(\d{2,4})\b/);
  if (m) return parseInt(m[1], 10);
  return null;
}

export function parseNaturalLanguageBooking(text, userContext = {}) {
  const lower = String(text || '').toLowerCase();

  // 1. Day
  const days = detectDays(lower);
  const detectedDay = days[0] || 'MON';

  // 2. Attendance
  const detectedAttendance = detectAttendance(lower);
  const attendance = detectedAttendance || 100;

  // 3. Periods
  let fromPeriod = 10;
  let toPeriod = 12;
  const range = detectPeriodRange(lower);
  if (range) {
    fromPeriod = range.from;
    toPeriod = range.to;
  } else if (/\b(shaam|sham|evening)\b/.test(lower)) {
    fromPeriod = 10;
    toPeriod = 11;
  } else if (/\b(subah|morning)\b/.test(lower)) {
    fromPeriod = 2;
    toPeriod = 3;
  }
  const durationPeriods = Math.max(1, toPeriod - fromPeriod + 1);

  // 4. Room types / requested room
  const roomTypes = [];
  let requestedRoom = null;
  const has = (re) => re.test(lower);

  if (has(/\b(audi|auditorium)\b/)) {
    roomTypes.push('auditorium');
    requestedRoom = 'AUD';
  }
  if (has(/\bseminar\b/)) {
    roomTypes.push('seminar_hall');
    if (has(/\bsh-?2\b/)) requestedRoom = 'SH-2';
    else requestedRoom = 'SH-1';
  }
  if (has(/\b(oat|open air|open-air|outdoor|amphitheatre|amphitheater)\b/)) {
    roomTypes.push('outdoor');
    requestedRoom = 'OAT';
  }
  if (has(/\b(lab|computer lab|computing lab|cs lab)\b/)) {
    roomTypes.push('lab_cs');
    requestedRoom = 'CS-LAB-1';
  }
  if (has(/\b(classroom|cr-\d+|lecture hall|lh-\d+)\b/)) {
    roomTypes.push('lecture_hall', 'classroom');
  }
  if (roomTypes.length === 0) {
    if (attendance > 300) roomTypes.push('auditorium');
    else if (attendance > 100) roomTypes.push('seminar_hall', 'lecture_hall');
    else roomTypes.push('classroom', 'seminar_hall');
  }

  // 5. Needs (word-boundary safe)
  const needs = [];
  if (has(/\b(stage|manch)\b/)) needs.push('stage');
  if (has(/\b(pa system|pa|sound|speakers?|mics?|microphones?|audio)\b/)) needs.push('pa_system');
  if (has(/\b(projector|screen|display)\b/)) needs.push('projector');
  if (has(/\b(ac|a\/c|air conditioning|air conditioned)\b/)) needs.push('ac');
  if (has(/\b(accessible|accessibility|wheelchair|ramp)\b/)) needs.push('accessible');

  // 6. Role & category
  const role = userContext.role || 'club';
  const roleCategoryCap = {
    admin: 'institute_event',
    faculty: 'guest_lecture',
    department_coordinator: 'department_event',
    club: 'club_event',
  };
  let requestedCategory = roleCategoryCap[role] || 'club_event';
  if (has(/\b(inauguration|valedictory|institute event)\b/)) requestedCategory = 'institute_event';
  else if (has(/\b(guest lecture|keynote|talk)\b/)) requestedCategory = 'guest_lecture';
  else if (has(/\b(department|dept)\b/)) requestedCategory = 'department_event';

  // 7. Title
  let title;
  if (has(/inauguration/)) title = "Spectra '27 Inauguration";
  else if (has(/\b(play|drama|natak)\b/)) title = 'Cultural Stage Play';
  else if (has(/\b(hackathon|coding)\b/)) title = 'Spectra Hackathon';
  else if (has(/\b(dance|music|concert)\b/)) title = 'Cultural Evening';
  else if (has(/\bworkshop\b/)) title = 'Technical Workshop';
  else if (has(/\brobotics\b/)) title = 'Robotics Challenge';
  else if (has(/\bkeynote\b/)) title = 'Industry Keynote';
  else {
    const firstWords = String(text || '').trim().split(/\s+/).slice(0, 5).join(' ');
    title = firstWords.length > 3 ? firstWords : 'Campus Event Booking';
  }

  const assumptions = [];
  if (!detectedAttendance) assumptions.push('Attendance not found - assumed 100');
  if (!days.length) assumptions.push('Day not found - assumed Monday');
  if (!range) assumptions.push(`Time not found - assumed P${fromPeriod}-P${toPeriod}`);

  return {
    title,
    requester: userContext.requester || userContext.name || 'Student Representative',
    role,
    requested_category: requestedCategory,
    attendance,
    duration_periods: durationPeriods,
    windows: [{ day: detectedDay, from_period: fromPeriod, to_period: toPeriod }],
    room_types: roomTypes,
    needs,
    requested_room: requestedRoom,
    mandatory_for_groups: [],
    assumptions,
    raw_text: text,
  };
}

/**
 * Faculty natural-language leave / unavailability -> solver change object.
 * Returns { ok, change?, title?, error? }
 */
export function parseFacultyRequest(text, facultyId) {
  const lower = String(text || '').toLowerCase();
  const idMatch = String(text || '').match(/\bF(\d{2,3})\b/i);
  const fid = facultyId || (idMatch ? `F${idMatch[1]}` : null);
  if (!fid) {
    return { ok: false, error: 'Faculty ID is required. Mention it in the message (for example: "F01 cannot teach on Monday afternoon").' };
  }

  const relDates = detectRelativeDates(lower);
  const hasWeekdayWord = Object.keys(DAY_MAP).some((k) => new RegExp(`\\b${k}\\b`, 'i').test(lower));
  const days = detectDays(lower);
  if (!days.length && !relDates.length) {
    return { ok: false, error: 'Please mention which day(s) you are unavailable (for example: "Wednesday morning").' };
  }

  let periods;
  let label;
  const range = detectPeriodRange(lower);
  if (range) {
    periods = [];
    for (let p = range.from; p <= range.to; p++) periods.push(p);
    label = `P${range.from}-P${range.to}`;
  } else if (/\b(full day|whole day|all day|poora din|pura din)\b/.test(lower)) {
    periods = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    label = 'Full Day';
  } else if (/\b(afternoon|dopahar|after lunch)\b/.test(lower)) {
    periods = [6, 7, 8, 9];
    label = 'Afternoon';
  } else if (/\b(morning|subah|subha)\b/.test(lower)) {
    periods = [1, 2, 3, 4, 5];
    label = 'Morning';
  } else {
    periods = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    label = 'Full Day';
  }

  const reason = String(text || '').slice(0, 200) || 'Faculty unavailability request';
  return {
    ok: true,
    change: {
      type: 'faculty_unavailable', faculty_id: fid, days, periods, reason,
      // relative words (today / yesterday / kal) -> exact dates so the leave is NOT recurring
      ...(relDates.length && !hasWeekdayWord ? { date_from: relDates[0], date_to: relDates[relDates.length - 1] } : {}),
    },
    title: `${(days.length ? days : relDates).join('/')} ${label} Unavailability (${fid})`,
  };
}

export function explainDecision({ decision, bookingRequest }) {
  if (!decision) return 'No decision available for this item.';

  if (decision.status === 'approved') {
    return `Your request for "${bookingRequest.title}" was APPROVED in room ${decision.room_id} on ${decision.day} from P${decision.start_period} to P${decision.end_period}. The venue meets all requirements: capacity (${bookingRequest.attendance}), required facilities, and has zero clashes with scheduled classes or higher priority bookings.`;
  }
  if (decision.status === 'alternative_offered') {
    return `The requested window on ${bookingRequest.windows[0]?.day} was unavailable due to priority reservations or scheduled classes. We have offered an alternative conflict-free slot in ${decision.room_id} on ${decision.day} during P${decision.start_period}-P${decision.end_period} (${decision.reason}).`;
  }
  if (decision.status === 'rejected') {
    return `Your request for "${bookingRequest.title}" could not be accommodated. Reason: ${decision.reason}. Under CIT scheduling rules, venues are allocated by priority category (${bookingRequest.requested_category}) and submission timestamp.`;
  }
  return decision.reason || 'Decision pending review.';
}