import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { Disruption, Schedule, Session, Course, Faculty } from '../../../../models';
import { requireAuth } from '../../../../lib/auth';
import { eachDate, addDays, weekdayOf, todayIsoKolkata, periodsToTimes } from '../../../../lib/dateUtils';

/**
 * GET /api/faculty/my-timetable
 * Weekly grid data for the logged-in faculty member, built from the SAME sources as
 * /api/calendar/events (Schedule + Session + Disruption leave requests), so the
 * Timetable and the Calendar always agree.
 *   ?date=YYYY-MM-DD  (optional) any date inside the week you want; defaults to today.
 */
export async function GET(request) {
    try {
        const authResult = await requireAuth(request);
        if (authResult instanceof Response) return authResult;
        const { user } = authResult;

        if (user.role !== 'faculty' || !user.linked_faculty_id) {
            return NextResponse.json({ success: false, error: 'Faculty account required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const anchor = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get('date') || '')
            ? searchParams.get('date')
            : todayIsoKolkata();

        // Monday..Friday of the week containing `anchor`
        const dow = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].indexOf(weekdayOf(anchor));
        const monday = addDays(anchor, -((dow + 6) % 7));
        const friday = addDays(monday, 4);
        const weekDates = eachDate(monday, friday, 5);

        await connectToDatabase();
        const fid = user.linked_faculty_id;

        const [sessions, schedule, courses, faculty] = await Promise.all([
            Session.find({ faculty_id: fid }).lean(),
            Schedule.findOne({ _id: 'SCHEDULE_CURRENT' }).lean(),
            Course.find().lean(),
            Faculty.findOne({ _id: fid }).lean(),
        ]);

        const courseMap = new Map(courses.map((c) => [c._id, c]));
        const sessionMap = new Map(sessions.map((s) => [s._id, s]));

        // ---- classes (weekly recurring)
        const classes = [];
        for (const a of schedule?.sessions || []) {
            const sid = a.session_id || a.id;
            const s = sessionMap.get(sid);
            if (!s) continue;
            const dur = s.duration || 1;
            classes.push({
                session_id: sid,
                course_id: s.course_id,
                course_title: courseMap.get(s.course_id)?.title || s.course_id,
                kind: s.kind,
                day: a.day,
                start_period: a.start_period,
                end_period: a.start_period + dur - 1,
                duration: dur,
                room_id: a.room_id,
                groups: s.groups || [],
            });
        }

        // ---- leave / unavailability (same rules as calendar route)
        const disruptions = await Disruption.find({
            requested_by: { $in: [user.id, user.name] },
        }).lean();

        const leaves = [];
        for (const d of disruptions) {
            for (const ch of d.changes || []) {
                if (ch.type !== 'faculty_unavailable') continue;
                const periods = (ch.periods || []).map(Number).filter(Boolean);
                if (!periods.length) continue;
                const days = ch.days || [];

                let targets = [];
                let recurring = false;
                if (ch.date_from) {
                    targets = eachDate(ch.date_from, ch.date_to || ch.date_from, 100)
                        .filter((x) => weekDates.includes(x) && days.includes(weekdayOf(x)));
                } else if (d.status === 'approved') {
                    recurring = true;
                    targets = weekDates.filter((x) => days.includes(weekdayOf(x)));
                }
                const status = d.status === 'analyzed' ? 'pending' : d.status;
                for (const date of targets) {
                    leaves.push({
                        id: `${d._id}-${date}`,
                        date,
                        day: weekdayOf(date),
                        periods,
                        status,
                        recurring,
                        title: `${ch.faculty_id} unavailable`,
                        reason: ch.reason || d.title,
                        request_id: d._id,
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            faculty: { id: fid, name: faculty?.name || user.name },
            week: { from: monday, to: friday, dates: weekDates },
            periods: Array.from({ length: 9 }, (_, i) => {
                const t = periodsToTimes(i + 1, i + 1);
                return { id: i + 1, label: `P${i + 1}`, time: `${t.start} - ${t.end}` };
            }),
            classes,
            leaves,
        });
    } catch (error) {
        console.error('My timetable error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
