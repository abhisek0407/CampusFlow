import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import connectToDatabase from '../../../../lib/mongodb';
import { Schedule } from '../../../../models';

export async function GET() {
  try {
    await connectToDatabase();
    // Ground truth benchmark exports/schedule.json, with DB fallback
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
      schedule = await Schedule.findOne({ _id: 'SCHEDULE_CURRENT' }).lean();
    }

    if (!schedule) {
      return NextResponse.json({ error: 'No schedule generated yet' }, { status: 404 });
    }

    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
