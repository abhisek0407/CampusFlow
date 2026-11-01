import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { Disruption, Schedule, ScheduleVersion, AuditLog } from '../../../../models';
import { requireAuth } from '../../../../lib/auth';
import { runValidator } from '../../../../lib/validatorRunner';

export async function POST(request) {
  try {
    const authResult = await requireAuth(request, ['admin']);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    await connectToDatabase();
    const body = await request.json();
    const { disruption_id } = body;

    if (!disruption_id) {
      return NextResponse.json({ success: false, error: 'disruption_id is required' }, { status: 400 });
    }

    const disruption = await Disruption.findById(disruption_id);
    if (!disruption) {
      return NextResponse.json({ success: false, error: `Disruption '${disruption_id}' not found` }, { status: 404 });
    }

    if (disruption.status !== 'analyzed') {
      return NextResponse.json({
        success: false,
        error: `Cannot approve disruption with status '${disruption.status}'. Status must be 'analyzed'.`,
      }, { status: 400 });
    }

    const proposal = disruption.proposal;
    if (!proposal || !proposal.after_schedule) {
      return NextResponse.json({ success: false, error: 'Disruption has no proposed schedule to apply' }, { status: 400 });
    }

    if (!proposal.feasible) {
      return NextResponse.json({
        success: false,
        error: 'Cannot approve infeasible disruption proposal (has dropped sessions or hard constraint violations)',
      }, { status: 422 });
    }

    const currentSchedule = await Schedule.findOne({ _id: 'SCHEDULE_CURRENT' }).lean();
    if (!currentSchedule) {
      return NextResponse.json({ success: false, error: 'SCHEDULE_CURRENT not found' }, { status: 500 });
    }

    const baseVersion = disruption.base_version || 1;
    const afterSchedule = proposal.after_schedule;

    // Gate: Re-run validator on new schedule before committing
    try {
      const vResult = await runValidator({
        scheduleData: afterSchedule,
        disruptionData: { changes: disruption.changes },
        baselineData: currentSchedule,
      });

      const hardCount = vResult.report?.hard_violations?.length || 0;
      if (hardCount > 0) {
        return NextResponse.json({
          success: false,
          error: `Pre-commit validation failed: ${hardCount} hard constraint violation(s) detected.`,
          report: vResult.report,
        }, { status: 422 });
      }
    } catch (vErr) {
      console.warn('Validator warning during approval:', vErr.message);
    }

    const expectedNewVersion = baseVersion + 1;
    const versionDocId = `VERSION-${expectedNewVersion}-${Date.now()}`;

    // 1. Insert collision-proof ScheduleVersion record FIRST
    const versionRecord = await ScheduleVersion.create({
      _id: versionDocId,
      schedule_id: 'SCHEDULE_CURRENT',
      version: expectedNewVersion,
      previous_version: baseVersion,
      changes: proposal.diff || [],
      sessions_moved: proposal.diff ? proposal.diff.length : 0,
      approved_by: user.name,
      disruption_id: disruption._id,
      createdAt: new Date(),
    });

    // 2. Atomic update: only succeeds if live version matches base_version
    let updatedSchedule;
    try {
      updatedSchedule = await Schedule.findOneAndUpdate(
        { _id: 'SCHEDULE_CURRENT', version: baseVersion },
        {
          sessions: afterSchedule.sessions || [],
          fest_week: afterSchedule.fest_week || { bookings: [], session_overrides: [] },
          exams: afterSchedule.exams || [],
          status: 'approved',
          approved_by: user.name,
          $inc: { version: 1 },
        },
        { new: true }
      );
    } catch (schedErr) {
      // Rollback staged ScheduleVersion document on error
      await ScheduleVersion.deleteOne({ _id: versionDocId });
      throw schedErr;
    }

    // If update returned null (stale proposal), clean up the staged ScheduleVersion document
    if (!updatedSchedule) {
      await ScheduleVersion.deleteOne({ _id: versionDocId });
      return NextResponse.json({
        success: false,
        error: 'stale_proposal',
        message: 'The active timetable has changed since this proposal was generated. Please re-propose the changes.',
        current_version: currentSchedule.version,
        proposal_base_version: baseVersion,
      }, { status: 409 });
    }

    const newVersion = updatedSchedule.version;

    // Update disruption status
    disruption.status = 'approved';
    disruption.approved_by = user.name;
    disruption.applied_version = newVersion;
    await disruption.save();

    // Audit Log
    try {
      await AuditLog.create({
        _id: `LOG-DISRUPT-APP-${Date.now()}`,
        user_id: user.id || user.name,
        action: 'DISRUPTION_APPROVED',
        entity_type: 'disruption',
        entity_id: disruption._id,
        description: `Disruption "${disruption.title}" approved by ${user.name}. Timetable upgraded from Version ${baseVersion} to Version ${newVersion}.`,
        timestamp: new Date(),
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `Disruption approved! Timetable upgraded to Version ${newVersion}.`,
      disruption_id: disruption._id,
      previous_version: baseVersion,
      new_version: newVersion,
      version: newVersion,            // number, so UIs can print it safely
      version_record: versionRecord,  // full record, if anything needs it,
    });
  } catch (error) {
    console.error('Disruptions approve error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
