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
    ctaButton: "Explore AiXESS Global",
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
    ctaButton: "AiXESS Global entdecken",
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
    ctaButton: "Odkryj AiXESS Global",
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
    nameLabel: "Imię in priimek",
    emailLabel: "E-pošta",
    phoneLabel: "Telefon",
    companyLabel: "Agencija / Podjetje",
    automatedNotice: "To je samodejno potrditveno sporočilo AiXESS. Za vprašanja nam pišite na info@aixess.global.",
    ctaButton: "Raziščite AiXESS Global",
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
    ctaButton: "Перейти на AiXESS Global",
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
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>AiXESS · Lead Notification</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      color-scheme: light only;
      supported-color-schemes: light only;
    }
    body, table, td, p, a, div { font-family: 'Gilroy', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important; }
  </style>
</head>
<body style="font-family: 'Gilroy', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6fb; margin: 0; padding: 28px 12px; color: #171a1d; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #dce7f0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(37, 87, 214, 0.08);">
    
    <!-- AiXESS Brand Header (Royal Cobalt Blue #2557d6) -->
    <div style="background-color: #2557d6; background: #2557d6; background-image: linear-gradient(#2557d6, #2557d6); padding: 28px 32px; border-bottom: 3px solid #1b45b0; text-align: left;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td>
            <a href="https://aixess.global" target="_blank" style="text-decoration: none; display: inline-block;">
              <img src="https://aixess.global/brand/aixess-logo-white.png" alt="AiXESS" width="145" style="display: block; max-width: 145px; height: auto; border: 0;" />
            </a>
          </td>
          <td style="text-align: right; vertical-align: middle;">
            <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #dbe7ff; background: rgba(255, 255, 255, 0.15); padding: 4px 10px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.25);">Internal</span>
          </td>
        </tr>
      </table>
      <div style="margin-top: 18px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.02em; color: #ffffff;">${leadTypeTitle}</h1>
        <p style="margin: 6px 0 0; color: #dbe7ff; font-size: 13px; font-family: monospace, 'Gilroy', sans-serif;">Ref: ${referenceCode}</p>
      </div>
    </div>

    <!-- Lead Info -->
    <div style="padding: 32px 32px 24px;">
      <div style="display: inline-block; padding: 5px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 24px; background: #f0f5ff; color: #2557d6; border: 1px solid #c4d8fc;">
        ${leadTypeTitle}
      </div>

      <div style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #eef2f6;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.08em; margin-bottom: 4px;">Full Name</div>
        <div style="font-size: 16px; font-weight: 700; color: #171a1d;">${escapeHtml(resolvedName)}</div>
      </div>

      <div style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #eef2f6;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.08em; margin-bottom: 4px;">Email Address</div>
        <div style="font-size: 16px; font-weight: 600; color: #2557d6;"><a href="mailto:${escapeHtml(email)}" style="color: #2557d6; text-decoration: none;">${escapeHtml(email)}</a></div>
      </div>

      <div style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #eef2f6;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.08em; margin-bottom: 4px;">Phone Number</div>
        <div style="font-size: 15px; font-weight: 500; color: #171a1d;">${escapeHtml(phone || "Not provided")}</div>
      </div>

      <div style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #eef2f6;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.08em; margin-bottom: 4px;">Company / Agency</div>
        <div style="font-size: 15px; font-weight: 500; color: #171a1d;">${escapeHtml(company || "Not provided")}</div>
      </div>

      <div style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #eef2f6;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.08em; margin-bottom: 4px;">Interface Language</div>
        <div style="font-size: 15px; font-weight: 600; color: #171a1d;">${escapeHtml(locale.toUpperCase())}</div>
      </div>

      <div style="margin-bottom: 12px; padding-bottom: 14px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.08em; margin-bottom: 4px;">Submission Timestamp</div>
        <div style="font-size: 13px; font-weight: 500; color: #64748b;">${submittedDate}</div>
      </div>

      <!-- Action Reply Button (Matching AiXESS website button style & exact #2557d6 blue) -->
      <div style="margin: 24px 0 8px; text-align: left;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
          <tr>
            <td bgcolor="#2557d6" style="background-color: #2557d6; background: #2557d6; background-image: linear-gradient(#2557d6, #2557d6); border: 1px solid #2557d6; border-radius: 0px;">
              <a href="mailto:${escapeHtml(email)}?subject=${encodeURIComponent(`Re: ${referenceCode} - ${leadTypeTitle}`)}" style="display: inline-block; padding: 14px 28px; font-family: 'Gilroy', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #ffffff !important; text-decoration: none; line-height: 1.2;">
                Reply to ${escapeHtml(resolvedName)} &nbsp;&rarr;
              </a>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
      Lead received from <a href="https://aixess.global" style="color: #2557d6; text-decoration: none; font-weight: 600;">aixess.global</a>. Reply directly to this message to contact the lead.
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
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      color-scheme: light only;
      supported-color-schemes: light only;
    }
    body, table, td, p, a, div { font-family: 'Gilroy', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important; }
  </style>
</head>
<body style="font-family: 'Gilroy', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6fb; margin: 0; padding: 32px 12px; color: #171a1d; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #dce7f0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 24px rgba(37, 87, 214, 0.08);">
    
    <!-- AiXESS Brand Header (Image Banner locked to exact #2557d6 cobalt blue) -->
    <div style="background-color: #2557d6; background: #2557d6; background-image: linear-gradient(#2557d6, #2557d6); line-height: 0; border-bottom: 3px solid #1b45b0;">
      <a href="https://aixess.global" target="_blank" style="text-decoration: none; display: block;">
        <img src="https://aixess.global/brand/aixess-email-header.png" alt="AiXESS - Selected Prime Opportunities" width="600" style="display: block; width: 100%; max-width: 600px; height: auto; border: 0;" />
      </a>
    </div>

    <!-- Main Content -->
    <div style="padding: 38px 36px;">
      
      <!-- Reference Code Box -->
      <div style="background-color: #f0f5ff; background: #f0f5ff; background-image: linear-gradient(#f0f5ff, #f0f5ff); border: 1px solid #c4d8fc; border-left: 4px solid #2557d6; padding: 18px 24px; margin-bottom: 32px; border-radius: 6px;">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2557d6; margin-bottom: 4px;">${escapeHtml(copy.referenceLabel)}</div>
        <div style="font-size: 22px; font-weight: 800; letter-spacing: 0.05em; color: #171a1d; font-family: monospace, 'Gilroy', sans-serif;">${escapeHtml(referenceCode)}</div>
      </div>

      <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #171a1d; line-height: 1.3;">${escapeHtml(title)}</h1>
      
      <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.65; color: #334155;">
        ${escapeHtml(copy.salutation)} <strong>${escapeHtml(resolvedName)}</strong>,
      </p>

      <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.65; color: #334155;">
        ${escapeHtml(opening)}
      </p>

      <!-- Details Summary -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 22px 24px; margin: 28px 0;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #2557d6; margin-bottom: 14px;">${escapeHtml(copy.detailsTitle)}</div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; width: 42%; font-weight: 500; border-bottom: 1px solid #eef2f6;">${escapeHtml(copy.leadTypeLabel)}</td>
            <td style="padding: 8px 0; color: #171a1d; font-weight: 600; text-align: right; border-bottom: 1px solid #eef2f6;">${escapeHtml(leadTypeName)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: 500; border-bottom: 1px solid #eef2f6;">${escapeHtml(copy.emailLabel)}</td>
            <td style="padding: 8px 0; color: #171a1d; font-weight: 600; text-align: right; border-bottom: 1px solid #eef2f6;">${escapeHtml(email)}</td>
          </tr>
          ${phone ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: 500; border-bottom: 1px solid #eef2f6;">${escapeHtml(copy.phoneLabel)}</td>
            <td style="padding: 8px 0; color: #171a1d; font-weight: 600; text-align: right; border-bottom: 1px solid #eef2f6;">${escapeHtml(phone)}</td>
          </tr>` : ""}
          ${company ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: 500; border-bottom: 1px solid #eef2f6;">${escapeHtml(copy.companyLabel)}</td>
            <td style="padding: 8px 0; color: #171a1d; font-weight: 600; text-align: right; border-bottom: 1px solid #eef2f6;">${escapeHtml(company)}</td>
          </tr>` : ""}
        </table>
      </div>

      <!-- Next Steps -->
      <div style="margin: 28px 0; padding: 20px 22px; border-left: 4px solid #2557d6; background: #f0f5ff; background-image: linear-gradient(#f0f5ff, #f0f5ff); border-radius: 6px; border: 1px solid #c4d8fc;">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #2557d6; margin-bottom: 6px;">${escapeHtml(copy.nextStepsTitle)}</div>
        <p style="margin: 0; font-size: 14px; line-height: 1.65; color: #334155;">${escapeHtml(copy.nextSteps)}</p>
      </div>

      <!-- Primary Action Button (Matching AiXESS website button style & exact #2557d6 blue) -->
      <div style="margin: 32px 0 28px; text-align: left;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
          <tr>
            <td bgcolor="#2557d6" style="background-color: #2557d6; background: #2557d6; background-image: linear-gradient(#2557d6, #2557d6); border: 1px solid #2557d6; border-radius: 0px;">
              <a href="https://aixess.global" target="_blank" style="display: inline-block; padding: 16px 32px; font-family: 'Gilroy', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #ffffff !important; text-decoration: none; line-height: 1.2;">
                ${escapeHtml(copy.ctaButton || "Explore AiXESS Global")} &nbsp;&rarr;
              </a>
            </td>
          </tr>
        </table>
      </div>

      <!-- Signoff -->
      <div style="margin-top: 36px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 16px; font-weight: 700; color: #171a1d;">${escapeHtml(copy.team)}</p>
        <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">AiXESS Global</p>
        <p style="margin: 12px 0 0; font-size: 13px;">
          <a href="https://aixess.global" style="color: #2557d6; text-decoration: none; font-weight: 600;">www.aixess.global</a>
          <span style="color: #cbd5e1; margin: 0 8px;">•</span>
          <a href="mailto:info@aixess.global" style="color: #2557d6; text-decoration: none; font-weight: 600;">info@aixess.global</a>
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 26px 32px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6;">
      <p style="margin: 0 0 8px;">${escapeHtml(copy.automatedNotice)}</p>
      <p style="margin: 0; color: #94a3b8; font-size: 11px;">© ${new Date().getFullYear()} AiXESS Global. All rights reserved.</p>
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

    // Generate unique reference code
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const referenceCode = `AXS-2026-${randomDigits}`;
    const submittedDate = new Date().toUTCString();

    const isMaterials = kind === "materials";
    const leadTypeTitle = isMaterials ? "Project Materials Access Request" : "New Broker Registration";

    console.log("[AIXESS_LEAD_RECEIVED]", JSON.stringify({
      reference: referenceCode,
      kind,
      name: resolvedName,
      firstName,
      surname,
      phone: phone || null,
      company: company || null,
      email,
      locale,
      date: submittedDate,
    }));

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY is not configured. Lead recorded in runtime logs.");
      return res.status(200).json({
        saved: true,
        reference: referenceCode,
        dispatched: [],
        note: "Lead received and logged",
      });
    }

    // Sender configuration - strictly AiXESS
    const configuredFrom = process.env.LEAD_NOTIFICATION_FROM;
    const notificationFrom = (configuredFrom && !configuredFrom.includes("aixco"))
      ? configuredFrom
      : "AiXESS <notifications@aixess.global>";
    const configuredTo = process.env.LEAD_NOTIFICATION_TO;
    const adminTo = configuredTo ? configuredTo.split(",").map((s) => s.trim()).filter(Boolean)[0] || "info@aixess.global" : "info@aixess.global";

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
        to: adminTo,
        reply_to: email,
        subject: `[AiXESS Lead] ${leadTypeTitle}: ${resolvedName} (${referenceCode})`,
        html: adminNotificationHtml,
        text: adminNotificationText,
      },
      {
        channel: "user_confirmation",
        to: email,
        reply_to: adminTo,
        subject: userSubject,
        html: userConfirmationHtml,
        text: userConfirmationText,
      },
    ];

    let successful = [];
    try {
      const sendResults = await Promise.allSettled(
        emailsToDispatch.map(async (msg) => {
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

          let data = await res.json().catch(() => ({}));
          if (!res.ok) {
            console.warn(`[RESEND_NOTICE] Failed dispatching ${msg.channel} to ${msg.to}:`, data);
          }

          return { ok: res.ok, status: res.status, channel: msg.channel, recipient: msg.to, data };
        })
      );

      successful = sendResults
        .filter((r) => r.status === "fulfilled" && r.value.ok)
        .map((r) => ({ channel: r.value.channel, recipient: r.value.recipient, id: r.value.data?.id }));
    } catch (dispatchErr) {
      console.error("Error during email dispatch:", dispatchErr);
    }

    return res.status(200).json({
      saved: true,
      reference: referenceCode,
      dispatched: successful,
    });
  } catch (error) {
    console.error("Unhandled error in /api/leads:", error);
    return res.status(200).json({
      saved: true,
      reference: `AXS-${Date.now()}`,
      note: "Lead logged via fallback handler",
    });
  }
}
