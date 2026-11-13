const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

// Shared secret token to secure webhook calls from Google Apps Script
const INBOUND_SECRET = "wca-helpdesk-inbound-secret-2026";

exports.inboundEmailTicket = onRequest(
  { cors: true, timeoutSeconds: 60, memory: "512MiB" },
  async (req, res) => {
    // 1. Verify Method
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    // 2. Verify Secret Token
    const clientSecret = req.headers["x-inbound-secret"] || req.query.secret;
    if (clientSecret !== INBOUND_SECRET) {
      return res.status(401).json({ error: "Unauthorized. Invalid secret token." });
    }

    try {
      const {
        senderEmail,
        senderName,
        subject,
        body,
        department = "itsm",
        attachments = [] // Array of { name: string, mimeType: string, base64: string }
      } = req.body;

      if (!senderEmail || !subject) {
        return res.status(400).json({ error: "Missing required fields (senderEmail or subject)." });
      }

      // 3. Process attachments and upload to Firebase Cloud Storage
      const uploadedAttachments = [];
      const bucket = storage.bucket();

      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i];
        if (att.base64 && att.name) {
          try {
            const buffer = Buffer.from(att.base64, "base64");
            const safeName = att.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const filePath = `tickets/email_${Date.now()}_${i}_${safeName}`;
            const file = bucket.file(filePath);

            await file.save(buffer, {
              contentType: att.mimeType || "application/octet-stream"
            });

            const [url] = await file.getSignedUrl({
              action: "read",
              expires: "01-01-2035"
            });

            uploadedAttachments.push({
              name: att.name,
              url: url,
              size: `${(buffer.length / 1024).toFixed(0)} KB`
            });
          } catch (fileErr) {
            console.warn("Could not save attachment:", att.name, fileErr);
          }
        }
      }

      // 4. Construct Firestore ticket document
      const ticketNum = `TICK-${Date.now().toString().slice(-6)}`;
      const requesterName = senderName ? senderName.trim() : senderEmail.split("@")[0];
      const requesterEmail = senderEmail.trim().toLowerCase();

      const newTicket = {
        ticketNumber: ticketNum,
        title: subject.trim(),
        description: body ? body.trim() : "(No body text provided)",
        areaId: "itsm",
        areaName: "Technology Support",
        department: "itsm",
        status: "new",
        urgency: "medium",
        building: "Submitted via Email",
        roomLocation: "Inbound Email",
        assetType: "Email Support Request",
        assetTag: "N/A",
        selectedIssue: "Inbound Email Request",
        createdByName: requesterName,
        createdByEmail: requesterEmail,
        createdByPhoto: null,
        createdById: "email_inbound",
        requester: {
          uid: null,
          email: requesterEmail,
          name: requesterName,
          source: "email"
        },
        attachments: uploadedAttachments,
        statusHistory: [
          {
            status: "new",
            timestamp: new Date().toISOString(),
            updatedBy: `Email (${requesterEmail})`,
            note: "Ticket auto-created from inbound email"
          }
        ],
        workNotes: [
          {
            author: "System (Email Gateway)",
            text: `Ticket auto-created from inbound email sent by ${requesterEmail}`,
            timestamp: new Date().toISOString()
          }
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await db.collection("tickets").add(newTicket);

      return res.status(200).json({
        success: true,
        ticketId: docRef.id,
        message: `Ticket ${docRef.id} successfully created.`
      });
    } catch (err) {
      console.error("Error creating inbound email ticket:", err);
      return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
  }
);
