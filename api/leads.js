// Vercel Serverless Function to receive leads and dispatch notification emails via Resend

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: "Invalid JSON" });
      }
    }

    const {
      name,
      firstName,
      surname,
      email,
      phone,
      company,
      website,
      locale = "en",
      kind = "broker",
    } = body || {};

    // Anti-spam honeypot
    if (website) {
      return res.status(200).json({ saved: true, spam: true });
    }

    const resolvedName = (name || `${firstName || ""} ${surname || ""}`).trim();
    if (!resolvedName || !email || !email.includes("@")) {
      return res.status(400).json({ error: "Name and valid email are required" });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const notificationTo = process.env.LEAD_NOTIFICATION_TO || "info@aixess.global";
    const recipients = notificationTo.split(",").map((e) => e.trim()).filter(Boolean);
    const notificationFrom = process.env.LEAD_NOTIFICATION_FROM || "AiXESS <notifications@send.aixco.global>";

    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      return res.status(500).json({ error: "Email service not configured" });
    }

    const isMaterials = kind === "materials";
    const leadTypeTitle = isMaterials ? "Project Materials Access Request" : "New Broker Registration";
    const subject = `[AiXESS Lead] ${leadTypeTitle}: ${resolvedName}`;
    const submittedDate = new Date().toUTCString();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f8; margin: 0; padding: 24px; color: #171a1d; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e7; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .header { background: #0c1015; padding: 28px 32px; border-bottom: 2px solid #2563eb; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.05em; color: #ffffff; text-transform: uppercase; }
    .header p { margin: 6px 0 0; color: #94a3b8; font-size: 13px; letter-spacing: 0.02em; }
    .content { padding: 32px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 20px; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .field-row { margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9; }
    .field-row:last-child { border-bottom: none; }
    .label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.04em; margin-bottom: 4px; }
    .value { font-size: 16px; font-weight: 500; color: #0f172a; word-break: break-word; }
    .value a { color: #2563eb; text-decoration: none; }
    .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AiXESS · New Lead</h1>
      <p>Submitted via aixess.global</p>
    </div>
    <div class="content">
      <div class="badge">${leadTypeTitle}</div>
      <div class="field-row">
        <div class="label">Full Name</div>
        <div class="value"><strong>${resolvedName}</strong></div>
      </div>
      <div class="field-row">
        <div class="label">Email Address</div>
        <div class="value"><a href="mailto:${email}">${email}</a></div>
      </div>
      <div class="field-row">
        <div class="label">Phone Number</div>
        <div class="value"><a href="tel:${phone || ""}">${phone || "Not provided"}</a></div>
      </div>
      <div class="field-row">
        <div class="label">Company / Agency</div>
        <div class="value">${company || "Not provided"}</div>
      </div>
      <div class="field-row">
        <div class="label">Interface Language</div>
        <div class="value">${locale.toUpperCase()}</div>
      </div>
      <div class="field-row">
        <div class="label">Submission Time</div>
        <div class="value">${submittedDate}</div>
      </div>
    </div>
    <div class="footer">
      This is an automated lead notification from AiXESS (aixess.global). You can reply directly to this email to contact the broker.
    </div>
  </div>
</body>
</html>
`;

    const text = `
AiXESS - New Lead Notification
-------------------------------
Type: ${leadTypeTitle}
Name: ${resolvedName}
Email: ${email}
Phone: ${phone || "Not provided"}
Company: ${company || "Not provided"}
Language: ${locale.toUpperCase()}
Date: ${submittedDate}

Reply directly to this email to contact the lead.
`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: notificationFrom,
        to: recipients,
        reply_to: email,
        subject,
        html,
        text,
      }),
    });

    const resendData = await resendRes.json();
    if (!resendRes.ok) {
      console.error("Resend API error:", resendData);
      return res.status(resendRes.status).json({ error: resendData.message || "Failed to send email" });
    }

    return res.status(200).json({ saved: true, id: resendData.id });
  } catch (error) {
    console.error("Unhandled error in /api/leads:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
