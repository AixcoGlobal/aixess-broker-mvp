// Vercel Serverless Function to receive leads and dispatch notification & confirmation emails via Resend

const CONFIRMATION_COPY = {
  en: {
    salutation: "Dear",
    referenceLabel: "Reference Number",
    brokerTitle: "Broker Access Registration Received",
    materialsTitle: "Project Materials Request Received",
    brokerOpening: "Thank you for registering for AiXESS Broker Access. We have successfully received your credentials and application.",
    materialsOpening: "Thank you for your interest in AiXESS projects. We have successfully received your request for project materials and investor documentation.",
    nextStepsTitle: "Next Steps",
    nextSteps: "A dedicated AiXESS partnership advisor is reviewing your request and will reach out shortly with your access credentials and confidential materials.",
    detailsTitle: "Summary of Request",
    leadTypeLabel: "Request Type",
    brokerType: "Broker Access Registration",
    materialsType: "Project Materials & Documentation",
    nameLabel: "Name",
    emailLabel: "Email",
    phoneLabel: "Phone",
    companyLabel: "Agency / Company",
    automatedNotice: "This is an automated confirmation from AiXESS. Please do not reply directly to this message. For assistance, reach out to info@aixess.global.",
    team: "The AiXESS Team",
  },
  de: {
    salutation: "Guten Tag",
    referenceLabel: "Referenznummer",
    brokerTitle: "Maklerregistrierung eingegangen",
    materialsTitle: "Projektunterlagen-Anfrage eingegangen",
    brokerOpening: "Vielen Dank für Ihre Registrierung zum AiXESS Maklerzugang. Wir haben Ihre Daten erfolgreich erhalten.",
    materialsOpening: "Vielen Dank für Ihr Interesse an den AiXESS Projekten. Ihre Anfrage für Projektunterlagen und Investorendokumentation ist eingegangen.",
    nextStepsTitle: "Nächste Schritte",
    nextSteps: "Ein persönlicher AiXESS Kundenberater prüft Ihre Angaben und wird sich in Kürze mit den Zugangsdaten und Unterlagen bei Ihnen melden.",
    detailsTitle: "Zusammenfassung der Anfrage",
    leadTypeLabel: "Anfrageart",
    brokerType: "Makler-Registrierung",
    materialsType: "Projektunterlagen & Dokumentation",
    nameLabel: "Name",
    emailLabel: "E-Mail",
    phoneLabel: "Telefon",
    companyLabel: "Agentur / Unternehmen",
    automatedNotice: "Dies ist eine automatische Bestätigung von AiXESS. Bei Fragen wenden Sie sich bitte an info@aixess.global.",
    team: "Ihr AiXESS Team",
  },
  pl: {
    salutation: "Szanowny/a",
    referenceLabel: "Numer zgłoszenia",
    brokerTitle: "Rejestracja brokera została przyjęta",
    materialsTitle: "Zapytanie o materiały projektowe przyjęte",
    brokerOpening: "Dziękujemy za rejestrację w programie brokerskim AiXESS. Pomyślnie otrzymaliśmy Twoje zgłoszenie.",
    materialsOpening: "Dziękujemy za zainteresowanie projektami AiXESS. Pomyślnie otrzymaliśmy prośbę o materiały projektowe i dokumentację inwestorską.",
    nextStepsTitle: "Kolejne kroki",
    nextSteps: "Doradca AiXESS weryfikuje zgłoszenie i wkrótce skontaktuje się w celu przekazania dokumentacji i szczegółów dostępu.",
    detailsTitle: "Podsumowanie zgłoszenia",
    leadTypeLabel: "Typ zapytania",
    brokerType: "Rejestracja brokera",
    materialsType: "Materiały projektowe i dokumentacja",
    nameLabel: "Imię i nazwisko",
    emailLabel: "E-mail",
    phoneLabel: "Telefon",
    companyLabel: "Agencja / Firma",
    automatedNotice: "To jest automatyczne potwierdzenie z serwisu AiXESS. W razie pytań prosimy o kontakt pod adresem info@aixess.global.",
    team: "Zespół AiXESS",
  },
  sl: {
    salutation: "Spoštovani",
    referenceLabel: "Referenčna številka",
    brokerTitle: "Registracija posrednika sprejeta",
    materialsTitle: "Zahteva za projektna gradiva sprejeta",
    brokerOpening: "Hvala za vašo registracijo za posredniški dostop AiXESS. Vašo prijavo smo uspešno prejeli.",
    materialsOpening: "Hvala za vaše zanimanje za projekte AiXESS. Vašo zahtevo za gradiva in dokumentacijo smo uspešno prejeli.",
    nextStepsTitle: "Naslednji koraki",
    nextSteps: "Svetovalec AiXESS bo pregledal vašo zahtevo in vas kmalu kontaktiral z vsemi podrobnostmi.",
    detailsTitle: "Povzetek zahteve",
    leadTypeLabel: "Vrsta zahteve",
    brokerType: "Registracija posrednika",
    materialsType: "Projektna gradiva in dokumentacija",
    nameLabel: "Ime in priimek",
    emailLabel: "E-pošta",
    phoneLabel: "Telefon",
    companyLabel: "Agencija / Podjetje",
    automatedNotice: "To je samodejno potrditveno sporočilo AiXESS. Za vprašanja nam pišite na info@aixess.global.",
    team: "Ekipa AiXESS",
  },
  ru: {
    salutation: "Здравствуйте,",
    referenceLabel: "Номер заявки",
    brokerTitle: "Регистрация брокера принята",
    materialsTitle: "Запрос материалов проекта принят",
    brokerOpening: "Благодарим за регистрацию в брокерской программе AiXESS. Мы успешно получили ваши данные.",
    materialsOpening: "Благодарим за интерес к проектам AiXESS. Мы успешно получили ваш запрос на проектные материалы и инвестиционную документацию.",
    nextStepsTitle: "Следующие шаги",
    nextSteps: "Специалист AiXESS проверяет вашу заявку и свяжется с вами в ближайшее время для предоставления доступа и материалов.",
    detailsTitle: "Данные заявки",
    leadTypeLabel: "Тип запроса",
    brokerType: "Регистрация брокера",
    materialsType: "Материалы проекта и документация",
    nameLabel: "Имя",
    emailLabel: "Электронная почта",
    phoneLabel: "Телефон",
    companyLabel: "Агентство / Компания",
    automatedNotice: "Это автоматическое уведомление от AiXESS. По всем вопросам обращайтесь на info@aixess.global.",
    team: "Команда AiXESS",
  },
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildLeadNotificationHtml({ resolvedName, email, phone, company, locale, kind, submittedDate, referenceCode }) {
  const isMaterials = kind === "materials";
  const leadTypeTitle = isMaterials ? "Project Materials Access Request" : "New Broker Registration";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>AiXESS · Lead Notification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #141211; margin: 0; padding: 24px; color: #efefec;">
  <div style="max-width: 600px; margin: 0 auto; background: #1b1716; border: 1px solid #2e2a28; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
    <div style="background: #141211; padding: 28px 32px; border-bottom: 2px solid #f16510; text-align: left;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #f16510; margin-bottom: 6px;">AiXESS Global · Internal Notification</div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.05em; color: #ffffff;">${leadTypeTitle}</h1>
      <p style="margin: 6px 0 0; color: #8e8e89; font-size: 13px;">Ref: ${referenceCode}</p>
    </div>
    <div style="padding: 32px;">
      <div style="display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 24px; background: rgba(241, 101, 16, 0.15); color: #f16510; border: 1px solid rgba(241, 101, 16, 0.3);">${leadTypeTitle}</div>
      
      <div style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #2e2a28;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #8e8e89; letter-spacing: 0.06em; margin-bottom: 4px;">Full Name</div>
        <div style="font-size: 16px; font-weight: 600; color: #ffffff;">${escapeHtml(resolvedName)}</div>
      </div>
      <div style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #2e2a28;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #8e8e89; letter-spacing: 0.06em; margin-bottom: 4px;">Email Address</div>
        <div style="font-size: 16px; font-weight: 500; color: #ffffff;"><a href="mailto:${escapeHtml(email)}" style="color: #f16510; text-decoration: none;">${escapeHtml(email)}</a></div>
      </div>
      <div style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #2e2a28;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #8e8e89; letter-spacing: 0.06em; margin-bottom: 4px;">Phone Number</div>
        <div style="font-size: 16px; font-weight: 500; color: #ffffff;">${escapeHtml(phone || "Not provided")}</div>
      </div>
      <div style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #2e2a28;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #8e8e89; letter-spacing: 0.06em; margin-bottom: 4px;">Company / Agency</div>
        <div style="font-size: 16px; font-weight: 500; color: #ffffff;">${escapeHtml(company || "Not provided")}</div>
      </div>
      <div style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #2e2a28;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #8e8e89; letter-spacing: 0.06em; margin-bottom: 4px;">Interface Language</div>
        <div style="font-size: 16px; font-weight: 500; color: #ffffff;">${escapeHtml(locale.toUpperCase())}</div>
      </div>
      <div style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #2e2a28;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #8e8e89; letter-spacing: 0.06em; margin-bottom: 4px;">Submission Timestamp</div>
        <div style="font-size: 14px; font-weight: 500; color: #8e8e89;">${submittedDate}</div>
      </div>
    </div>
    <div style="padding: 20px 32px; background: #141211; border-top: 1px solid #2e2a28; font-size: 12px; color: #8e8e89; text-align: center;">
      Lead dispatched from <a href="https://aixess.global" style="color: #f16510; text-decoration: none;">aixess.global</a>. Reply directly to this email to contact the lead.
    </div>
  </div>
</body>
</html>`;
}

function buildUserConfirmationHtml({ resolvedName, email, phone, company, locale, kind, referenceCode }) {
  const lang = CONFIRMATION_COPY[locale] ? locale : "en";
  const copy = CONFIRMATION_COPY[lang];
  const isMaterials = kind === "materials";
  const title = isMaterials ? copy.materialsTitle : copy.brokerTitle;
  const opening = isMaterials ? copy.materialsOpening : copy.brokerOpening;
  const leadTypeName = isMaterials ? copy.materialsType : copy.brokerType;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #141211; margin: 0; padding: 24px 12px; color: #1b1716;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.35);">
    
    <!-- AiXESS Brand Header -->
    <div style="background-color: #1b1716; padding: 36px 32px; text-align: center; border-bottom: 3px solid #f16510;">
      <a href="https://aixess.global" target="_blank" style="text-decoration: none; display: inline-block;">
        <img src="https://aixess.global/brand/aixess-logo-white.png" alt="AiXESS" width="160" style="display: block; margin: 0 auto; max-width: 160px; height: auto; border: 0;" />
      </a>
      <div style="margin-top: 10px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #8e8e89;">Selected Prime Opportunities</div>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 36px;">
      
      <!-- Reference Code Box -->
      <div style="background-color: #fcfcfb; border: 1px solid #e5e5e2; border-left: 4px solid #f16510; padding: 18px 24px; margin-bottom: 32px; border-radius: 4px;">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #8e8e89; margin-bottom: 4px;">${escapeHtml(copy.referenceLabel)}</div>
        <div style="font-size: 22px; font-weight: 700; letter-spacing: 0.05em; color: #1b1716;">${escapeHtml(referenceCode)}</div>
      </div>

      <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #1b1716; line-height: 1.3;">${escapeHtml(title)}</h1>
      
      <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.65; color: #3a3836;">
        ${escapeHtml(copy.salutation)} <strong>${escapeHtml(resolvedName)}</strong>,
      </p>

      <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.65; color: #3a3836;">
        ${escapeHtml(opening)}
      </p>

      <!-- Details Summary -->
      <div style="background: #fafaf8; border: 1px solid #efefec; border-radius: 6px; padding: 20px 24px; margin: 28px 0;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8e8e89; margin-bottom: 14px;">${escapeHtml(copy.detailsTitle)}</div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #8e8e89; width: 40%; font-weight: 500;">${escapeHtml(copy.leadTypeLabel)}</td>
            <td style="padding: 6px 0; color: #1b1716; font-weight: 600;">${escapeHtml(leadTypeName)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #8e8e89; font-weight: 500;">${escapeHtml(copy.emailLabel)}</td>
            <td style="padding: 6px 0; color: #1b1716; font-weight: 600;">${escapeHtml(email)}</td>
          </tr>
          ${phone ? `
          <tr>
            <td style="padding: 6px 0; color: #8e8e89; font-weight: 500;">${escapeHtml(copy.phoneLabel)}</td>
            <td style="padding: 6px 0; color: #1b1716; font-weight: 600;">${escapeHtml(phone)}</td>
          </tr>` : ""}
          ${company ? `
          <tr>
            <td style="padding: 6px 0; color: #8e8e89; font-weight: 500;">${escapeHtml(copy.companyLabel)}</td>
            <td style="padding: 6px 0; color: #1b1716; font-weight: 600;">${escapeHtml(company)}</td>
          </tr>` : ""}
        </table>
      </div>

      <!-- Next Steps -->
      <div style="margin: 28px 0; padding: 20px 24px; border-left: 3px solid #1b1716; background: #fbfbfa;">
        <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #1b1716; margin-bottom: 6px;">${escapeHtml(copy.nextStepsTitle)}</div>
        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4a4744;">${escapeHtml(copy.nextSteps)}</p>
      </div>

      <!-- Signoff -->
      <div style="margin-top: 36px; padding-top: 24px; border-top: 1px solid #efefec;">
        <p style="margin: 0; font-size: 16px; font-weight: 700; color: #1b1716;">${escapeHtml(copy.team)}</p>
        <p style="margin: 4px 0 0; font-size: 13px; color: #8e8e89;">AiXESS Global</p>
        <p style="margin: 10px 0 0; font-size: 13px;">
          <a href="https://aixess.global" style="color: #f16510; text-decoration: none; font-weight: 600;">www.aixess.global</a>
          <span style="color: #d6d6d6; margin: 0 6px;">•</span>
          <a href="mailto:info@aixess.global" style="color: #f16510; text-decoration: none; font-weight: 600;">info@aixess.global</a>
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #1b1716; padding: 28px 32px; text-align: center; color: #8e8e89; font-size: 12px; line-height: 1.6;">
      <p style="margin: 0 0 10px;">${escapeHtml(copy.automatedNotice)}</p>
      <p style="margin: 0; color: #5f5f5c;">© ${new Date().getFullYear()} AiXESS Global. All rights reserved.</p>
    </div>

  </div>
</body>
</html>`;
}

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
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      return res.status(500).json({ error: "Email service not configured" });
    }

    // Sender configuration - defaults to AiXESS
    const notificationFrom = process.env.LEAD_NOTIFICATION_FROM || "AiXESS <notifications@aixess.global>";

    // Generate unique reference code
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const referenceCode = `AXS-2026-${randomDigits}`;
    const submittedDate = new Date().toUTCString();

    const isMaterials = kind === "materials";
    const leadTypeTitle = isMaterials ? "Project Materials Access Request" : "New Broker Registration";

    // 1. Prepare Admin Notification Email (Strictly to info@aixess.global ONLY)
    const adminNotificationHtml = buildLeadNotificationHtml({
      resolvedName,
      email,
      phone,
      company,
      locale,
      kind,
      submittedDate,
      referenceCode,
    });

    const adminNotificationText = `
AiXESS - New Lead Notification
-------------------------------
Reference: ${referenceCode}
Type: ${leadTypeTitle}
Name: ${resolvedName}
Email: ${email}
Phone: ${phone || "Not provided"}
Company: ${company || "Not provided"}
Language: ${locale.toUpperCase()}
Date: ${submittedDate}

Reply directly to this email to contact the lead.
`;

    // 2. Prepare User Confirmation Email (Sent to submitter in their locale with AiXESS styling)
    const userConfirmationHtml = buildUserConfirmationHtml({
      resolvedName,
      email,
      phone,
      company,
      locale,
      kind,
      referenceCode,
    });

    const userLang = CONFIRMATION_COPY[locale] ? locale : "en";
    const userCopy = CONFIRMATION_COPY[userLang];
    const userSubject = `[${referenceCode}] ${isMaterials ? userCopy.materialsTitle : userCopy.brokerTitle}`;

    const userConfirmationText = `
${isMaterials ? userCopy.materialsTitle : userCopy.brokerTitle}
Reference: ${referenceCode}

${userCopy.salutation} ${resolvedName},

${isMaterials ? userCopy.materialsOpening : userCopy.brokerOpening}

${userCopy.nextStepsTitle}:
${userCopy.nextSteps}

${userCopy.team}
AiXESS Global
www.aixess.global | info@aixess.global
`;

    // Dispatch messages
    const emailsToDispatch = [
      {
        channel: "admin_notification",
        to: "info@aixess.global",
        reply_to: email,
        subject: `[AiXESS Lead] ${leadTypeTitle}: ${resolvedName} (${referenceCode})`,
        html: adminNotificationHtml,
        text: adminNotificationText,
      },
      {
        channel: "user_confirmation",
        to: email,
        reply_to: "info@aixess.global",
        subject: userSubject,
        html: userConfirmationHtml,
        text: userConfirmationText,
      },
    ];

    const sendResults = await Promise.allSettled(
      emailsToDispatch.map(async (msg) => {
        // Attempt dispatch with configured sender
        let res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: notificationFrom,
            to: [msg.to],
            reply_to: msg.reply_to,
            subject: msg.subject,
            html: msg.html,
            text: msg.text,
          }),
        });

        let data = await res.json();

        // If from domain is unverified in Resend, fall back to default verified domain if available so user request succeeds
        if (!res.ok && data?.message && data.message.includes("not verified")) {
          const fallbackFrom = "AiXESS <notifications@send.aixco.global>";
          console.warn(`Sender ${notificationFrom} unverified, retrying with fallback.`);
          res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fallbackFrom,
              to: [msg.to],
              reply_to: msg.reply_to,
              subject: msg.subject,
              html: msg.html,
              text: msg.text,
            }),
          });
          data = await res.json();
        }

        return { ok: res.ok, status: res.status, channel: msg.channel, recipient: msg.to, data };
      })
    );

    const successful = sendResults
      .filter((r) => r.status === "fulfilled" && r.value.ok)
      .map((r) => ({ channel: r.value.channel, recipient: r.value.recipient, id: r.value.data.id }));

    return res.status(200).json({
      saved: true,
      reference: referenceCode,
      dispatched: successful,
    });
  } catch (error) {
    console.error("Unhandled error in /api/leads:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
