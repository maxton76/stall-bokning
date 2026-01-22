"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const firebase_functions_1 = require("firebase-functions");
const text_js_1 = require("../lib/text.js");
const validation_js_1 = require("../lib/validation.js");
const errors_js_1 = require("../lib/errors.js");
const smtp_js_1 = require("../lib/smtp.js");
/**
 * Get the configured email provider
 * - "smtp": Use SMTP only
 * - "sendgrid": Use SendGrid only
 * - "auto": Try SMTP first, fallback to SendGrid
 */
function getEmailProvider() {
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase();
  if (provider === "smtp" || provider === "sendgrid") {
    return provider;
  }
  return "auto"; // Default: try SMTP first, then SendGrid
}
/**
 * Get SendGrid configuration from environment
 */
function getSendGridConfig() {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail =
    process.env.SENDGRID_FROM_EMAIL || "noreply@stallbokning.se";
  const fromName = process.env.SENDGRID_FROM_NAME || "Stallbokning";
  if (!apiKey) {
    firebase_functions_1.logger.warn("SENDGRID_API_KEY not configured");
    return null;
  }
  return { apiKey, fromEmail, fromName };
}
/**
 * Build HTML email from plain text
 * SECURITY: All user-provided content is escaped to prevent XSS
 */
function buildHtmlBody(title, body, actionUrl) {
  // Escape all user-provided content to prevent XSS
  const safeTitle = (0, text_js_1.escapeHtml)(title);
  const safeBody = (0, text_js_1.escapeHtml)(body).replace(/\n/g, "<br>");
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
      firebase_functions_1.logger.warn(
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
async function sendViaSendGrid(payload, config, htmlBody) {
  try {
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
      firebase_functions_1.logger.error(
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
    firebase_functions_1.logger.info(
      {
        to: payload.to,
        subject: payload.subject,
        provider: "sendgrid",
      },
      "Email sent successfully via SendGrid",
    );
    return { success: true };
  } catch (error) {
    const errorMessage = (0, errors_js_1.formatErrorMessage)(error);
    firebase_functions_1.logger.error(
      {
        error: errorMessage,
        to: payload.to,
      },
      "Failed to send email via SendGrid",
    );
    return {
      success: false,
      error: errorMessage,
    };
  }
}
/**
 * Send email using SMTP
 */
async function sendEmailViaSMTP(payload, htmlBody) {
  // Initialize SMTP if not already done
  if (!(0, smtp_js_1.isSMTPInitialized)()) {
    const initialized = await (0, smtp_js_1.initializeSMTP)();
    if (!initialized) {
      return {
        success: false,
        error: "Failed to initialize SMTP connection",
      };
    }
  }
  const result = await (0, smtp_js_1.sendViaSMTP)({
    to: payload.to,
    subject: payload.subject,
    text: payload.body,
    html: htmlBody,
  });
  if (result.success) {
    firebase_functions_1.logger.info(
      {
        to: payload.to,
        subject: payload.subject,
        messageId: result.messageId,
        provider: "smtp",
      },
      "Email sent successfully via SMTP",
    );
  }
  return {
    success: result.success,
    error: result.error,
  };
}
/**
 * Send email via configured provider (SMTP or SendGrid)
 *
 * Provider selection (via EMAIL_PROVIDER env var):
 * - "smtp": Use SMTP only
 * - "sendgrid": Use SendGrid only
 * - "auto" (default): Try SMTP first, fallback to SendGrid
 */
async function sendEmail(payload, actionUrl) {
  // Validate email address format
  if (!(0, validation_js_1.isValidEmail)(payload.to)) {
    firebase_functions_1.logger.warn(
      { email: payload.to.substring(0, 30) },
      "Invalid email address format",
    );
    return {
      success: false,
      error: "Invalid email address format",
    };
  }
  const htmlBody =
    payload.htmlBody || buildHtmlBody(payload.subject, payload.body, actionUrl);
  const provider = getEmailProvider();
  const sendGridConfig = getSendGridConfig();
  // SMTP only mode
  if (provider === "smtp") {
    return sendEmailViaSMTP(payload, htmlBody);
  }
  // SendGrid only mode
  if (provider === "sendgrid") {
    if (!sendGridConfig) {
      return {
        success: false,
        error: "Email not configured - SENDGRID_API_KEY missing",
      };
    }
    return sendViaSendGrid(payload, sendGridConfig, htmlBody);
  }
  // Auto mode: Try SMTP first, then SendGrid
  firebase_functions_1.logger.info(
    "Attempting to send email via SMTP (auto mode)",
  );
  const smtpResult = await sendEmailViaSMTP(payload, htmlBody);
  if (smtpResult.success) {
    return smtpResult;
  }
  // SMTP failed, try SendGrid as fallback
  firebase_functions_1.logger.warn(
    { smtpError: smtpResult.error },
    "SMTP failed, falling back to SendGrid",
  );
  if (!sendGridConfig) {
    return {
      success: false,
      error: `SMTP failed (${smtpResult.error}) and SendGrid not configured`,
    };
  }
  return sendViaSendGrid(payload, sendGridConfig, htmlBody);
}
//# sourceMappingURL=sendEmail.js.map
