import { NextResponse } from 'next/server';
import connectToDatabase from '../../../lib/mongodb';
import { Session, Schedule, Course, Room } from '../../../models';
import { requireAuth } from '../../../lib/auth';

export async function GET(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    await connectToDatabase();
    const { searchParams } = new URL(request.url);

    let targetFacultyId = null;
    if (user.role === 'faculty') {
      targetFacultyId = user.linked_faculty_id;
      if (!targetFacultyId) {
        return NextResponse.json({ success: false, error: 'Faculty user has no linked_faculty_id configured' }, { status: 403 });
      }
    } else if (user.role === 'admin' || user.role === 'department_coordinator') {
      targetFacultyId = searchParams.get('faculty_id') || null;
    } else {
      // Club or other roles are not authorized to query faculty session schedules
      return NextResponse.json({ success: false, error: 'Forbidden: Insufficient permissions to view faculty sessions' }, { status: 403 });
    }

    const query = {};
    if (targetFacultyId) {
      query.faculty_id = targetFacultyId;
    }

    const [dbSessions, currentSchedule] = await Promise.all([
      Session.find(query).lean(),
      Schedule.findOne({ _id: 'SCHEDULE_CURRENT' }).lean(),
    ]);

    // Build map of current assignments from SCHEDULE_CURRENT
    const assignMap = new Map();
    if (currentSchedule && currentSchedule.sessions) {
      for (const s of currentSchedule.sessions) {
        const sid = s.session_id || s.id;
        assignMap.set(sid, s);
      }
    }

    const enrichedSessions = dbSessions.map((s) => {
      const assignment = assignMap.get(s._id) || null;
      return {
        session_id: s._id,
        course_id: s.course_id,
        kind: s.kind,
        faculty_id: s.faculty_id,
        groups: s.groups || [],
        size: s.size,
        duration: s.duration,
        room_types: s.room_types || [],
        needs_accessible: s.needs_accessible,
        basket_slot: s.basket_slot,
        fixed_slot: s.fixed_slot,
        assignment: assignment ? {
          day: assignment.day,
          start_period: assignment.start_period,
          end_period: assignment.start_period + (s.duration || 1) - 1,
          room_id: assignment.room_id,
        } : null,
      };
    });

    return NextResponse.json({
      success: true,
      count: enrichedSessions.length,
      faculty_id: targetFacultyId,
      sessions: enrichedSessions,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
