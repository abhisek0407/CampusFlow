import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import connectToDatabase from '../../../../lib/mongodb';
import { Schedule, Session, Course, Faculty, Room, StudentGroup } from '../../../../models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterGroup = searchParams.get('group');
    const filterFaculty = searchParams.get('faculty');
    const filterRoom = searchParams.get('room');

    await connectToDatabase();

    // 1. Fetch current schedule
    let schedule = await Schedule.findOne({ _id: 'SCHEDULE_CURRENT' }).lean();
    if (!schedule) {
      const schedulePath = path.resolve(process.cwd(), '../exports/schedule.json');
      const altSchedulePath = path.resolve(process.cwd(), 'exports/schedule.json');
      const finalPath = fs.existsSync(schedulePath) ? schedulePath : fs.existsSync(altSchedulePath) ? altSchedulePath : null;
      if (finalPath) {
        schedule = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
      }
    }

    if (!schedule || !schedule.sessions) {
      return NextResponse.json({ error: 'No schedule available' }, { status: 404 });
    }

    // 2. Fetch metadata from DB or starter pack
    const [sessions, courses, faculty, rooms, groups] = await Promise.all([
      Session.find().lean(),
      Course.find().lean(),
      Faculty.find().lean(),
      Room.find().lean(),
      StudentGroup.find().lean(),
    ]);

    const sessionMap = new Map(sessions.map((s) => [s._id, s]));
    const courseMap = new Map(courses.map((c) => [c._id, c]));
    const facultyMap = new Map(faculty.map((f) => [f._id, f]));
    const roomMap = new Map(rooms.map((r) => [r._id, r]));

    // 3. Build enriched timetable entries
    const enrichedSessions = schedule.sessions.map((item) => {
      const meta = sessionMap.get(item.session_id) || {};
      const course = courseMap.get(meta.course_id) || {};
      const fac = facultyMap.get(meta.faculty_id) || {};
      const room = roomMap.get(item.room_id) || {};

      return {
        session_id: item.session_id,
        day: item.day,
        start_period: item.start_period,
        end_period: item.start_period + (meta.duration || 1) - 1,
        duration: meta.duration || 1,
        room_id: item.room_id,
        room_name: room.name || item.room_id,
        room_type: room.type,
        course_id: meta.course_id,
        course_title: course.title || meta.course_id,
        kind: meta.kind,
        faculty_id: meta.faculty_id,
        faculty_name: fac.name || meta.faculty_id,
        faculty_department: fac.department,
        groups: meta.groups || [],
        size: meta.size,
        basket_slot: meta.basket_slot,
      };
    });

    // 4. Filter by query
    let filtered = enrichedSessions;
    if (filterGroup) {
      filtered = filtered.filter((s) => s.groups.includes(filterGroup));
    }
    if (filterFaculty) {
      filtered = filtered.filter((s) => s.faculty_id === filterFaculty);
    }
    if (filterRoom) {
      filtered = filtered.filter((s) => s.room_id === filterRoom);
    }

    // 5. Calculate Room Utilisation across 45 teaching periods (5 days * 9 periods)
    const roomUsageCounts = {};
    for (const r of rooms) {
      roomUsageCounts[r._id] = 0;
    }

    for (const s of enrichedSessions) {
      if (roomUsageCounts[s.room_id] !== undefined) {
        roomUsageCounts[s.room_id] += s.duration;
      }
    }

    const roomUtilisation = rooms.map((r) => {
      const hoursUsed = roomUsageCounts[r._id] || 0;
      const totalPeriods = 45; // 5 days * 9 periods
      const pct = Math.round((hoursUsed / totalPeriods) * 100);
      return {
        room_id: r._id,
        name: r.name,
        type: r.type,
        capacity: r.capacity,
        hours_used: hoursUsed,
        total_hours: totalPeriods,
        utilization_percentage: pct,
      };
    });

    // 6. Build Grid (days x periods)
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    const grid = {};
    for (const d of days) {
      grid[d] = {};
      for (let p = 1; p <= 9; p++) {
        grid[d][p] = [];
      }
    }

    for (const s of filtered) {
      if (grid[s.day]) {
        for (let p = s.start_period; p <= s.end_period; p++) {
          if (grid[s.day][p]) {
            grid[s.day][p].push(s);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      total_sessions: filtered.length,
      filter: {
        group: filterGroup,
        faculty: filterFaculty,
        room: filterRoom,
      },
      grid,
      sessions: filtered,
      room_utilisation: roomUtilisation,
      student_groups: groups.map((g) => ({ id: g._id, name: g.name, year: g.year, department: g.department })),
      faculty_list: faculty.map((f) => ({ id: f._id, name: f.name, department: f.department })),
      rooms_list: rooms.map((r) => ({ id: r._id, name: r.name, type: r.type, capacity: r.capacity })),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
