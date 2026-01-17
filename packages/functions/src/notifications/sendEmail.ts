import { logger } from "firebase-functions";

import { escapeHtml } from "../lib/text.js";
import { isValidEmail } from "../lib/validation.js";
import { formatErrorMessage } from "../lib/errors.js";

/**
 * Email sending configuration
 */
interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

/**
 * Email payload
 */
interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  template?: string;
  templateData?: Record<string, unknown>;
}

/**
 * Get SendGrid configuration from environment
 */
function getEmailConfig(): EmailConfig | null {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail =
    process.env.SENDGRID_FROM_EMAIL || "noreply@stallbokning.se";
  const fromName = process.env.SENDGRID_FROM_NAME || "Stallbokning";

  if (!apiKey) {
    logger.warn("SENDGRID_API_KEY not configured");
    return null;
  }

  return { apiKey, fromEmail, fromName };
}

/**
 * Build HTML email from plain text
 * SECURITY: All user-provided content is escaped to prevent XSS
 */
function buildHtmlBody(
  title: string,
  body: string,
  actionUrl?: string,
): string {
  // Escape all user-provided content to prevent XSS
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body).replace(/\n/g, "<br>");

  // Validate and sanitize URL (only allow http/https protocols)
  let actionButton = "";
  if (actionUrl) {
    try {
      const url = new URL(actionUrl);
      if (url.protocol === "http:" || url.protocol === "https:") {
        const safeUrl = encodeURI(actionUrl);
        actionButton = `
      <div style="margin-top: 24px; text-align: center;">
        <a href="${safeUrl}" style="
          background-color: #4F46E5;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
        ">Visa i appen</a>
      </div>
    `;
      }
    } catch {
      // Invalid URL - skip the action button
      logger.warn(
        { actionUrl: actionUrl.substring(0, 50) },
        "Invalid action URL in email",
      );
    }
  }

  return `
    <!DOCTYPE html>
    <html lang="sv">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${safeTitle}</title>
    </head>
    <body style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    ">
      <div style="
        background-color: white;
        border-radius: 8px;
        padding: 32px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      ">
        <div style="
          text-align: center;
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid #e5e7eb;
        ">
          <h1 style="
            font-size: 24px;
            font-weight: 600;
            color: #111827;
            margin: 0;
          ">🐴 Stallbokning</h1>
        </div>

        <h2 style="
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 16px 0;
        ">${safeTitle}</h2>

        <p style="
          margin: 0;
          color: #4b5563;
        ">${safeBody}</p>

        ${actionButton}

        <div style="
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 12px;
          color: #9ca3af;
        ">
          <p style="margin: 0;">
            Detta meddelande skickades automatiskt från Stallbokning.
          </p>
          <p style="margin: 8px 0 0 0;">
            Du kan ändra dina aviseringsinställningar i appen.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send email via SendGrid API
 */
export async function sendEmail(
  payload: EmailPayload,
  actionUrl?: string,
): Promise<{ success: boolean; error?: string }> {
  const config = getEmailConfig();

  if (!config) {
    return {
      success: false,
      error: "Email not configured - SENDGRID_API_KEY missing",
    };
  }

  // Validate email address format
  if (!isValidEmail(payload.to)) {
    logger.warn(
      { email: payload.to.substring(0, 30) },
      "Invalid email address format",
    );
    return {
      success: false,
      error: "Invalid email address format",
    };
  }

  try {
    const htmlBody =
      payload.htmlBody ||
      buildHtmlBody(payload.subject, payload.body, actionUrl);

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: payload.to }],
          },
        ],
        from: {
          email: config.fromEmail,
          name: config.fromName,
        },
        subject: payload.subject,
        content: [
          {
            type: "text/plain",
            value: payload.body,
          },
          {
            type: "text/html",
            value: htmlBody,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        {
          status: response.status,
          error: errorText,
        },
        "SendGrid API error",
      );
      return {
        success: false,
        error: `SendGrid error: ${response.status} - ${errorText}`,
      };
    }

    logger.info(
      {
        to: payload.to,
        subject: payload.subject,
      },
      "Email sent successfully",
    );

    return { success: true };
  } catch (error) {
    const errorMessage = formatErrorMessage(error);
    logger.error(
      {
        error: errorMessage,
        to: payload.to,
      },
      "Failed to send email",
    );
    return {
      success: false,
      error: errorMessage,
    };
  }
}
