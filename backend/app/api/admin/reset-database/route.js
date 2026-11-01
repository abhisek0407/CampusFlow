import { NextResponse } from 'next/server';
import { seedDatabase } from '../../../../lib/seed';
import { requireAuth } from '../../../../lib/auth';

export async function POST(request) {
  try {
    const authResult = await requireAuth(request, ['admin']);
    if (authResult instanceof Response) return authResult;

    console.log('Resetting demo database to starter pack state...');
    const result = await seedDatabase({ resetAll: true });
    return NextResponse.json({
      success: true,
      message: 'Database successfully reset to clean starter dataset state.',
      details: result,
    });
  } catch (error) {
    console.error('Database reset error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to reset database' }, { status: 500 });
  }
}
