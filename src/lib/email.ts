// Minimal transactional email helper.
// Uses Postmark when POSTMARK_TOKEN is set, otherwise SMTP2GO.

type EmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(params: EmailParams): Promise<void> {
  if (process.env.POSTMARK_TOKEN) {
    await sendViaPostmark(params);
  } else if (process.env.SMTP2GO_API_KEY) {
    await sendViaSMTP2GO(params);
  } else {
    // Dev fallback — log to console
    console.log("[email]", params.subject, "→", params.to, "\n", params.text ?? params.html);
  }
}

async function sendViaPostmark(params: EmailParams) {
  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": process.env.POSTMARK_TOKEN!
    },
    body: JSON.stringify({
      From: process.env.EMAIL_FROM ?? "noreply@glowith.co.za",
      To: params.to,
      Subject: params.subject,
      HtmlBody: params.html,
      TextBody: params.text,
      MessageStream: "outbound"
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Postmark error: ${err}`);
  }
}

async function sendViaSMTP2GO(params: EmailParams) {
  const res = await fetch("https://api.smtp2go.com/v3/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.SMTP2GO_API_KEY,
      sender: process.env.EMAIL_FROM ?? "noreply@glowith.co.za",
      to: [params.to],
      subject: params.subject,
      html_body: params.html,
      text_body: params.text
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SMTP2GO error: ${err}`);
  }
}
