import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear any auth cookies if present
    response.cookies.set('cit_token', '', {
      httpOnly: true,
      expires: new Date(0),
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Logout failed' }, { status: 500 });
  }
}
