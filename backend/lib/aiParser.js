/**
 * CampusFlow AI Natural Language Parser
 * Extracts structured booking parameters from Plain English and Hinglish messages.
 * Maps time expressions, rooms, attendance, facilities, and performs strict validation.
 */

const DAY_MAP = {
  monday: 'MON',
  mon: 'MON',
  somwar: 'MON',
  somvaar: 'MON',
  tuesday: 'TUE',
  tue: 'TUE',
  mangal: 'TUE',
  mangalwar: 'TUE',
  mangalvaar: 'TUE',
  wednesday: 'WED',
  wed: 'WED',
  budh: 'WED',
  budhwar: 'WED',
  budhvaar: 'WED',
  thursday: 'THU',
  thu: 'THU',
  guru: 'THU',
  guruwar: 'THU',
  guruvaar: 'THU',
  brihaspativar: 'THU',
  friday: 'FRI',
  fri: 'FRI',
  shukra: 'FRI',
  shukrawar: 'FRI',
  shukravaar: 'FRI',
  saturday: 'SAT',
  sat: 'SAT',
  shanivar: 'SAT',
};

// Period clock mapping:
// P1: 8-9, P2: 9-10, P3: 10-11, P4: 11-12, P5: 12-13, Lunch: 13-14, P6: 14-15, P7: 15-16, P8: 16-17, P9: 17-18, P10: 18-19, P11: 19-20, P12: 20-21, P13: 21-22
function timeToPeriod(hour, isPM = false) {
  let h = parseInt(hour, 10);
  if (isPM && h < 12) h += 12;
  if (!isPM && h === 12) h = 0; // midnight

  if (h >= 8 && h < 9) return 1;
  if (h >= 9 && h < 10) return 2;
  if (h >= 10 && h < 11) return 3;
  if (h >= 11 && h < 12) return 4;
  if (h >= 12 && h < 13) return 5;
  if (h >= 14 && h < 15) return 6;
  if (h >= 15 && h < 16) return 7;
  if (h >= 16 && h < 17) return 8;
  if (h >= 17 && h < 18) return 9;
  if (h >= 18 && h < 19) return 10;
  if (h >= 19 && h < 20) return 11;
  if (h >= 20 && h < 21) return 12;
  if (h >= 21 && h < 22) return 13;
  return null;
}

