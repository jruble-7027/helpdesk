import { db } from './firebase';
import { collection, addDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { DEFAULT_EMAIL_WEBHOOK_URL } from '../data/categoriesData';

export const DEFAULT_CALENDAR_ALERT_SETTINGS = {
  popupEnabled: true,
  soundEnabled: true,
  emailEnabled: true,
  notifyEmails: 'jruble@wcatrojans.org'
};

const CLOUD_FUNCTION_ENDPOINT = "https://us-central1-wca-tickets-58f6c.cloudfunctions.net/sendTicketNotification";

/**
 * Builds standard, clean HTML email templates for WCA Helpdesk notifications
 */
export function buildTicketEmailHtml({
  ticketNumber,
  ticketTitle,
  headline,
  messageText,
  messageHeader = null,
  statusLabel,
  statusColor = '#f59e0b',
  location,
  room,
  department,
  assetType = null,
  urgencyLabel = null,
  submitterEmail = null,
  attachments = [],
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
                      Wesleyan Christian Academy
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
                  ${messageHeader || `Response from ${actorName || 'Staff Member'}:`}
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
                ${submitterEmail ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">Submitted By</td>
                  <td align="right" style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; font-weight: 600; color: #0f172a;">${actorName || 'Staff'} (${submitterEmail})</td>
                </tr>
                ` : ''}
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
                ${assetType ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">Category / Asset</td>
                  <td align="right" style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; font-weight: 600; color: #0f172a;">${assetType}</td>
                </tr>
                ` : ''}
                ${urgencyLabel ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">Urgency / Priority</td>
                  <td align="right" style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; font-weight: 700; color: #0f172a; text-transform: capitalize;">${urgencyLabel}</td>
                </tr>
                ` : ''}
              </table>

              ${attachments && attachments.length > 0 ? `
              <div style="margin-bottom: 24px; padding: 12px 16px; background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">
                  Attached Photos / Files (${attachments.length}):
                </div>
                ${attachments.map((att) => `<div style="font-size: 12px; margin-bottom: 4px;"><a href="${att.url}" target="_blank" style="color: #2563eb; font-weight: 600; text-decoration: underline;">${att.name || 'View Attachment'}</a></div>`).join('')}
              </div>
              ` : ''}

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
                Wesleyan Christian Academy Helpdesk &bull; <a href="${ticketUrl}" style="color: #64748b; text-decoration: underline;">Open Helpdesk Portal</a>
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
  recipientEmailOverride = null,
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
  const actorName = actor?.displayName || actor?.name || ticket.createdByName || actor?.email?.split('@')[0] || 'Staff Member';

  let recipientEmail = recipientEmailOverride || null;
  let recipientName = null;
  let subject = '';
  let headline = '';
  let messageText = '';
  let messageHeader = null;
  let statusLabel = newStatusLabel || ticket.status;
  let statusColor = '#3b82f6';
  let isWaiting = false;

  if (type === 'created') {
    recipientEmail = recipientEmailOverride || ticket.departmentNotifyEmails;
    recipientName = `${department} Administrator`;
    subject = `[${ticketNumber}] New ${department} Ticket: ${ticketTitle}`;
    headline = `New ${department} Ticket Submitted`;
    messageHeader = `Issue Description from ${actorName}:`;
    messageText = ticket.description || ticket.selectedIssue || ticketTitle;
    statusLabel = 'New Ticket';
    statusColor = ticket.urgency === 'emergency' ? '#dc2626' : ticket.urgency === 'high' ? '#f59e0b' : '#2563eb';
  } else if (type === 'status_change') {
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

  // Normalize comma/semicolon-separated recipient emails
  const emailList = String(recipientEmail || '')
    .split(/[,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e && e.includes('@'));

  if (emailList.length === 0) {
    console.warn('[NotificationService] No recipient email found for ticket:', ticketNumber, 'type:', type);
    return { success: false, error: 'No recipient email configured' };
  }

  const normalizedTo = emailList.join(', ');
  const activeWebhookUrl = (webhookUrl && webhookUrl.trim()) || DEFAULT_EMAIL_WEBHOOK_URL;

  const htmlBody = buildTicketEmailHtml({
    ticketNumber,
    ticketTitle,
    headline,
    messageText,
    messageHeader,
    statusLabel,
    statusColor,
    location,
    room,
    department,
    assetType: type === 'created' ? (ticket.assetType ? `${ticket.assetType}${ticket.assetTag && ticket.assetTag !== 'N/A' ? ` (${ticket.assetTag})` : ''}` : null) : null,
    urgencyLabel: type === 'created' ? (ticket.urgency || 'medium') : null,
    submitterEmail: type === 'created' ? (ticket.createdByEmail || null) : null,
    attachments: type === 'created' ? (ticket.attachments || []) : [],
    actorName,
    ticketUrl,
    isWaiting
  });

  const plainText = `${headline}\n\nTicket: ${ticketTitle} (${ticketNumber})\nSubmitted By: ${actorName} (${ticket.createdByEmail || ''})\nLocation: ${location} - Room: ${room}\nDepartment: ${department}\nStatus: ${statusLabel}\n\n${messageText}\n\nView & Reply: ${ticketUrl}`;

  // 1. Save in-app notification in Firestore for each recipient
  try {
    for (const singleEmail of emailList) {
      await addDoc(collection(db, 'notifications'), {
        recipientEmail: singleEmail,
        recipientName,
        subject,
        summary: messageText.slice(0, 160),
        ticketId: ticket.id,
        ticketNumber,
        ticketTitle,
        type,
        authorName: actorName,
        authorEmail: actor?.email || ticket.createdByEmail || null,
        read: false,
        createdAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.warn('[NotificationService] In-app notification write warning:', err);
  }

  // 2. Queue in Firestore 'mail' collection (for Firebase Trigger Email extension)
  try {
    await addDoc(collection(db, 'mail'), {
      to: emailList,
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

  // 3. Dispatch to Cloud Function (server-side relay avoids browser CORS blocks to Google Apps Script)
  try {
    const response = await fetch(CLOUD_FUNCTION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: normalizedTo,
        recipientName,
        subject,
        html: htmlBody,
        text: plainText,
        ticketNumber,
        ticketTitle,
        ticketId: ticket.id,
        type,
        authorName: actorName,
        authorEmail: actor?.email || ticket.createdByEmail,
        isInternal: false,
        webhookUrl: activeWebhookUrl
      })
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      console.log(`[NotificationService] Notification processed:`, data);
      return { 
        success: true, 
        deliveredTo: recipientEmail,
        webhookDispatched: data.webhookDispatched,
        webhookError: data.webhookError,
        message: data.message
      };
    } else {
      console.warn('[NotificationService] Dispatch response status:', response.status);
      return {
        success: false,
        error: `Cloud Function returned HTTP ${response.status}`
      };
    }
  } catch (netErr) {
    console.warn('[NotificationService] Cloud Function dispatch fallback:', netErr.message);
    return {
      success: false,
      error: netErr.message
    };
  }
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

/**
 * Plays a gentle two-tone notification chime using the browser's Web Audio API
 */
export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // First note (D5 - 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.26);

    // Second note (A5 - 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.14);
    gain2.gain.setValueAtTime(0.001, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.2, now + 0.17);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.56);
  } catch (err) {
    console.warn('[NotificationService] Audio chime skipped:', err.message);
  }
}

/**
 * Formats an ISO date string into a readable date/time
 */
function formatEventDateTime(isoStr) {
  if (!isoStr) return 'TBD';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Sends a consolidated email alert when new Incident IQ calendar event(s) are detected
 */
export async function sendCalendarEventNotification({
  groupedEvents = [],
  recipientEmails = '',
  webhookUrl = null
}) {
  const emailList = String(recipientEmails || '')
    .split(/[,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e && e.includes('@'));

  if (emailList.length === 0 || groupedEvents.length === 0) {
    return { success: false, skipped: true, reason: 'No recipients or events' };
  }

  const normalizedTo = emailList.join(', ');
  const activeWebhookUrl = (webhookUrl && webhookUrl.trim()) || DEFAULT_EMAIL_WEBHOOK_URL;
  const calendarPortalUrl = 'https://wca-tickets-58f6c.web.app/';

  const firstGroup = groupedEvents[0];
  const subject =
    groupedEvents.length === 1
      ? `[WCA Facility Calendar] New Event Scheduled: ${firstGroup.title}`
      : `[WCA Facility Calendar] ${groupedEvents.length} New Events Scheduled (${firstGroup.title} & more)`;

  const rowsHtml = groupedEvents
    .map(
      (g) => `
      <tr>
        <td style="padding: 12px 14px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-size: 14px; font-weight: 800; color: #0f172a;">
            ${g.title}
            ${g.count > 1 ? `<span style="display:inline-block;margin-left:6px;background:#fef3c7;color:#92400e;font-size:11px;padding:2px 8px;border-radius:999px;">+${g.count} dates</span>` : ''}
          </div>
          <div style="font-size: 12px; color: #475569; margin-top: 4px;">
            <strong>When:</strong> ${formatEventDateTime(g.firstStart)}${g.count > 1 ? ` (and ${g.count - 1} more upcoming date${g.count - 1 > 1 ? 's' : ''})` : ''}
          </div>
          <div style="font-size: 12px; color: #475569; margin-top: 2px;">
            <strong>Location:</strong> ${g.campus || 'Campus'} &bull; ${g.room || 'General Facility'}
            ${g.setup || g.breakdown ? ` &bull; <span style="color:#b45309;font-weight:600;">Setup: ${g.setup || 0}m / Breakdown: ${g.breakdown || 0}m</span>` : ''}
          </div>
        </td>
      </tr>`
    )
    .join('');

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background:linear-gradient(135deg,#0b1c2d 0%,#1e3a5f 100%);padding:24px 28px;border-bottom:4px solid #f59e0b;">
              <div style="color:#f59e0b;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">Wesleyan Christian Academy</div>
              <div style="color:#ffffff;font-size:20px;font-weight:800;">Facility &amp; Event Setup Calendar Alert</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:8px;">
                New Event${groupedEvents.length > 1 ? 's' : ''} Added to Incident IQ Schedule
              </div>
              <p style="font-size:13px;color:#64748b;margin-top:0;margin-bottom:20px;">
                The following new event${groupedEvents.length > 1 ? 's were' : ' was'} detected on the WCA Facility &amp; Setup Calendar:
              </p>
              <table width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:24px;border-collapse:collapse;">
                ${rowsHtml}
              </table>
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${calendarPortalUrl}" target="_blank" style="display:inline-block;background-color:#0b1c2d;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;border:1px solid #f59e0b;">
                      Open Facility Calendar in Helpdesk &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;padding:16px 28px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:#94a3b8;">
              You can mute or customize Calendar Event Alerts anytime in Helpdesk &rarr; Facility Calendar &rarr; Filter &amp; Alert Settings.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const plainText = groupedEvents
    .map((g) => `- ${g.title} (${formatEventDateTime(g.firstStart)}) @ ${g.campus} - ${g.room}`)
    .join('\n');

  try {
    const response = await fetch(CLOUD_FUNCTION_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: normalizedTo,
        recipientName: 'Calendar Administrator',
        subject,
        html: htmlBody,
        text: `New Calendar Event(s) Detected:\n\n${plainText}\n\nOpen Helpdesk: ${calendarPortalUrl}`,
        ticketNumber: 'CALENDAR',
        ticketTitle: firstGroup.title,
        type: 'calendar_new_event',
        authorName: 'Incident IQ Calendar Sync',
        isInternal: false,
        webhookUrl: activeWebhookUrl
      })
    });
    const data = await response.json().catch(() => ({}));
    return { success: response.ok, webhookDispatched: data.webhookDispatched };
  } catch (err) {
    console.warn('[NotificationService] Calendar email dispatch error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches live Incident IQ calendar events, compares with Firestore baseline,
 * and returns any newly added event groups (grouped by title+room to avoid recurring spam).
 */
export async function checkIncidentIqCalendarForNewEvents({
  viewId = '534e7bd4-91df-f111-bf5b-6045bdb05b62',
  alertSettings = DEFAULT_CALENDAR_ALERT_SETTINGS,
  webhookUrl = null,
  sendEmailIfEnabled = true
}) {
  try {
    const res = await fetch('https://wcatrojans.incidentiq.com/api/event/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        FilterByProduct: true,
        ViewId: viewId
      })
    });

    if (!res.ok) {
      throw new Error(`Incident IQ returned HTTP ${res.status}`);
    }

    const html = await res.text();
    const match = html.match(/id="eventData"\s+value="([^"]+)"/i);
    if (!match || !match[1]) {
      return { newGroups: [], totalEvents: 0 };
    }

    // Decode HTML entities inside the value attribute
    const txt = document.createElement('textarea');
    txt.innerHTML = match[1];
    const decodedJson = txt.value;
    const rawEvents = JSON.parse(decodedJson);

    if (!Array.isArray(rawEvents)) {
      return { newGroups: [], totalEvents: 0 };
    }

    const nowIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Normalize events and compute unique signatures
    const parsedEvents = rawEvents.map((ev) => {
      const firstRoom = ev.locationRooms && ev.locationRooms[0] ? ev.locationRooms[0] : {};
      const roomName = firstRoom.NameFormatted || firstRoom.Name || 'General Facility';
      const campusName = firstRoom.LocationName || 'WCA Campus';
      const title = (ev.title || 'Scheduled Event').trim();
      const start = ev.start || '';
      const end = ev.end || '';
      const sig = `${title}__${start}__${roomName}`;
      return {
        sig,
        title,
        start,
        end,
        room: roomName,
        campus: campusName,
        setup: ev.setup || 0,
        breakdown: ev.breakdown || 0
      };
    });

    const allSignatures = parsedEvents.map((e) => e.sig);

    // Load baseline from Firestore settings/calendar_sync
    const syncRef = doc(db, 'settings', 'calendar_sync');
    const syncSnap = await getDoc(syncRef);

    if (!syncSnap.exists() || syncSnap.data()?.viewId !== viewId || !Array.isArray(syncSnap.data()?.knownSignatures)) {
      // First-time baseline seed for this ViewId — save without alerting on existing events
      await setDoc(syncRef, {
        viewId,
        knownSignatures: allSignatures.slice(-1500),
        totalEvents: parsedEvents.length,
        lastCheckedAt: serverTimestamp(),
        seededAt: serverTimestamp()
      }, { merge: true });

      return { newGroups: [], totalEvents: parsedEvents.length, initialSeed: true };
    }

    const knownSet = new Set(syncSnap.data().knownSignatures || []);
    // Only alert on newly added upcoming/recent events
    const newlyAdded = parsedEvents.filter(
      (ev) => !knownSet.has(ev.sig) && (!ev.start || ev.start >= nowIso)
    );

    if (newlyAdded.length === 0) {
      // Keep baseline up to date if any past events were added
      if (allSignatures.some((s) => !knownSet.has(s))) {
        const merged = Array.from(new Set([...knownSet, ...allSignatures])).slice(-1500);
        await setDoc(syncRef, {
          viewId,
          knownSignatures: merged,
          totalEvents: parsedEvents.length,
          lastCheckedAt: serverTimestamp()
        }, { merge: true });
      }
      return { newGroups: [], totalEvents: parsedEvents.length };
    }

    // Immediately persist updated baseline so other open tabs/admins don't duplicate email alerts
    const updatedSignatures = Array.from(new Set([...knownSet, ...allSignatures])).slice(-1500);
    await setDoc(syncRef, {
      viewId,
      knownSignatures: updatedSignatures,
      totalEvents: parsedEvents.length,
      lastCheckedAt: serverTimestamp(),
      lastNewEventDetectedAt: serverTimestamp()
    }, { merge: true });

    // Group recurring instances by Title + Campus + Room so 15 recurring dates become 1 clean alert
    const groupMap = new Map();
    for (const ev of newlyAdded) {
      const groupKey = `${ev.title.toLowerCase()}__${ev.campus}__${ev.room}`;
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          id: ev.sig,
          title: ev.title,
          campus: ev.campus,
          room: ev.room,
          firstStart: ev.start,
          firstEnd: ev.end,
          setup: ev.setup,
          breakdown: ev.breakdown,
          count: 1
        });
      } else {
        const existing = groupMap.get(groupKey);
        existing.count += 1;
        if (ev.start && (!existing.firstStart || ev.start < existing.firstStart)) {
          existing.firstStart = ev.start;
          existing.firstEnd = ev.end;
        }
      }
    }

    const newGroups = Array.from(groupMap.values());

    // Send email if enabled
    if (sendEmailIfEnabled && alertSettings?.emailEnabled && alertSettings?.notifyEmails?.trim()) {
      await sendCalendarEventNotification({
        groupedEvents: newGroups,
        recipientEmails: alertSettings.notifyEmails,
        webhookUrl
      });
    }

    return { newGroups, totalEvents: parsedEvents.length };
  } catch (err) {
    console.warn('[NotificationService] Calendar sync check warning:', err.message);
    return { newGroups: [], totalEvents: 0, error: err.message };
  }
}
