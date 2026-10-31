import { NextResponse } from 'next/server';
import { seedDatabase } from '../../../../lib/seed';

export async function POST(request) {
  try {
    console.log('Resetting demo database to starter pack state...');
    const result = await seedDatabase({ resetAll: true });
    return NextResponse.json({
      success: true,
      message: 'Database successfully reset to clean starter dataset state.',
      details: result,
    });
  } catch (error) {
    console.error('Database reset error:', error);
    return NextResponse.json({ error: error.message || 'Failed to reset database' }, { status: 500 });
  }
}