export function parseNaturalLanguageBooking(text, userContext = {}) {
  const lower = text.toLowerCase();

  // 1. Detect Day
  let detectedDay = 'MON';
  for (const [key, val] of Object.entries(DAY_MAP)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(lower)) {
      detectedDay = val;
      break;
    }
  }

  // 2. Detect Attendance / Capacity
  let attendance = 100;
  const numMatches = lower.match(/(?:around|approx|about|capacity|seating|attendees|students|people|log)?\s*(\d{2,4})\s*(?:people|students|attendees|log|capacity|seats)?/i);
  if (numMatches && numMatches[1]) {
    attendance = parseInt(numMatches[1], 10);
  }

  // 3. Detect Timing / Periods
  let fromPeriod = 10;
  let toPeriod = 12;

  // Patterns like "11 am to 1 pm", "11:00 to 13:00", "6 to 9 pm", "18:00 to 21:00", "shaam 6 se 9"
  const rangeMatch = lower.match(/(\d{1,2})(?::\d{2})?\s*(am|pm)?\s*(?:to|se|-|until|till)\s*(\d{1,2})(?::\d{2})?\s*(am|pm)?/i);
  if (rangeMatch) {
    let startH = parseInt(rangeMatch[1], 10);
    let startMeridiem = rangeMatch[2];
    let endH = parseInt(rangeMatch[3], 10);
    let endMeridiem = rangeMatch[4];

    if (!endMeridiem && (endH <= 6 || endH >= 12)) endMeridiem = 'pm';
    if (!startMeridiem) {
      if (startH >= 1 && startH <= 7) startMeridiem = 'pm';
      else if (startH >= 8 && startH <= 11) startMeridiem = 'am';
      else startMeridiem = endMeridiem || 'pm';
    }

    const pStart = timeToPeriod(startH, startMeridiem === 'pm');
    const pEnd = timeToPeriod(endH - 1, endMeridiem === 'pm'); // period covering up to end hour

    if (pStart && pEnd && pEnd >= pStart) {
      fromPeriod = pStart;
      toPeriod = pEnd;
    }
  } else {
    // Explicit period matches like "P4 to P5" or "P10-P12"
    const pMatch = lower.match(/p(\d{1,2})\s*(?:to|-)\s*p(\d{1,2})/i);
    if (pMatch) {
      fromPeriod = parseInt(pMatch[1], 10);
      toPeriod = parseInt(pMatch[2], 10);
    }
  }

  const durationPeriods = Math.max(1, toPeriod - fromPeriod + 1);

  // 4. Detect Room Types & Requested Room
  const roomTypes = [];
  let requestedRoom = null;

  if (lower.includes('audi') || lower.includes('auditorium')) {
    roomTypes.push('auditorium');
    requestedRoom = 'AUD';
  }
  if (lower.includes('seminar hall') || lower.includes('seminar')) {
    roomTypes.push('seminar_hall');
    if (lower.includes('sh-1') || lower.includes('sh1')) requestedRoom = 'SH-1';
    else if (lower.includes('sh-2') || lower.includes('sh2')) requestedRoom = 'SH-2';
    else requestedRoom = 'SH-1';
  }
  if (lower.includes('oat') || lower.includes('open air') || lower.includes('outdoor')) {
    roomTypes.push('outdoor');
    requestedRoom = 'OAT';
  }
  if (lower.includes('lab') || lower.includes('computer lab') || lower.includes('cs lab')) {
    roomTypes.push('lab_cs');
    requestedRoom = 'CS-LAB-1';
  }
  if (lower.includes('classroom') || lower.includes('cr-') || lower.includes('lecture hall') || lower.includes('lh-')) {
    roomTypes.push('lecture_hall', 'classroom');
  }

  if (roomTypes.length === 0) {
    if (attendance > 300) roomTypes.push('auditorium');
    else if (attendance > 100) roomTypes.push('seminar_hall', 'lecture_hall');
    else roomTypes.push('classroom', 'seminar_hall');
  }

  // 5. Detect Needs / Features
  const needs = [];
  if (lower.includes('stage') || lower.includes('manch')) needs.push('stage');
  if (lower.includes('pa system') || lower.includes('sound') || lower.includes('speaker') || lower.includes('mic') || lower.includes('audio')) needs.push('pa_system');
  if (lower.includes('projector') || lower.includes('screen') || lower.includes('display')) needs.push('projector');
  if (lower.includes('ac') || lower.includes('air conditioning')) needs.push('ac');
  if (lower.includes('accessible') || lower.includes('wheelchair') || lower.includes('ramp')) needs.push('accessible');

  // 6. Role & Category Cap
  const role = userContext.role || 'club';
  const roleCategoryCap = {
    admin: 'institute_event',
    faculty: 'guest_lecture',
    department_coordinator: 'department_event',
    club: 'club_event',
  };

  let requestedCategory = roleCategoryCap[role] || 'club_event';
  if (lower.includes('inauguration') || lower.includes('valedictory') || lower.includes('institute event')) {
    requestedCategory = 'institute_event';
  } else if (lower.includes('guest lecture') || lower.includes('keynote') || lower.includes('talk')) {
    requestedCategory = 'guest_lecture';
  } else if (lower.includes('department') || lower.includes('dept')) {
    requestedCategory = 'department_event';
  }

  // Title derivation
  let title = 'Campus Event Booking';
  if (lower.includes('inauguration')) title = "Spectra '27 Inauguration";
  else if (lower.includes('play') || lower.includes('drama') || lower.includes('natak')) title = 'Cultural Stage Play';
  else if (lower.includes('hackathon') || lower.includes('coding')) title = 'Spectra Hackathon';
  else if (lower.includes('dance') || lower.includes('music') || lower.includes('concert')) title = 'Cultural Evening';
  else if (lower.includes('workshop')) title = 'Technical Workshop';
  else if (lower.includes('robotics')) title = 'Robotics Challenge';
  else {
    const firstWords = text.trim().split(/\s+/).slice(0, 5).join(' ');
    title = firstWords.length > 3 ? firstWords : 'Campus Event Booking';
  }

  return {
    title,
    requester: userContext.name || 'Student Representative',
    role,
    requested_category: requestedCategory,
    attendance,
    duration_periods: durationPeriods,
    windows: [
      {
        day: detectedDay,
        from_period: fromPeriod,
        to_period: toPeriod,
      },
    ],
    room_types: roomTypes,
    needs,
    requested_room: requestedRoom,
    mandatory_for_groups: [],
    raw_text: text,
  };
}

export function explainDecision({ decision, bookingRequest, dataset, schedule }) {
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
