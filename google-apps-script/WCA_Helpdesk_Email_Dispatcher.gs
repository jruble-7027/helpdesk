/**
 * Wesleyan Christian Academy — Helpdesk Email Webhook & Notification Dispatcher
 * Google Apps Script for Google Workspace (@wcatrojans.org)
 *
 * Capabilities:
 * 1. Inbound Email: Checks designated inbox (e.g., it-tickets@wcatrojans.org) and POSTs to Firebase.
 * 2. Outbound Email: Receives POST webhook from WCA Helpdesk and delivers authentic HTML emails via Gmail / MailApp.
 */

// Shared secret token configured in Firebase Cloud Functions
var WEBHOOK_SECRET = "wca-helpdesk-inbound-secret-2026";

// Firebase Cloud Function URL for inbound tickets
var FIREBASE_INBOUND_URL = "https://us-central1-wca-tickets-58f6c.cloudfunctions.net/inboundEmailTicket";

/**
 * Handles Outbound Notification Requests from the WCA Helpdesk Portal
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // Verify secret token if present
    if (data.token && data.token !== WEBHOOK_SECRET) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "send_email" || data.to) {
      var recipient = data.to;
      var subject = data.subject || "WCA Helpdesk Ticket Update";
      var htmlBody = data.htmlBody || data.html;
      var textBody = data.textBody || data.text || "You have a new update on your WCA Helpdesk ticket.";

      // Send email directly from Google Workspace
      MailApp.sendEmail({
        to: recipient,
        subject: subject,
        htmlBody: htmlBody,
        body: textBody,
        name: "WCA Helpdesk"
      });

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        sentTo: recipient,
        subject: subject
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ error: "Unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      error: "Error processing email dispatch",
      details: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Periodically checks Gmail for new tickets sent to it-tickets@wcatrojans.org
 * (Set this function on a 1-minute or 5-minute time-driven trigger)
 */
function processInboundHelpdeskEmails() {
  var query = 'to:it-tickets@wcatrojans.org is:unread';
  var threads = GmailApp.search(query, 0, 10);

  for (var t = 0; t < threads.length; t++) {
    var messages = threads[t].getMessages();
    for (var m = 0; m < messages.length; m++) {
      var msg = messages[m];
      if (msg.isUnread()) {
        var sender = msg.getFrom();
        var senderEmail = sender;
        var senderName = "";

        var match = sender.match(/(.*)<(.*)>/);
        if (match) {
          senderName = match[1].trim().replace(/['"]/g, '');
          senderEmail = match[2].trim();
        }

        var subject = msg.getSubject() || "(No Subject)";
        var body = msg.getPlainBody();
        var attachments = msg.getAttachments();
        var attList = [];

        for (var a = 0; a < attachments.length; a++) {
          var att = attachments[a];
          attList.push({
            name: att.getName(),
            mimeType: att.getContentType(),
            base64: Utilities.base64Encode(att.getBytes())
          });
        }

        // Post to Firebase Inbound Function
        var payload = {
          senderEmail: senderEmail,
          senderName: senderName,
          subject: subject,
          body: body,
          department: "itsm",
          attachments: attList
        };

        var options = {
          method: "post",
          contentType: "application/json",
          headers: {
            "x-inbound-secret": WEBHOOK_SECRET
          },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        };

        var response = UrlFetchApp.fetch(FIREBASE_INBOUND_URL, options);
        if (response.getResponseCode() === 200) {
          msg.markRead();
          msg.star();
        }
      }
    }
  }
}
