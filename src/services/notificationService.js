import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const CLOUD_FUNCTION_ENDPOINT = "https://us-central1-wca-tickets-58f6c.cloudfunctions.net/sendTicketNotification";

/**
 * Builds standard, clean HTML email templates for WCA Helpdesk notifications
 */
export function buildTicketEmailHtml({
  ticketNumber,
  ticketTitle,
  headline,
  messageText,
  statusLabel,
  statusColor = '#f59e0b',
  location,
  room,
  department,
  actorName,
  ticketUrl,
  isWaiting = false
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WCA Helpdesk Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0b1c2d 0%, #1e3a5f 100%); padding: 28px 32px; text-align: left; border-bottom: 4px solid #f59e0b;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="color: #f59e0b; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px;">
                      West Central Area Schools
                    </div>
                    <div style="color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                      WCA Helpdesk
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; background-color: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; color: #f59e0b; font-weight: 700; font-size: 12px; font-family: monospace; padding: 6px 12px; border-radius: 8px;">
                      ${ticketNumber}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <!-- Headline & Status -->
              <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">
                ${headline}
              </div>
              <div style="font-size: 14px; color: #64748b; margin-bottom: 24px;">
                Ticket: <strong style="color: #1e293b;">${ticketTitle}</strong>
              </div>

              ${isWaiting ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 8px; margin-bottom: 20px;">
                <strong style="color: #92400e; font-size: 13px; display: block; margin-bottom: 4px;">Action Needed: Response Requested</strong>
                <span style="color: #78350f; font-size: 13px; line-height: 1.5;">The assigned technician is waiting for your reply or more information to proceed with this ticket.</span>
              </div>
              ` : ''}

              <!-- Message / Response Quote Box -->
              ${messageText ? `
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 8px; letter-spacing: 0.5px;">
                  Response from ${actorName || 'Staff Member'}:
                </div>
                <div style="font-size: 14px; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">
                  ${messageText}
                </div>
              </div>
              ` : ''}

              <!-- Status Badge (if status change) -->
              ${statusLabel ? `
              <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background-color: #f8fafc; border-radius: 10px; padding: 12px 16px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="font-size: 13px; color: #64748b;">Current Ticket Status:</td>
                  <td align="right">
                    <span style="display: inline-block; background-color: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor}50; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 9999px;">
                      ${statusLabel}
                    </span>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Ticket Info Details Grid -->
              <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">Campus Location</td>
                  <td align="right" style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; font-weight: 600; color: #0f172a;">${location || 'Campus'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">Room / Specific Location</td>
                  <td align="right" style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; font-weight: 600; color: #0f172a;">${room || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">Department</td>
                  <td align="right" style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; font-weight: 600; color: #0f172a;">${department || 'Support'}</td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${ticketUrl}" target="_blank" style="display: inline-block; background-color: #0b1c2d; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 10px; border: 1px solid #f59e0b; box-shadow: 0 4px 6px -1px rgba(11,28,45,0.2);">
                      View &amp; Reply in Ticket &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #94a3b8;">
                You received this email because you are a participant or assignee on Ticket ${ticketNumber}.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                West Central Area Schools Helpdesk &bull; <a href="${ticketUrl}" style="color: #64748b; text-decoration: underline;">Open Helpdesk Portal</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Main dispatcher for ticket notifications
 * Handles Status Changes, Public Responses, and Requester Replies
 */
export async function sendTicketNotification({
  type, // 'status_change' | 'comment' | 'requester_reply' | 'assigned' | 'created'
  ticket,
  comment = null,
  newStatus = null,
  newStatusLabel = null,
  actor = null,
  webhookUrl = null
}) {
  if (!ticket) return { success: false, error: 'No ticket provided' };

  // Never send external notifications for private internal technician notes!
  if (comment && comment.isInternal) {
    console.log('[NotificationService] Skipped email notification: internal technician note.');
    return { success: true, skipped: true, reason: 'Internal technician note' };
  }

  const ticketNumber = ticket.ticketNumber || (ticket.id ? `#${ticket.id.slice(-6)}` : '#TICK');
  const ticketTitle = ticket.title || 'Helpdesk Ticket';
  const ticketUrl = `https://wca-tickets-58f6c.web.app/?ticket=${ticket.id}`;
  const location = ticket.location || ticket.building || 'Campus';
  const room = ticket.room || ticket.roomLocation || 'General';
  const department = ticket.areaName || ticket.department || 'Support';
  const actorName = actor?.displayName || actor?.name || actor?.email?.split('@')[0] || 'Staff Member';

  let recipientEmail = null;
  let recipientName = null;
  let subject = '';
  let headline = '';
  let messageText = '';
  let statusLabel = newStatusLabel || ticket.status;
  let statusColor = '#3b82f6';
  let isWaiting = false;

  if (type === 'status_change') {
    recipientEmail = ticket.createdByEmail || ticket.requester?.email;
    recipientName = ticket.createdByName || ticket.requester?.name || 'Requester';
    subject = `[${ticketNumber}] Status updated to ${statusLabel}`;
    headline = `Ticket Status Updated to "${statusLabel}"`;
    messageText = comment?.text || `Your ticket status has been updated to "${statusLabel}" by ${actorName}.`;
    
    if (newStatus === 'waiting') {
      isWaiting = true;
      statusColor = '#8b5cf6';
    } else if (newStatus === 'resolved') {
      statusColor = '#10b981';
    } else if (newStatus === 'in_progress') {
      statusColor = '#f59e0b';
    } else if (newStatus === 'closed') {
      statusColor = '#64748b';
    }
  } else if (type === 'comment') {
    // Public response by technician
    recipientEmail = ticket.createdByEmail || ticket.requester?.email;
    recipientName = ticket.createdByName || ticket.requester?.name || 'Requester';
    subject = `[${ticketNumber}] New Response from ${actorName}`;
    headline = `Technician Response on Ticket ${ticketNumber}`;
    messageText = comment?.text || '';
    if (comment?.changeStatusToWaiting || ticket.status === 'waiting' || newStatus === 'waiting') {
      isWaiting = true;
      statusLabel = 'Waiting on Requester';
      statusColor = '#8b5cf6';
    }
  } else if (type === 'requester_reply') {
    // Submitter replied back
    recipientEmail = ticket.assignedToEmail || 'helpdesk@wcatrojans.org';
    recipientName = ticket.assignedToName || 'Assigned Technician';
    subject = `[${ticketNumber}] Requester Reply from ${actorName}`;
    headline = `Requester Replied to Ticket ${ticketNumber}`;
    messageText = comment?.text || '';
  } else if (type === 'assigned') {
    recipientEmail = ticket.assignedToEmail;
    recipientName = ticket.assignedToName || 'Technician';
    subject = `[${ticketNumber}] Ticket Assigned to You: ${ticketTitle}`;
    headline = `New Ticket Assigned to You`;
    messageText = `You have been assigned to handle ticket ${ticketNumber} (${ticketTitle}) at ${location} - ${room}.`;
  }

  if (!recipientEmail) {
    console.warn('[NotificationService] No recipient email found for ticket:', ticketNumber);
    return { success: false, error: 'No recipient email' };
  }

  const htmlBody = buildTicketEmailHtml({
    ticketNumber,
    ticketTitle,
    headline,
    messageText,
    statusLabel,
    statusColor,
    location,
    room,
    department,
    actorName,
    ticketUrl,
    isWaiting
  });

  const plainText = `${headline}\n\nTicket: ${ticketTitle} (${ticketNumber})\nLocation: ${location} - Room: ${room}\nStatus: ${statusLabel}\n\n${messageText}\n\nView & Reply: ${ticketUrl}`;

  // 1. Save in-app notification in Firestore
  try {
    await addDoc(collection(db, 'notifications'), {
      recipientEmail: recipientEmail.toLowerCase(),
      recipientName,
      subject,
      summary: messageText.slice(0, 160),
      ticketId: ticket.id,
      ticketNumber,
      ticketTitle,
      type,
      authorName: actorName,
      authorEmail: actor?.email || null,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('[NotificationService] In-app notification write warning:', err);
  }

  // 2. Queue in Firestore 'mail' collection (for Firebase Trigger Email extension)
  try {
    await addDoc(collection(db, 'mail'), {
      to: [recipientEmail.toLowerCase()],
      message: {
        subject,
        text: plainText,
        html: htmlBody
      },
      ticketId: ticket.id,
      ticketNumber,
      type,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('[NotificationService] Mail collection write warning:', err);
  }

  // 3. Dispatch to Cloud Function / Google Apps Script webhook
  const targetWebhook = webhookUrl || CLOUD_FUNCTION_ENDPOINT;
  try {
    const response = await fetch(targetWebhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: recipientEmail,
        recipientName,
        subject,
        html: htmlBody,
        text: plainText,
        ticketNumber,
        ticketTitle,
        ticketId: ticket.id,
        type,
        authorName: actorName,
        authorEmail: actor?.email,
        isInternal: false
      })
    });

    if (response.ok) {
      console.log(`[NotificationService] Notification sent successfully to ${recipientEmail}`);
      return { success: true, deliveredTo: recipientEmail };
    } else {
      console.warn('[NotificationService] Dispatch response status:', response.status);
    }
  } catch (netErr) {
    console.warn('[NotificationService] Cloud Function dispatch fallback:', netErr.message);
  }

  return { success: true, deliveredTo: recipientEmail, queued: true };
}

/**
 * Sends a test email to verify outbound notifications and webhook connectivity
 */
export async function sendTestNotificationEmail({ recipientEmail, webhookUrl = null }) {
  const dummyTicket = {
    id: 'TEST-1234',
    ticketNumber: '#T-1001',
    title: 'Test Notification - Projector not displaying HDMI signal',
    building: 'Centennial',
    location: 'Centennial',
    room: 'Room 204 (Media Lab)',
    areaName: 'Technology (ITSM)',
    status: 'in_progress',
    createdByEmail: recipientEmail,
    createdByName: 'Test Staff Member'
  };

  return await sendTicketNotification({
    type: 'comment',
    ticket: dummyTicket,
    comment: {
      text: 'This is a test notification from the WCA Helpdesk Email & Notification System.\n\nAll notification triggers (Status Updates, Option 2 Public Responses, and Requester Replies) are connected and configured.',
      isInternal: false,
      changeStatusToWaiting: true
    },
    newStatus: 'in_progress',
    newStatusLabel: 'In Progress',
    actor: {
      displayName: 'WCA IT Administrator',
      email: 'it-support@wcatrojans.org'
    },
    webhookUrl
  });
}
