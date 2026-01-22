/**
 * Email Service - SMTP-based email sending for Cloud Run API
 *
 * Uses nodemailer with send.one.com SMTP gateway
 * Password configured via Secret Manager (mounted as environment variable)
 */
import nodemailer from "nodemailer";
import type { OrganizationInvite } from "@stall-bokning/shared/types/organization";

// SMTP Configuration from environment variables
const SMTP_HOST = process.env.EMAIL_SMTP_SERVER || "send.one.com";
const SMTP_PORT = parseInt(process.env.EMAIL_SMTP_PORT || "587", 10);
const SMTP_USER = process.env.EMAIL_SMTP_USER || "info@stallbokning.se";
const SMTP_SECURE = process.env.EMAIL_SMTP_SECURE === "true"; // true for port 465
const FROM_EMAIL = `"Stallbokning" <${SMTP_USER}>`;

// Transporter singleton
let smtpTransporter: nodemailer.Transporter | null = null;

/**
 * Initialize SMTP transporter
 */
function getTransporter(): nodemailer.Transporter {
  if (smtpTransporter) {
    return smtpTransporter;
  }

  const password = process.env.EMAIL_SMTP_PASSWORD;
  if (!password) {
    throw new Error("EMAIL_SMTP_PASSWORD environment variable is required");
  }

  // Validate port/security configuration
  if (SMTP_PORT === 587 && SMTP_SECURE === true) {
    console.warn("⚠️  Port 587 should use SMTP_SECURE=false (STARTTLS)");
  }
  if (SMTP_PORT === 465 && SMTP_SECURE === false) {
    console.warn("⚠️  Port 465 should use SMTP_SECURE=true (SSL/TLS)");
  }

  smtpTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: password,
    },
    requireTLS: !SMTP_SECURE,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });

  console.log("SMTP transporter initialized:", {
    host: SMTP_HOST,
    port: SMTP_PORT,
    user: SMTP_USER,
  });

  return smtpTransporter;
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Build HTML email template for organization invites
 */
