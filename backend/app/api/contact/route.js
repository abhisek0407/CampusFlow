import { NextResponse } from 'next/server';
import connectToDatabase from '../../../lib/mongodb';
import { AuditLog } from '../../../models';
import { sendContactMessageToHost } from '../../../lib/mailer';

// In-memory fallback if MongoDB is not connected
const memoryInquiries = [];

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // 1. Validate required inputs
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'User name is required.' },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'User email ID is required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please enter a valid user email address.' },
        { status: 400 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message content cannot be blank.' },
        { status: 400 }
      );
    }

    // Host email configured via SMTP_HOST in backend/.env
    const hostEmail = (process.env.SMTP_HOST || process.env.HOST_EMAIL || 'dean.academic@cit.edu').trim();

    const inquiryRecord = {
      id: `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      hostEmail,
      createdAt: new Date().toISOString(),
    };

    // 2. Persist message into AuditLog / Database
    let dbSaved = false;
    try {
      await connectToDatabase();
      if (AuditLog) {
        await AuditLog.create({
          action: 'CONTACT_MESSAGE_SUBMITTED_TO_HOST',
          user_id: inquiryRecord.email,
          details: {
            userName: inquiryRecord.name,
            userEmail: inquiryRecord.email,
            targetHostEmail: hostEmail,
            messageExcerpt: inquiryRecord.message.slice(0, 300),
            inquiryId: inquiryRecord.id,
          },
          timestamp: new Date(),
        });
        dbSaved = true;
      }
    } catch (dbErr) {
      console.warn('[Contact Route] MongoDB log skipped:', dbErr.message);
    }

    if (!dbSaved) {
      memoryInquiries.push(inquiryRecord);
    }

    // 3. Dispatch real email to the host email (SMTP_HOST) with passkey (SMTP_PASS)
    const emailResult = await sendContactMessageToHost({
      name: inquiryRecord.name,
      email: inquiryRecord.email,
      message: inquiryRecord.message,
    });

    return NextResponse.json({
      success: true,
      inquiryId: inquiryRecord.id,
      hostEmail: emailResult.hostEmail || hostEmail,
      emailSent: emailResult.sent,
      emailReason: emailResult.reason || null,
      message: emailResult.sent
        ? `Your message has been sent to the host (${emailResult.hostEmail || hostEmail})!`
        : `Your message has been received and queued for the host (${emailResult.hostEmail || hostEmail}).`,
    });
  } catch (err) {
    console.error('[Contact Route] Error processing contact submission:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error processing contact submission' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const hostEmail = (process.env.SMTP_HOST || process.env.HOST_EMAIL || 'dean.academic@cit.edu').trim();
  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_PASS);

  return NextResponse.json({
    status: 'online',
    service: 'CampusFlow Host Messaging Service',
    hostEmail,
    smtpConfigured,
  });
}
