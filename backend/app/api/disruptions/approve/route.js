import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import connectToDatabase from '../../../../lib/mongodb';
import { Disruption, Schedule, ScheduleVersion, AuditLog } from '../../../../models';

export async function POST(request) {
  try {
    await connectToDatabase();
    const { disruption_id, approved_by = 'Dean Academic Office' } = await request.json();

    let disruption = null;
    if (disruption_id) {
      disruption = await Disruption.findById(disruption_id);
    }
    if (!disruption) {
      disruption = await Disruption.findOne({ status: { $in: ['pending', 'analyzed'] } }).sort({ createdAt: -1 });
    }

    if (!disruption) {
      return NextResponse.json({ error: 'No disruption found to approve' }, { status: 404 });
    }

    // Load proposed schedule from exports/schedule_after.json
    const afterSchedulePath = path.resolve(process.cwd(), '../exports/schedule_after.json');
    const altAfterPath = path.resolve(process.cwd(), 'exports/schedule_after.json');
    const finalAfterPath = fs.existsSync(afterSchedulePath) ? afterSchedulePath : fs.existsSync(altAfterPath) ? altAfterPath : null;

    if (!finalAfterPath) {
      return NextResponse.json({ error: 'Rescheduled schedule file not found' }, { status: 404 });
    }

    const proposedSched = JSON.parse(fs.readFileSync(finalAfterPath, 'utf8'));

    // Fetch current schedule
    const currentSched = await Schedule.findOne({ _id: 'SCHEDULE_CURRENT' });
    const currentVersion = currentSched?.version || 1;
    const nextVersion = currentVersion + 1;

    // Create ScheduleVersion history record
    const versionRecord = await ScheduleVersion.create({
      _id: `VERSION-${nextVersion}`,
      schedule_id: 'SCHEDULE_CURRENT',
      version: nextVersion,
      previous_version: currentVersion,
      sessions_moved: disruption.stability_metrics?.sessions_moved || 0,
      approved_by,
      createdAt: new Date(),
    });

    // Update current schedule
    await Schedule.findOneAndUpdate(
      { _id: 'SCHEDULE_CURRENT' },
      {
        version: nextVersion,
        sessions: proposedSched.sessions,
        fest_week: proposedSched.fest_week,
        exams: proposedSched.exams,
        status: 'approved',
        approved_by,
      },
      { upsert: true }
    );

    // Update disruption status
    disruption.status = 'approved';
    disruption.approved_by = approved_by;
    await disruption.save();

    // Audit Log
    try {
      await AuditLog.create({
        _id: `LOG-DISRUPT-APP-${Date.now()}`,
        user_id: approved_by,
        action: 'DISRUPTION_APPROVED',
        entity_type: 'disruption',
        entity_id: disruption._id,
        description: `Disruption "${disruption.title}" approved by Admin. Active timetable updated to Version ${nextVersion}.`,
        timestamp: new Date(),
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `Disruption approved! Timetable upgraded to Version ${nextVersion}.`,
      disruption,
      version: versionRecord,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
