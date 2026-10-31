import { NextResponse } from 'next/server';
import { extractAuthToken, verifyJwt } from '../../../../lib/auth';
import connectToDatabase from '../../../../lib/mongodb';
import { User } from '../../../../models';

export async function GET(request) {
  try {
    const token = extractAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });
    }

    const decoded = verifyJwt(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(decoded.userId).select('-password_hash');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
