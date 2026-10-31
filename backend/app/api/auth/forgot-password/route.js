import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { User } from '../../../../models';
import { findMemoryUserByEmail, saveMemoryUser } from '../../../../lib/userStore';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = null;
    let usingDb = false;

    try {
      await connectToDatabase();
      user = await User.findOne({ email: cleanEmail });
      usingDb = true;
    } catch (dbErr) {
      console.warn('MongoDB connection fallback during forgot-password:', dbErr.message);
    }

    if (!user) {
      user = findMemoryUserByEmail(cleanEmail);
    }

    if (!user) {
      return NextResponse.json(
        { error: 'No user account found with this email address' },
        { status: 404 }
      );
    }

    // Generate 6-digit numeric reset token
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Update memory user
    const memUser = findMemoryUserByEmail(cleanEmail);
    if (memUser) {
      memUser.reset_password_token = resetToken;
      memUser.reset_password_expires = expiresAt;
      saveMemoryUser(memUser);
    }

    // Update MongoDB user if connected
    if (usingDb && user.save) {
      try {
        user.reset_password_token = resetToken;
        user.reset_password_expires = expiresAt;
        await user.save();
      } catch (err) {
        console.warn('Error saving reset token to DB:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset token generated successfully. In production this is emailed to the user; for demo convenience, the code is provided below.',
      reset_token: resetToken,
      email: cleanEmail,
      expires_in: '1 hour',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
