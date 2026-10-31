import { NextResponse } from 'next/server';
import connectToDatabase from '../../../lib/mongodb';
import { AuditLog } from '../../../models';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    await connectToDatabase();
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(limit).lean();

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
