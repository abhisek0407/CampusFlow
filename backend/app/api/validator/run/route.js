import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import connectToDatabase from '../../../../lib/mongodb';
import { Schedule } from '../../../../models';
import { runValidator } from '../../../../lib/validatorRunner';

export async function GET() {
  try {
    await connectToDatabase();

    let scheduleData = await Schedule.findOne({ _id: 'SCHEDULE_CURRENT' }).lean();
    if (!scheduleData) {
      const schedulePath = path.resolve(process.cwd(), '../exports/schedule.json');
      const altSchedulePath = path.resolve(process.cwd(), 'exports/schedule.json');
      const finalPath = fs.existsSync(schedulePath) ? schedulePath : fs.existsSync(altSchedulePath) ? altSchedulePath : null;
      if (finalPath) {
        scheduleData = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
      }
    }

    if (!scheduleData) {
      return NextResponse.json({ error: 'No schedule found to validate' }, { status: 404 });
    }

    const result = await runValidator({ scheduleData });

    return NextResponse.json({
      success: true,
      exit_code: result.exitCode,
      report: result.report,
      raw_stdout: result.stdout,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
