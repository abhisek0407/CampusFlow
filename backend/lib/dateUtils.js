// Small date helpers (all ISO "YYYY-MM-DD" strings, computed in UTC so there are no timezone surprises)
export const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const TEACH_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function todayIsoKolkata() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function isIsoDate(s) {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

export function weekdayOf(iso) {
    return DAY_CODES[new Date(`${iso}T00:00:00Z`).getUTCDay()];
}

export function addDays(iso, n) {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

export function eachDate(from, to, max = 400) {
    const out = [];
    let c = from;
    while (c <= to && out.length < max) {
        out.push(c);
        c = addDays(c, 1);
    }
    return out;
}

export function weekdaysInRange(from, to) {
    const set = new Set(eachDate(from, to, 120).map(weekdayOf));
    return TEACH_DAYS.filter((d) => set.has(d));
}

// P1 = 08:00 ... P5 = 12:00, lunch 13-14, P6 = 14:00 ... P13 = 21:00
export function periodStartHour(p) {
    return p <= 5 ? 7 + p : 8 + p;
}

const pad = (n) => String(n).padStart(2, '0');
export function periodsToTimes(minP, maxP) {
    return { start: `${pad(periodStartHour(minP))}:00`, end: `${pad(periodStartHour(maxP) + 1)}:00` };
}