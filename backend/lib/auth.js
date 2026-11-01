import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

export function signJwt(payload, expiresIn = '7d') {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}

export function verifyJwt(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (err) {
    return null;
  }
}

export async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}

export async function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

export function extractAuthToken(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export async function requireAuth(request, allowedRoles = null) {
  const token = extractAuthToken(request);
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Missing authentication token' }, { status: 401 });
  }

  const decoded = verifyJwt(token);
  if (!decoded) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
  }

  const user = {
    id: decoded.userId || decoded.id,
    role: decoded.role,
    name: decoded.name,
    department: decoded.department,
    linked_faculty_id: decoded.linked_faculty_id || null,
  };

  if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden: Insufficient role permissions' }, { status: 403 });
    }
  }

  return { user };
}
