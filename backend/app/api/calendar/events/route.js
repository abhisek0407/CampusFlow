import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { Disruption, Schedule, Session, Course, Faculty } from '../../../../models';
import { requireAuth } from '../../../../lib/auth';
import { isIsoDate, eachDate, weekdayOf, periodsToTimes } from '../../../../lib/dateUtils';

const periodLabel = (periods) => {
    const a = Math.min(...periods), b = Math.max(...periods);
    return a === b ? `P${a}` : `P${a}–P${b}`;
};

/**
 * GET /api/calendar/events?from=YYYY-MM-DD&to=YYYY-MM-DD   (max 93 days)
 * - faculty: own classes (weekly timetable projected onto dates) + own leave requests (all statuses)
 * - admin / department_coordinator: every submitted faculty leave request (drafts excluded)
 * - club: empty list
 */
export async function GET(request) {
    try {
        const authResult = await requireAuth(request);
        if (authResult instanceof Response) return authResult;
        const { user } = authResult;

        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        if (!isIsoDate(from) || !isIsoDate(to) || to < from) {
            return NextResponse.json({ success: false, error: 'from and to (YYYY-MM-DD) are required' }, { status: 400 });
        }
        const dates = eachDate(from, to, 93);
        if (dates.length > 93) {
            return NextResponse.json({ success: false, error: 'Range too large (max 93 days)' }, { status: 400 });
        }
        const dateSet = new Set(dates);

        if (user.role === 'club') {
            return NextResponse.json({ success: true, events: [] });
        }

        await connectToDatabase();
        const events = [];
        const statusLabel = (s) => (s === 'draft' ? 'draft' : s === 'analyzed' || s === 'pending' ? 'pending' : s);

        // ---- leave requests
        const filter = user.role === 'faculty'
            ? { requested_by: { $in: [user.id, user.name] } }
            : { status: { $ne: 'draft' } };
        const disruptions = await Disruption.find(filter).lean();

        for (const d of disruptions) {
            for (const ch of d.changes || []) {
                if (ch.type !== 'faculty_unavailable') continue;
                const periods = (ch.periods || []).map(Number).filter(Boolean);
                if (!periods.length) continue;
                const t = periodsToTimes(Math.min(...periods), Math.max(...periods));
                const days = ch.days || [];

                let targetDates = [];
                let recurring = false;
                if (ch.date_from) {
                    targetDates = eachDate(ch.date_from, ch.date_to || ch.date_from, 100).filter((x) => dateSet.has(x) && days.includes(weekdayOf(x)));
                } else if (d.status === 'approved') {
                    recurring = true; // approved weekly-recurring leave
                    targetDates = dates.filter((x) => days.includes(weekdayOf(x)));
                }
                for (const date of targetDates) {
                    const heading = [
                        `${ch.faculty_id} unavailable`,
                        `${periodLabel(periods)} ${t.start}–${t.end}`,
                        statusLabel(d.status).toUpperCase() + (recurring ? ' (weekly)' : ''),
                        ch.reason || d.title,
                    ].filter(Boolean).join(' | ');
                    events.push({
                        id: `${d._id}-${ch.faculty_id}-${date}`,
                        kind: 'leave',
                        date,
                        start: t.start,
                        end: t.end,
                        title: `${ch.faculty_id} unavailable`,
                        heading,
                        subtitle: ch.reason || d.title,
                        faculty_id: ch.faculty_id,
                        period_label: periodLabel(periods),
                        periods,
                        status: statusLabel(d.status),
                        request_id: d._id,
                        recurring,
                    });
                }
            }
        }

        // ---- faculty's own classes projected on the calendar
        if (user.role === 'faculty' && user.linked_faculty_id) {
            const [sessions, schedule, courses, fac] = await Promise.all([
                Session.find({ faculty_id: user.linked_faculty_id }).lean(),
                Schedule.findOne({ _id: 'SCHEDULE_CURRENT' }).lean(),
                Course.find().lean(),
                Faculty.findOne({ _id: user.linked_faculty_id }).lean(),
            ]);
            const meta = new Map(sessions.map((s) => [s._id, s]));
            const courseMap = new Map(courses.map((c) => [c._id, c]));
            const KIND = { lecture: 'Lecture', tutorial: 'Tutorial', lab: 'Lab' };

            for (const a of schedule?.sessions || []) {
                const sid = a.session_id || a.id;
                const s = meta.get(sid);
                if (!s) continue;
                const dur = s.duration || 1;
                const periods = Array.from({ length: dur }, (_, i) => a.start_period + i);
                const t = periodsToTimes(a.start_period, a.start_period + dur - 1);
                const courseTitle = courseMap.get(s.course_id)?.title || s.course_id;
                const kindLabel = KIND[String(s.kind || '').toLowerCase()] || s.kind || 'Class';
                const groups = (s.groups || []).join(', ');

                for (const date of dates) {
                    if (weekdayOf(date) !== a.day) continue;
                    const heading = [
                        `${s.course_id} ${courseTitle} (${kindLabel})`,
                        `Room ${a.room_id}`,
                        `${periodLabel(periods)} ${t.start}–${t.end}`,
                        groups && `Cohort ${groups}`,
                        fac?.name,
                    ].filter(Boolean).join(' | ');
                    events.push({
                        id: `${sid}-${date}`,
                        kind: 'class',
                        date,
                        start: t.start,
                        end: t.end,
                        title: `${s.course_id} ${s.kind || ''}`.trim(),
                        heading,
                        subtitle: `${courseTitle} · ${kindLabel} · Session ${sid}`,
                        course_id: s.course_id,
                        course_title: courseTitle,
                        class_kind: kindLabel,
                        session_id: sid,
                        room: a.room_id,
                        groups: s.groups || [],
                        faculty_id: s.faculty_id,
                        faculty_name: fac?.name,
                        period_label: periodLabel(periods),
                        periods,
                        status: 'scheduled',
                    });
                }
            }
        }

        events.sort((x, y) => (x.date + x.start).localeCompare(y.date + y.start));
        return NextResponse.json({ success: true, count: events.length, events });
    } catch (error) {
        console.error('Calendar events error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
