import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import connectToDatabase from '../../../../lib/mongodb';
import { Schedule, Session, Course, Faculty, Room, StudentGroup } from '../../../../models';

// Normalize cohort IDs across conventions (e.g. Y3-ME, Y3ME, ME-3, ME3 -> ME-3)
function normalizeGroupId(id) {
  if (!id) return '';
  const s = String(id).trim().toUpperCase();
  // Map Y2-CSE -> CSE-2, Y3-ME -> ME-3, Y2ME -> ME-2, etc.
  const yMatch = s.match(/^Y([23])-?([A-Z]+)$/);
  if (yMatch) {
    return `${yMatch[2]}-${yMatch[1]}`;
  }
  // Map Y1-A, Y1A -> Y1-A
  const y1Match = s.match(/^Y1-?([A-D])$/);
  if (y1Match) {
    return `Y1-${y1Match[1]}`;
  }
  // Map ME3 -> ME-3, CSE2 -> CSE-2
  const deptMatch = s.match(/^([A-Z]+)-?([23])$/);
  if (deptMatch) {
    return `${deptMatch[1]}-${deptMatch[2]}`;
  }
  return s;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterGroup = searchParams.get('group');
    const filterFaculty = searchParams.get('faculty');
    const filterRoom = searchParams.get('room');

    // 1. Fetch current schedule (Ground truth benchmark exports/schedule.json, with DB fallback)
    let schedule = null;
    const schedulePath = path.resolve(process.cwd(), '../exports/schedule.json');
    const altSchedulePath = path.resolve(process.cwd(), 'exports/schedule.json');
    const finalPath = fs.existsSync(schedulePath) ? schedulePath : fs.existsSync(altSchedulePath) ? altSchedulePath : null;
    if (finalPath) {
      try {
        schedule = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
      } catch (e) {
        console.error('Error reading exports/schedule.json:', e);
      }
    }
    if (!schedule) {
      try {
        await connectToDatabase();
        schedule = await Schedule.findOne({ _id: 'SCHEDULE_CURRENT' }).lean();
      } catch (e) {
        console.error('Error querying SCHEDULE_CURRENT:', e);
      }
    }

    if (!schedule || !schedule.sessions) {
      return NextResponse.json({ error: 'No schedule available' }, { status: 404 });
    }

    // 2. Fetch metadata from DB or authoritative dataset fallback
    let sessions = [];
    let courses = [];
    let faculty = [];
    let rooms = [];
    let groups = [];

    try {
      await connectToDatabase();
      [sessions, courses, faculty, rooms, groups] = await Promise.all([
        Session.find().lean(),
        Course.find().lean(),
        Faculty.find().lean(),
        Room.find().lean(),
        StudentGroup.find().lean(),
      ]);
    } catch (dbErr) {
      console.warn('MongoDB query warning in schedule views, using file fallback:', dbErr.message);
    }

    // Fallback to cit_public.json if any collection is empty
    if (!sessions.length || !courses.length || !faculty.length || !rooms.length || !groups.length) {
      const citPaths = [
        path.resolve(process.cwd(), '../CrunchWeek_StarterPack/data/cit_public.json'),
        path.resolve(process.cwd(), 'CrunchWeek_StarterPack/data/cit_public.json'),
      ];
      const citPath = citPaths.find((p) => fs.existsSync(p));
      if (citPath) {
        try {
          const citData = JSON.parse(fs.readFileSync(citPath, 'utf8'));
          if (!sessions.length) sessions = (citData.sessions || []).map((s) => ({ _id: s.id, ...s }));
          if (!courses.length) courses = (citData.courses || []).map((c) => ({ _id: c.id, ...c }));
          if (!faculty.length) faculty = (citData.faculty || []).map((f) => ({ _id: f.id, ...f }));
          if (!rooms.length) rooms = (citData.rooms || []).map((r) => ({ _id: r.id, ...r }));
          if (!groups.length) groups = (citData.student_groups || []).map((g) => ({ _id: g.id, ...g }));
        } catch (citErr) {
          console.error('Failed reading cit_public.json fallback:', citErr);
        }
      }
    }

    const sessionMap = new Map(sessions.map((s) => [s._id || s.id, s]));
    const courseMap = new Map(courses.map((c) => [c._id || c.id, c]));
    const facultyMap = new Map(faculty.map((f) => [f._id || f.id, f]));
    const roomMap = new Map(rooms.map((r) => [r._id || r.id, r]));

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
      const targetGroup = normalizeGroupId(filterGroup);
      filtered = filtered.filter((s) => {
        const sessionGroups = (s.groups || []).map(normalizeGroupId);
        return sessionGroups.includes(targetGroup) || (s.groups || []).includes(filterGroup);
      });
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
      const rid = r._id || r.id;
      roomUsageCounts[rid] = 0;
    }

    for (const s of enrichedSessions) {
      if (roomUsageCounts[s.room_id] !== undefined) {
        roomUsageCounts[s.room_id] += s.duration;
      }
    }

    const roomUtilisation = rooms.map((r) => {
      const rid = r._id || r.id;
      const hoursUsed = roomUsageCounts[rid] || 0;
      const totalPeriods = 45; // 5 days * 9 periods
      const pct = Math.round((hoursUsed / totalPeriods) * 100);
      return {
        room_id: rid,
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
      student_groups: groups.map((g) => ({
        id: g._id || g.id,
        name: g.name,
        year: g.year,
        department: g.department,
        size: g.size,
      })),
      faculty_list: faculty.map((f) => ({
        id: f._id || f.id,
        name: f.name,
        department: f.department,
      })),
      rooms_list: rooms.map((r) => ({
        id: r._id || r.id,
        name: r.name,
        type: r.type,
        capacity: r.capacity,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
