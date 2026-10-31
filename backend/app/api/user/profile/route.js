import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { User, AuditLog } from '../../../../models';
import { extractAuthToken, verifyJwt, hashPassword, comparePassword, signJwt } from '../../../../lib/auth';
import { findMemoryUserByEmail, saveMemoryUser } from '../../../../lib/userStore';

export async function GET(request) {
  try {
    const token = extractAuthToken(request);
    let email = null;

    if (token) {
      const decoded = verifyJwt(token);
      if (decoded && decoded.email) {
        email = decoded.email.toLowerCase();
      }
    }

    if (!email) {
      const { searchParams } = new URL(request.url);
      email = searchParams.get('email')?.toLowerCase();
    }

    if (!email) {
      return NextResponse.json({ error: 'Authentication token or email required' }, { status: 401 });
    }

    let user = null;
    try {
      await connectToDatabase();
      user = await User.findOne({ email }).select('-password_hash');
    } catch (e) {
      console.warn('MongoDB fallback during profile GET:', e.message);
    }

    if (!user) {
      const memUser = findMemoryUserByEmail(email);
      if (memUser) {
        const { password_hash, ...rest } = memUser;
        user = rest;
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  return handleUpdateProfile(request);
}

export async function POST(request) {
  return handleUpdateProfile(request);
}

async function handleUpdateProfile(request) {
  try {
    const token = extractAuthToken(request);
    let tokenEmail = null;

    if (token) {
      const decoded = verifyJwt(token);
      if (decoded && decoded.email) {
        tokenEmail = decoded.email.toLowerCase();
      }
    }

    const body = await request.json();
    const targetEmail = (tokenEmail || body.email || '').trim().toLowerCase();

    if (!targetEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    const {
      name,
      department,
      linked_faculty_id,
      phone,
      designation,
      current_password,
      new_password,
    } = body;

    let user = null;
    let usingDb = false;

    try {
      await connectToDatabase();
      user = await User.findOne({ email: targetEmail });
      usingDb = true;
    } catch (e) {
      console.warn('MongoDB fallback during profile update:', e.message);
    }

    if (!user) {
      user = findMemoryUserByEmail(targetEmail);
    }

    if (!user) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    // Password change check if requested
    if (new_password) {
      if (!current_password) {
        return NextResponse.json(
          { error: 'Current password is required to set a new password' },
          { status: 400 }
        );
      }
      const isMatch = await comparePassword(current_password, user.password_hash);
      if (!isMatch) {
        return NextResponse.json(
          { error: 'Current password does not match' },
          { status: 400 }
        );
      }
      if (new_password.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters long' },
          { status: 400 }
        );
      }
      const newHash = await hashPassword(new_password);
      user.password_hash = newHash;
    }

    // Update fields
    if (name) user.name = name.trim();
    if (department) user.department = department.trim();
    if (linked_faculty_id !== undefined) user.linked_faculty_id = linked_faculty_id || null;
    if (phone !== undefined) user.phone = phone || '';
    if (designation !== undefined) user.designation = designation || '';

    // Save to memory store
    const memUser = findMemoryUserByEmail(targetEmail) || {};
    Object.assign(memUser, {
      ...user,
      name: user.name,
      department: user.department,
      linked_faculty_id: user.linked_faculty_id,
      password_hash: user.password_hash,
      phone: user.phone,
      designation: user.designation,
    });
    saveMemoryUser(memUser);

    // Save to MongoDB if connected
    if (usingDb && user.save) {
      try {
        await user.save();
        try {
          await AuditLog.create({
            _id: `LOG-PROFILE-${Date.now()}`,
            user_id: user._id,
            action: 'USER_PROFILE_UPDATE',
            entity_type: 'user',
            entity_id: user._id,
            description: `User ${user.name} updated profile details`,
            timestamp: new Date(),
          });
        } catch (lErr) {}
      } catch (dbSaveErr) {
        console.warn('DB profile save warning:', dbSaveErr.message);
      }
    }

    // Generate fresh JWT
    const updatedToken = signJwt({
      userId: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      department: user.department,
      linked_faculty_id: user.linked_faculty_id,
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully!',
      token: updatedToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        linked_faculty_id: user.linked_faculty_id,
        phone: user.phone || '',
        designation: user.designation || '',
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
