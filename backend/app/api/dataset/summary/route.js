import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import {
  Room,
  Faculty,
  StudentGroup,
  Course,
  Session,
  RoomUnavailability,
  BookingRequest,
  Cancellation,
  Exam,
  InstituteConfig,
  Schedule,
} from '../../../../models';

export async function GET() {
  try {
    await connectToDatabase();

    const [
      roomsCount,
      facultyCount,
      groupsCount,
      coursesCount,
      sessionsCount,
      roomUnavailCount,
      bookingReqsCount,
      cancellationsCount,
      examsCount,
      config,
      latestSchedule,
    ] = await Promise.all([
      Room.countDocuments(),
      Faculty.countDocuments(),
      StudentGroup.countDocuments(),
      Course.countDocuments(),
      Session.countDocuments(),
      RoomUnavailability.countDocuments(),
      BookingRequest.countDocuments(),
      Cancellation.countDocuments(),
      Exam.countDocuments(),
      InstituteConfig.findOne(),
      Schedule.findOne().sort({ createdAt: -1 }),
    ]);

    const rooms = await Room.find().lean();
    const faculty = await Faculty.find().lean();
    const groups = await StudentGroup.find().lean();
    const courses = await Course.find().lean();

    return NextResponse.json({
      success: true,
      counts: {
        rooms: roomsCount,
        faculty: facultyCount,
        student_groups: groupsCount,
        courses: coursesCount,
        sessions: sessionsCount,
        room_unavailability: roomUnavailCount,
        booking_requests: bookingReqsCount,
        cancellations: cancellationsCount,
        exams: examsCount,
      },
      institute_config: config,
      schedule_status: latestSchedule ? latestSchedule.status : 'not_generated',
      rooms,
      faculty,
      student_groups: groups,
      courses,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
