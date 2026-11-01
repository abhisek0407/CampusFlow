import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/auth';
import connectToDatabase from '../../../../lib/mongodb';
import { User } from '../../../../models';

export async function GET(request) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    await connectToDatabase();
    const dbUser = await User.findById(user.id).select('-password_hash');
    if (!dbUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: dbUser });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
