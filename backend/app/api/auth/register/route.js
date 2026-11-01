import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { User, AuditLog } from '../../../../models';
import { hashPassword, signJwt } from '../../../../lib/auth';
import { findMemoryUserByEmail, saveMemoryUser } from '../../../../lib/userStore';

export async function POST(request) {
  try {
    const { name, email, password, role, department, linked_faculty_id } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Name, email, password, and role are required' },
        { status: 400 }
      );
    }

    const validRoles = ['admin', 'department_coordinator', 'faculty', 'club'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists in memory store
    if (findMemoryUserByEmail(cleanEmail)) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    let existingInDb = false;
    let usingDb = false;

    try {
      await connectToDatabase();
      usingDb = true;
      const existing = await User.findOne({ email: cleanEmail });
      if (existing) {
        existingInDb = true;
      }
    } catch (dbErr) {
      console.warn('MongoDB connection fallback during register:', dbErr.message);
    }

    if (existingInDb) {
      return NextResponse.json(
        { error: 'A user with this email already exists in database' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const userId = `USER_${Date.now().toString(36).toUpperCase()}`;

    const newUserObj = {
      _id: userId,
      name: name.trim(),
      email: cleanEmail,
      password_hash: passwordHash,
      role,
      department: department || 'COMMON',
      linked_faculty_id: role === 'faculty' ? (linked_faculty_id || null) : null,
      is_active: true,
      reset_password_token: null,
      reset_password_expires: null,
    };

    // Save to memory store
    saveMemoryUser(newUserObj);

    // Save to MongoDB if connected
    if (usingDb) {
      try {
        await User.create(newUserObj);
        await AuditLog.create({
          _id: `LOG-REG-${Date.now()}`,
          user_id: userId,
          action: 'USER_REGISTER',
          entity_type: 'user',
          entity_id: userId,
          description: `Registered user ${name} with role ${role}`,
          timestamp: new Date(),
        });
      } catch (err) {
        console.warn('Error saving to DB (saved to memory):', err.message);
      }
    }

    const token = signJwt({
      userId: newUserObj._id,
      email: newUserObj.email,
      role: newUserObj.role,
      name: newUserObj.name,
      department: newUserObj.department,
      linked_faculty_id: newUserObj.linked_faculty_id,
    });

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: newUserObj._id,
        name: newUserObj.name,
        email: newUserObj.email,
        role: newUserObj.role,
        department: newUserObj.department,
        linked_faculty_id: newUserObj.linked_faculty_id,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
