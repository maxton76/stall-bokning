/**
 * SMTP Helper for sending emails via SMTP gateway
 *
 * Based on Chirpify's smtp-helper pattern using nodemailer
 * with credentials stored in Google Cloud Secret Manager.
 */

import * as nodemailer from "nodemailer";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { logger } from "firebase-functions";

// SMTP Configuration from environment variables
const SMTP_HOST = process.env.EMAIL_SMTP_SERVER || "send.one.com";
const SMTP_PORT = parseInt(process.env.EMAIL_SMTP_PORT || "587", 10);
const SMTP_USER = process.env.EMAIL_SMTP_USER || "info@equiduty.se";
const SMTP_SECURE = process.env.EMAIL_SMTP_SECURE === "true"; // true for port 465

// Secret Manager client
const secretManager = new SecretManagerServiceClient();

// Transporter singleton
let smtpTransporter: nodemailer.Transporter | null = null;
let smtpInitialized = false;

/**
 * Get the GCP project number for Secret Manager
 */
function getProjectNumber(): string {
  // Try environment variable first
  if (process.env.GCP_PROJECT_NUMBER) {
    return process.env.GCP_PROJECT_NUMBER;
  }

  // Try GOOGLE_CLOUD_PROJECT (project ID, not number)
  // For Firebase, we can derive from FIREBASE_CONFIG
  if (process.env.FIREBASE_CONFIG) {
    try {
      const config = JSON.parse(process.env.FIREBASE_CONFIG);
      if (config.projectId) {
        // Project number should be set explicitly in env vars
        // This is a fallback that won't work without the number
        logger.warn(
          "GCP_PROJECT_NUMBER not set, Secret Manager access may fail",
        );
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Fallback to GCLOUD_PROJECT
  return process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "";
}

/**
 * Initialize SMTP transporter with credentials from Secret Manager
 */
export async function initializeSMTP(): Promise<boolean> {
  // Reset for testing
  if (process.env.NODE_ENV === "test") {
    smtpInitialized = false;
    smtpTransporter = null;
  }

  if (smtpInitialized && smtpTransporter) {
    return true;
  }

  try {
    let password: string;

    // Check for direct password in env (for development/testing)
    if (process.env.EMAIL_SMTP_PASSWORD) {
      password = process.env.EMAIL_SMTP_PASSWORD;
      logger.info("Using SMTP password from environment variable");
    } else {
      // Fetch from Secret Manager
      const projectNumber = getProjectNumber();
      if (!projectNumber) {
        logger.error(
          "Cannot determine project number for Secret Manager access",
        );
        return false;
      }

      // Secret name can be configured via environment variable
      // Default format: {environment}-smtp-password (e.g., dev-smtp-password)
      const smtpSecretName =
        process.env.SMTP_SECRET_NAME || "dev-smtp-password";
      const secretName = `projects/${projectNumber}/secrets/${smtpSecretName}/versions/latest`;

      logger.info(
        `Fetching SMTP password from Secret Manager: ${smtpSecretName}`,
      );

      const [version] = await secretManager.accessSecretVersion({
        name: secretName,
      });

      if (!version.payload?.data) {
        logger.error("SMTP password secret is empty");
        return false;
      }

      password = version.payload.data.toString().trim();
    }

    // Validate port/security configuration to prevent common mistakes
    if (SMTP_PORT === 587 && SMTP_SECURE === true) {
      logger.warn(
        "⚠️  Port 587 should use SMTP_SECURE=false (STARTTLS). " +
          "Current config may cause connection issues.",
      );
    }
    if (SMTP_PORT === 465 && SMTP_SECURE === false) {
      logger.warn(
        "⚠️  Port 465 should use SMTP_SECURE=true (SSL/TLS). " +
          "Current config may cause connection issues.",
      );
    }

    // Create SMTP transporter
    smtpTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: password,
      },
      // Enable STARTTLS for non-secure connections
      requireTLS: !SMTP_SECURE,
      tls: {
        // Can be made stricter in production if needed
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });

    // Verify the connection
    await smtpTransporter.verify();

    smtpInitialized = true;
    logger.info("SMTP transporter initialized successfully", {
      host: SMTP_HOST,
      port: SMTP_PORT,
      user: SMTP_USER,
    });

    return true;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error("Failed to initialize SMTP", { error: errorMessage });
    smtpTransporter = null;
    smtpInitialized = false;
    return false;
  }
}

/**
 * Email data interface
 */
export interface SMTPEmailData {
  to: string;
  from?:
    | string
    | {
        email: string;
        name: string;
      };
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Email send result
 */
export interface SMTPSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  code?: string;
}

/**
 * Send an email via SMTP
 */
export async function sendViaSMTP(
  emailData: SMTPEmailData,
): Promise<SMTPSendResult> {
  try {
    // Basic validation
    if (
      !emailData.to ||
      !emailData.subject ||
      (!emailData.text && !emailData.html)
    ) {
      return {
        success: false,
        error: "Missing required email fields (to, subject, text/html)",
      };
    }

    if (!smtpTransporter) {
      return {
        success: false,
        error: "SMTP transporter not initialized. Call initializeSMTP() first.",
      };
    }

    // Format the from address
    const defaultFrom = `"EquiDuty" <${SMTP_USER}>`;
    let fromAddress: string;

    if (!emailData.from) {
      fromAddress = defaultFrom;
    } else if (typeof emailData.from === "object") {
      fromAddress = `"${emailData.from.name}" <${emailData.from.email}>`;
    } else {
      fromAddress = emailData.from;
    }

    // Build mail options
    const mailOptions: nodemailer.SendMailOptions = {
      from: fromAddress,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
    };

    const info = await smtpTransporter.sendMail(mailOptions);

    logger.info("Email sent via SMTP", {
      messageId: info.messageId,
      to: emailData.to,
      subject: emailData.subject,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorCode =
      error instanceof Error && "code" in error
        ? (error as { code?: string }).code
        : undefined;

    logger.error("Failed to send email via SMTP", {
      error: errorMessage,
      code: errorCode,
      to: emailData.to,
    });

    return {
      success: false,
      error: errorMessage,
      code: errorCode,
    };
  }
}

/**
 * Close SMTP connection (for cleanup)
 */
export function closeSMTP(): void {
  if (smtpTransporter) {
    smtpTransporter.close();
    smtpTransporter = null;
    smtpInitialized = false;
    logger.info("SMTP connection closed");
  }
}

/**
 * Check if SMTP is initialized
 */
export function isSMTPInitialized(): boolean {
  return smtpInitialized && smtpTransporter !== null;
}
