import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { User, AuditLog } from '../../../../models';
import { comparePassword, signJwt } from '../../../../lib/auth';

export async function POST(request) {
  try {
    await connectToDatabase();
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'User account is inactive' }, { status: 403 });
    }

    const token = signJwt({
      userId: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      department: user.department,
      linked_faculty_id: user.linked_faculty_id,
    });

    // Log login activity
    try {
      await AuditLog.create({
        _id: `LOG-LOGIN-${Date.now()}`,
        user_id: user._id,
        action: 'USER_LOGIN',
        entity_type: 'user',
        entity_id: user._id,
        description: `User ${user.name} (${user.role}) logged in`,
        timestamp: new Date(),
      });
    } catch (logErr) {
      // non-critical
    }

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        linked_faculty_id: user.linked_faculty_id,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
