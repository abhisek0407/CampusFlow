import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { User, AuditLog } from '../../../../models';
import { hashPassword } from '../../../../lib/auth';
import { findMemoryUserByEmail, saveMemoryUser } from '../../../../lib/userStore';

export async function POST(request) {
  try {
    const { email, token, new_password } = await request.json();

    if (!email || !token || !new_password) {
      return NextResponse.json(
        { error: 'Email, reset token, and new password are required' },
        { status: 400 }
      );
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    let user = null;
    let usingDb = false;

    try {
      await connectToDatabase();
      user = await User.findOne({ email: cleanEmail });
      usingDb = true;
    } catch (dbErr) {
      console.warn('MongoDB connection fallback during reset-password:', dbErr.message);
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

    // Check token match
    const storedToken = user.reset_password_token;
    const expiresAt = user.reset_password_expires;

    if (!storedToken || storedToken !== cleanToken) {
      return NextResponse.json(
        { error: 'Invalid or expired password reset token' },
        { status: 400 }
      );
    }

    if (expiresAt && new Date() > new Date(expiresAt)) {
      return NextResponse.json(
        { error: 'Password reset token has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(new_password);

    // Update memory user
    const memUser = findMemoryUserByEmail(cleanEmail);
    if (memUser) {
      memUser.password_hash = newPasswordHash;
      memUser.reset_password_token = null;
      memUser.reset_password_expires = null;
      saveMemoryUser(memUser);
    }

    // Update MongoDB user if connected
    if (usingDb && user.save) {
      try {
        user.password_hash = newPasswordHash;
        user.reset_password_token = null;
        user.reset_password_expires = null;
        await user.save();

        try {
          await AuditLog.create({
            _id: `LOG-PWRESET-${Date.now()}`,
            user_id: user._id,
            action: 'USER_PASSWORD_RESET',
            entity_type: 'user',
            entity_id: user._id,
            description: `Password reset successfully for ${user.email}`,
            timestamp: new Date(),
          });
        } catch (lErr) {}
      } catch (err) {
        console.warn('Error saving new password to DB:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been successfully updated! You can now sign in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
