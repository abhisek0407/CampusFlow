import nodemailer from 'nodemailer';

/**
 * CampusFlow Contact Email Service (Nodemailer)
 * 
 * Sends the user's contact form message directly to the Host Email ID configured in backend/.env:
 * - SMTP_HOST = Host Email Address to whom the message is sent (e.g. stellarinterference@gmail.com)
 * - SMTP_PASS = Host Email Passkey (Google App Password)
 */
export async function sendContactMessageToHost({ name, email, message }) {
  // Host email is taken from SMTP_HOST (or fallback to HOST_EMAIL)
  const hostEmail = (process.env.SMTP_HOST || process.env.HOST_EMAIL || '').trim();
  const hostPass = (process.env.SMTP_PASS || '').trim().replace(/\s+/g, '');

  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  // Verify credentials exist
  if (!hostEmail || !hostPass) {
    console.log(`[Contact Mailer] Message received for Host:`);
    console.log(`  - From: ${name} <${email}>`);
    console.log(`  - Message: "${message}"`);
    console.log(`  [Notice: SMTP_HOST / SMTP_PASS not set in backend/.env; logged to DB/console]`);

    return {
      sent: false,
      hostEmail: hostEmail || 'Host (Pending .env configuration)',
      reason: 'SMTP_HOST and SMTP_PASS must be configured in backend/.env',
    };
  }

  try {
    // Configure transporter using the host's email and app passkey
    const isGmail = hostEmail.toLowerCase().includes('gmail');
    const transporter = nodemailer.createTransport(
      isGmail
        ? {
            service: 'gmail',
            auth: {
              user: hostEmail,
              pass: hostPass,
            },
          }
        : {
            host: 'smtp.' + hostEmail.split('@')[1],
            port: 587,
            secure: false,
            auth: {
              user: hostEmail,
              pass: hostPass,
            },
          }
    );

    // 1. Email delivered to the Host Email (SMTP_HOST)
    const hostMailOptions = {
      from: `"${name} via CIT CampusFlow" <${hostEmail}>`,
      to: hostEmail,
      replyTo: email, // Directly replies to the user's entered email
      subject: `[CIT Contact Desk] New Message from ${name} (${email})`,
      text: `You have received a new contact message on CampusFlow.\n\nFrom: ${name}\nUser Email: ${email}\nTime: ${timestamp}\n\nMessage:\n${message}\n\n(To reply directly to this user, hit Reply in your email client or write to ${email}.)`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px;">
            <h2 style="color: #1e3a8a; margin: 0; font-size: 20px;">Chilika Institute of Technology (CIT)</h2>
            <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold;">
              CampusFlow • Contact Desk Message
            </p>
          </div>

          <p style="font-size: 14px; color: #334155; margin-bottom: 16px;">
            A visitor has submitted a message for the host via the CampusFlow contact form:
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 13px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 120px;">User Name:</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">User Email ID:</td>
              <td style="padding: 8px 0; color: #2563eb; font-weight: bold;">
                <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a>
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Host Recipient:</td>
              <td style="padding: 8px 0; color: #475569; font-family: monospace;">${hostEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Received At:</td>
              <td style="padding: 8px 0; color: #475569;">${timestamp}</td>
            </tr>
          </table>

          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; letter-spacing: 0.05em;">User's Message:</p>
            <p style="margin: 8px 0 0 0; color: #1e293b; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>

          <div style="text-align: center; margin: 24px 0 16px 0;">
            <a href="mailto:${email}?subject=Re:%20Inquiry%20to%20CIT%20CampusFlow" style="background-color: #2563eb; color: #ffffff; padding: 11px 22px; border-radius: 10px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block;">
              Reply directly to ${name} (${email})
            </a>
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0 12px 0;" />
          <p style="font-size: 11px; color: #94a3b8; margin: 0; text-align: center;">
            This email was sent to Host (${hostEmail}) via CampusFlow Autonomous Timetabling System.
          </p>
        </div>
      `,
    };

    const hostInfo = await transporter.sendMail(hostMailOptions);
    console.log(`[Contact Mailer] Email delivered to Host <${hostEmail}>. MessageId: ${hostInfo.messageId}`);

    // 2. Automated acknowledgment receipt to the user
    try {
      const userMailOptions = {
        from: `"CIT CampusFlow Administration" <${hostEmail}>`,
        to: email,
        replyTo: hostEmail,
        subject: `[CIT CampusFlow] Your Message has been delivered to Host (${hostEmail})`,
        text: `Dear ${name},\n\nThank you for contacting Chilika Institute of Technology (CIT).\n\nYour message has been delivered to the host at ${hostEmail}.\n\nYour Message:\n"${message}"\n\nThe host will reply directly to your email address (${email}) shortly.\n\nWarm regards,\nCIT CampusFlow Administration`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h3 style="color: #1e3a8a; margin-top: 0;">Chilika Institute of Technology (CIT)</h3>
            <p style="font-size: 13px; color: #334155;">Dear <strong>${name}</strong>,</p>
            <p style="font-size: 13px; color: #334155;">
              Your message has been successfully delivered to the host at <strong style="color: #2563eb;">${hostEmail}</strong>:
            </p>
            <div style="background-color: #f8fafc; border-left: 3px solid #2563eb; padding: 12px 16px; margin: 14px 0; font-size: 13px; color: #1e293b; font-style: italic;">
              "${message}"
            </div>
            <p style="font-size: 12px; color: #64748b;">
              The host will review your message and respond directly to your email address (<strong>${email}</strong>).
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">
              © 2026 Chilika Institute of Technology • CampusFlow Timetabling System
            </p>
          </div>
        `,
      };
      await transporter.sendMail(userMailOptions);
      console.log(`[Contact Mailer] Confirmation receipt delivered to User <${email}>`);
    } catch (userReceiptErr) {
      console.warn('[Contact Mailer] Could not send receipt to user:', userReceiptErr.message);
    }

    return {
      sent: true,
      hostEmail,
      messageId: hostInfo.messageId,
    };
  } catch (error) {
    console.error('[Contact Mailer] Error sending email with Nodemailer:', error);
    return {
      sent: false,
      hostEmail,
      reason: error.message,
    };
  }
}