function buildInviteEmailHtml(data: {
  organizationName: string;
  inviterName: string;
  roles: string;
  acceptUrl: string;
  declineUrl: string;
  expiresAt: string;
}): string {
  const safeOrgName = escapeHtml(data.organizationName);
  const safeInviterName = escapeHtml(data.inviterName);
  const safeRoles = escapeHtml(data.roles);
  const safeExpiresAt = escapeHtml(data.expiresAt);

  // Validate URLs
  const safeAcceptUrl = encodeURI(data.acceptUrl);
  const safeDeclineUrl = encodeURI(data.declineUrl);

  return `
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inbjudan till ${safeOrgName}</title>
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
    ">Du har fått en inbjudan!</h2>

    <p style="margin: 0 0 16px 0; color: #4b5563;">
      ${safeInviterName} har bjudit in dig till organisationen <strong>${safeOrgName}</strong>.
    </p>

    <p style="margin: 0 0 16px 0; color: #4b5563;">
      <strong>Roller:</strong> ${safeRoles}
    </p>

    <p style="margin: 0 0 24px 0; color: #4b5563;">
      Inbjudan gäller till: ${safeExpiresAt}
    </p>

    <div style="margin-top: 24px; text-align: center;">
      <a href="${safeAcceptUrl}" style="
        display: inline-block;
        background-color: #10b981;
        color: white;
        padding: 12px 32px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
        margin: 0 8px;
      ">Acceptera inbjudan</a>

      <a href="${safeDeclineUrl}" style="
        display: inline-block;
        background-color: #ef4444;
        color: white;
        padding: 12px 32px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
        margin: 0 8px;
      ">Avböj</a>
    </div>

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
        Om du inte förväntade dig denna inbjudan kan du ignorera detta meddelande.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Build HTML email template for signup invites (for non-existing users)
 */
function buildSignupInviteEmailHtml(data: {
  organizationName: string;
  inviterName: string;
  roles: string;
  signupUrl: string;
  expiresAt: string;
}): string {
  const safeOrgName = escapeHtml(data.organizationName);
  const safeInviterName = escapeHtml(data.inviterName);
  const safeRoles = escapeHtml(data.roles);
  const safeExpiresAt = escapeHtml(data.expiresAt);
  const safeSignupUrl = encodeURI(data.signupUrl);

  return `
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inbjudan till ${safeOrgName}</title>
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
    ">Välkommen till Stallbokning!</h2>

    <p style="margin: 0 0 16px 0; color: #4b5563;">
      ${safeInviterName} har bjudit in dig att gå med i organisationen <strong>${safeOrgName}</strong>.
    </p>

    <p style="margin: 0 0 16px 0; color: #4b5563;">
      För att acceptera inbjudan behöver du först skapa ett konto.
    </p>

    <p style="margin: 0 0 16px 0; color: #4b5563;">
      <strong>Roller:</strong> ${safeRoles}
    </p>

    <p style="margin: 0 0 24px 0; color: #4b5563;">
      Inbjudan gäller till: ${safeExpiresAt}
    </p>

    <div style="margin-top: 24px; text-align: center;">
      <a href="${safeSignupUrl}" style="
        display: inline-block;
        background-color: #4F46E5;
        color: white;
        padding: 12px 32px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
      ">Skapa konto och acceptera</a>
    </div>

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
        Om du inte förväntade dig denna inbjudan kan du ignorera detta meddelande.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send invite email to existing user with accept/decline links
 */
export async function sendOrganizationInviteEmail(
  invite: OrganizationInvite,
  acceptUrl: string,
  declineUrl: string,
): Promise<void> {
  const transporter = getTransporter();

  const htmlContent = buildInviteEmailHtml({
    organizationName: invite.organizationName,
    inviterName: invite.inviterName,
    roles: invite.roles.join(", "),
    acceptUrl,
    declineUrl,
    expiresAt: invite.expiresAt.toDate().toLocaleDateString("sv-SE"),
  });

  const plainText = `
Du har fått en inbjudan till organisationen ${invite.organizationName}!

${invite.inviterName} har bjudit in dig med följande roller: ${invite.roles.join(", ")}

Inbjudan gäller till: ${invite.expiresAt.toDate().toLocaleDateString("sv-SE")}

Acceptera inbjudan: ${acceptUrl}
Avböj: ${declineUrl}

Detta meddelande skickades automatiskt från Stallbokning.
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: invite.email,
      subject: `Inbjudan till ${invite.organizationName}`,
      text: plainText,
      html: htmlContent,
    });

    console.log(
      `Invite email sent to ${invite.email} for organization ${invite.organizationName}`,
      {
        messageId: info.messageId,
      },
    );
  } catch (error) {
    console.error("Error sending invite email:", error);
    throw new Error("Failed to send invite email");
  }
}

/**
 * Send signup invite email to non-existing user with signup link
 */
export async function sendSignupInviteEmail(
  invite: OrganizationInvite,
  signupUrl: string,
): Promise<void> {
  const transporter = getTransporter();

  const htmlContent = buildSignupInviteEmailHtml({
    organizationName: invite.organizationName,
    inviterName: invite.inviterName,
    roles: invite.roles.join(", "),
    signupUrl,
    expiresAt: invite.expiresAt.toDate().toLocaleDateString("sv-SE"),
  });

  const plainText = `
Välkommen till Stallbokning!

${invite.inviterName} har bjudit in dig att gå med i organisationen ${invite.organizationName}.

För att acceptera inbjudan behöver du först skapa ett konto.

Roller: ${invite.roles.join(", ")}
Inbjudan gäller till: ${invite.expiresAt.toDate().toLocaleDateString("sv-SE")}

Skapa konto och acceptera: ${signupUrl}

Detta meddelande skickades automatiskt från Stallbokning.
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: invite.email,
      subject: `Inbjudan till Stallbokning - ${invite.organizationName}`,
      text: plainText,
      html: htmlContent,
    });

    console.log(
      `Signup invite email sent to ${invite.email} for organization ${invite.organizationName}`,
      {
        messageId: info.messageId,
      },
    );
  } catch (error) {
    console.error("Error sending signup invite email:", error);
    throw new Error("Failed to send signup invite email");
  }
}

/**
 * Send invite email to existing user (organizationMember with pending status)
 */
export async function sendMemberInviteEmail(data: {
  email: string;
  organizationName: string;
  inviterName: string;
  roles: string[];
  acceptUrl: string;
  declineUrl: string;
}): Promise<void> {
  const transporter = getTransporter();

  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toLocaleDateString("sv-SE");

  const htmlContent = buildInviteEmailHtml({
    organizationName: data.organizationName,
    inviterName: data.inviterName,
    roles: data.roles.join(", "),
    acceptUrl: data.acceptUrl,
    declineUrl: data.declineUrl,
    expiresAt,
  });

  const plainText = `
Du har fått en inbjudan till organisationen ${data.organizationName}!

${data.inviterName} har bjudit in dig med följande roller: ${data.roles.join(", ")}

Inbjudan gäller till: ${expiresAt}

Acceptera inbjudan: ${data.acceptUrl}
Avböj: ${data.declineUrl}

Detta meddelande skickades automatiskt från Stallbokning.
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: data.email,
      subject: `Inbjudan till ${data.organizationName}`,
      text: plainText,
      html: htmlContent,
    });

    console.log(
      `Member invite email sent to ${data.email} for organization ${data.organizationName}`,
      {
        messageId: info.messageId,
      },
    );
  } catch (error) {
    console.error("Error sending member invite email:", error);
    throw new Error("Failed to send member invite email");
  }
}
