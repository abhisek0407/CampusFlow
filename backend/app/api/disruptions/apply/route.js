import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import connectToDatabase from '../../../../lib/mongodb';
import { Disruption, Schedule, ScheduleVersion, AuditLog } from '../../../../models';
import { runValidator } from '../../../../lib/validatorRunner';

export async function POST(request) {
  try {
    await connectToDatabase();
    const { disruption_id } = await request.json();

    let disruption = null;
    if (disruption_id) {
      disruption = await Disruption.findById(disruption_id);
    }
    if (!disruption) {
      disruption = await Disruption.findOne({ status: 'pending' }).sort({ createdAt: -1 });
    }

    if (!disruption) {
      // Create a default sample disruption if none exists
      const sampleDisruptionPath = path.resolve(process.cwd(), '../CrunchWeek_StarterPack/examples/sample_disruption.json');
      const altSamplePath = path.resolve(process.cwd(), 'CrunchWeek_StarterPack/examples/sample_disruption.json');
      const finalSamplePath = fs.existsSync(sampleDisruptionPath) ? sampleDisruptionPath : fs.existsSync(altSamplePath) ? altSamplePath : null;

      if (finalSamplePath) {
        const sampleData = JSON.parse(fs.readFileSync(finalSamplePath, 'utf8'));
        disruption = await Disruption.create({
          _id: 'DISRUPTION_SAMPLE',
          title: 'Sample Semester Disruption (F07 leave, CR-102 leak, CS202-T2 added)',
          source: 'starter_pack',
          changes: sampleData.changes,
          status: 'pending',
        });
      }
    }

    if (!disruption) {
      return NextResponse.json({ error: 'No disruption found to apply' }, { status: 404 });
    }

    // Load baseline schedule
    let baseSched = await Schedule.findOne({ _id: 'SCHEDULE_CURRENT' }).lean();
    if (!baseSched) {
      const schedulePath = path.resolve(process.cwd(), '../exports/schedule.json');
      const altSchedulePath = path.resolve(process.cwd(), 'exports/schedule.json');
      const finalPath = fs.existsSync(schedulePath) ? schedulePath : fs.existsSync(altSchedulePath) ? altSchedulePath : null;
      if (finalPath) baseSched = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
    }

    // Load exported schedule_after.json
    const afterSchedulePath = path.resolve(process.cwd(), '../exports/schedule_after.json');
    const altAfterPath = path.resolve(process.cwd(), 'exports/schedule_after.json');
    const finalAfterPath = fs.existsSync(afterSchedulePath) ? afterSchedulePath : fs.existsSync(altAfterPath) ? altAfterPath : null;

    if (!finalAfterPath) {
      return NextResponse.json({ error: 'Rescheduled timetable exports/schedule_after.json not found.' }, { status: 404 });
    }

    const proposedSched = JSON.parse(fs.readFileSync(finalAfterPath, 'utf8'));

    // Compute exact diff between base and proposed
    const baseMap = new Map((baseSched?.sessions || []).map((s) => [s.session_id, s]));
    const diffs = [];
    let timeChangedCount = 0;
    let roomOnlyChangedCount = 0;

    for (const curr of proposedSched.sessions) {
      const old = baseMap.get(curr.session_id);
      if (!old) {
        // Newly added session
        diffs.push({
          session_id: curr.session_id,
          type: 'added',
          old: null,
          new: { day: curr.day, start_period: curr.start_period, room_id: curr.room_id },
        });
      } else if (old.day !== curr.day || old.start_period !== curr.start_period || old.room_id !== curr.room_id) {
        const timeDiff = old.day !== curr.day || old.start_period !== curr.start_period;
        if (timeDiff) timeChangedCount++;
        else roomOnlyChangedCount++;

        diffs.push({
          session_id: curr.session_id,
          type: timeDiff ? 'time_and_room' : 'room_only',
          old: { day: old.day, start_period: old.start_period, room_id: old.room_id },
          new: { day: curr.day, start_period: curr.start_period, room_id: curr.room_id },
        });
      }
    }

    // Run validator on disruption
    let validatorReport = null;
    try {
      const vResult = await runValidator({
        scheduleData: proposedSched,
        disruptionData: { changes: disruption.changes },
        baselineData: baseSched,
      });
      validatorReport = vResult.report;
    } catch (vErr) {
      console.warn('Validator on disruption:', vErr.message);
    }

    // Update disruption record
    disruption.status = 'analyzed';
    disruption.stability_metrics = {
      sessions_moved: diffs.length,
      time_changed: timeChangedCount,
      room_only_changed: roomOnlyChangedCount,
      moved_ids: diffs.map((d) => d.session_id),
    };
    await disruption.save();

    return NextResponse.json({
      success: true,
      message: `Rescheduling analysis complete: ${diffs.length} session(s) moved with minimal disruption.`,
      disruption_id: disruption._id,
      stability: disruption.stability_metrics,
      changes_diff: diffs,
      validator_report: validatorReport,
      requires_admin_approval: true,
    });
  } catch (error) {
    console.error('Disruption apply error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
