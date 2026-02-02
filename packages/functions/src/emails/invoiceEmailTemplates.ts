/**
 * Invoice Email Templates
 *
 * Produces professional HTML email content for invoice-related communications.
 * Supports Swedish (sv) and English (en) locales.
 * All monetary amounts are in ore (1 SEK = 100 ore) and formatted for display.
 *
 * SECURITY: All user-provided content is escaped via escapeHtml to prevent XSS.
 */

import { escapeHtml } from "../lib/text.js";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface InvoiceEmailData {
  invoiceNumber: string;
  contactName: string;
  organizationName: string;
  totalAmount: number; // in ore
  currency: string;
  dueDate: string; // pre-formatted date string
  paymentLinkUrl?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number; // ore
    totalPrice: number; // ore
  }>;
}

export interface PaymentConfirmationData {
  invoiceNumber: string;
  contactName: string;
  organizationName: string;
  amountPaid: number; // ore
  currency: string;
  paymentMethod?: string;
  receiptUrl?: string;
}

export interface PaymentFailureData {
  invoiceNumber: string;
  contactName: string;
  organizationName: string;
  amount: number; // ore
  currency: string;
  errorMessage?: string;
  retryUrl?: string;
}

export interface ReminderData {
  invoiceNumber: string;
  contactName: string;
  organizationName: string;
  totalAmount: number; // ore
  amountDue: number; // ore
  currency: string;
  dueDate: string;
  daysPastDue?: number;
  paymentLinkUrl?: string;
}

export interface CreditNoteData {
  invoiceNumber: string;
  creditNoteNumber: string;
  contactName: string;
  organizationName: string;
  amount: number; // ore
  currency: string;
}

interface TemplateResult {
  subject: string;
  htmlBody: string;
  textBody: string;
}

// ---------------------------------------------------------------------------
// Locale strings
// ---------------------------------------------------------------------------

const i18n = {
  sv: {
    greeting: (name: string) => `Hej ${name},`,
    invoiceSubject: (num: string) => `Faktura ${num}`,
    invoiceIntro: (org: string) => `Du har fatt en ny faktura fran ${org}.`,
    invoiceNumber: "Fakturanummer",
    amount: "Belopp",
    dueDate: "Forfallodag",
    payNow: "Betala nu",
    lineItemsHeader: "Specifikation",
    descriptionCol: "Beskrivning",
    qtyCol: "Antal",
    unitPriceCol: "A-pris",
    totalCol: "Summa",
    paymentConfirmSubject: (num: string) =>
      `Betalning mottagen - Faktura ${num}`,
    paymentConfirmIntro: (org: string) =>
      `Tack! Vi har mottagit din betalning till ${org}.`,
    amountPaid: "Betalt belopp",
    paymentMethod: "Betalningsmetod",
    viewReceipt: "Visa kvitto",
    paymentFailSubject: (num: string) =>
      `Betalning misslyckades - Faktura ${num}`,
    paymentFailIntro: "Din betalning kunde inte genomforas.",
    errorReason: "Orsak",
    retryPayment: "Forsok igen",
    reminderSubject: (num: string) => `Paminnelse - Faktura ${num}`,
    reminderIntro: (org: string) =>
      `Det har ar en paminnelse om en obetald faktura fran ${org}.`,
    amountDue: "Att betala",
    daysPastDue: (days: number) => `${days} dagar efter forfallodagen`,
    creditNoteSubject: (num: string) => `Kreditfaktura ${num}`,
    creditNoteIntro: (org: string) =>
      `En kreditfaktura har utfardats fran ${org}.`,
    creditNoteNumber: "Kreditfakturanummer",
    originalInvoice: "Ursprunglig faktura",
    creditAmount: "Krediterat belopp",
    footerAuto: "Detta meddelande skickades automatiskt fran EquiDuty.",
    footerSettings: "Du kan andra dina aviseringsinstellningar i appen.",
  },
  en: {
    greeting: (name: string) => `Hello ${name},`,
    invoiceSubject: (num: string) => `Invoice ${num}`,
    invoiceIntro: (org: string) =>
      `You have received a new invoice from ${org}.`,
    invoiceNumber: "Invoice number",
    amount: "Amount",
    dueDate: "Due date",
    payNow: "Pay now",
    lineItemsHeader: "Line items",
    descriptionCol: "Description",
    qtyCol: "Qty",
    unitPriceCol: "Unit price",
    totalCol: "Total",
    paymentConfirmSubject: (num: string) => `Payment received - Invoice ${num}`,
    paymentConfirmIntro: (org: string) =>
      `Thank you! We have received your payment to ${org}.`,
    amountPaid: "Amount paid",
    paymentMethod: "Payment method",
    viewReceipt: "View receipt",
    paymentFailSubject: (num: string) => `Payment failed - Invoice ${num}`,
    paymentFailIntro: "Your payment could not be processed.",
    errorReason: "Reason",
    retryPayment: "Try again",
    reminderSubject: (num: string) => `Reminder - Invoice ${num}`,
    reminderIntro: (org: string) =>
      `This is a reminder about an outstanding invoice from ${org}.`,
    amountDue: "Amount due",
    daysPastDue: (days: number) => `${days} days past due`,
    creditNoteSubject: (num: string) => `Credit note ${num}`,
    creditNoteIntro: (org: string) =>
      `A credit note has been issued from ${org}.`,
    creditNoteNumber: "Credit note number",
    originalInvoice: "Original invoice",
    creditAmount: "Credited amount",
    footerAuto: "This message was sent automatically from EquiDuty.",
    footerSettings: "You can change your notification settings in the app.",
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAmount(amountInOre: number, currency: string): string {
  const value = (amountInOre / 100).toFixed(2);
  return `${value} ${currency}`;
}

/**
 * Validate and sanitise a URL.
 * Returns the sanitised string or null when the URL is invalid or uses a
 * non-http(s) protocol.
 */
function sanitizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return encodeURI(raw);
    }
    return null;
  } catch {
    return null;
  }
}

function buildActionButton(url: string | undefined, label: string): string {
  if (!url) return "";
  const safe = sanitizeUrl(url);
  if (!safe) return "";
  return `
    <tr>
      <td style="padding: 24px 0 0 0; text-align: center;">
        <a href="${safe}" style="
          display: inline-block;
          background-color: #4F46E5;
          color: #ffffff;
          padding: 12px 28px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
        ">${escapeHtml(label)}</a>
      </td>
    </tr>`;
}

function summaryRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding: 6px 12px; color: #6b7280; font-size: 14px;">${escapeHtml(label)}</td>
      <td style="padding: 6px 12px; font-weight: 600; font-size: 14px; text-align: right;">${escapeHtml(value)}</td>
    </tr>`;
}

type LocaleStrings = (typeof i18n)["sv"] | (typeof i18n)["en"];

function buildLineItemsTable(
  items: InvoiceEmailData["items"],
  t: LocaleStrings,
): string {
  if (!items || items.length === 0) return "";

  const rows = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px;">${escapeHtml(item.description)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; text-align: right;">${formatAmount(item.unitPrice, "")}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 13px; text-align: right;">${formatAmount(item.totalPrice, "")}</td>
    </tr>`,
    )
    .join("");

  return `
    <tr>
      <td style="padding: 20px 0 8px 0;">
        <h3 style="margin: 0; font-size: 14px; color: #374151;">${escapeHtml(t.lineItemsHeader)}</h3>
      </td>
    </tr>
    <tr>
      <td>
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">${escapeHtml(t.descriptionCol)}</th>
              <th style="padding: 8px 12px; text-align: center; font-size: 12px; color: #6b7280; font-weight: 600;">${escapeHtml(t.qtyCol)}</th>
              <th style="padding: 8px 12px; text-align: right; font-size: 12px; color: #6b7280; font-weight: 600;">${escapeHtml(t.unitPriceCol)}</th>
              <th style="padding: 8px 12px; text-align: right; font-size: 12px; color: #6b7280; font-weight: 600;">${escapeHtml(t.totalCol)}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </td>
    </tr>`;
}

/**
 * Wrap content sections in the shared EquiDuty email chrome.
 */
function wrapInLayout(
  lang: "sv" | "en",
  title: string,
  bodyRows: string,
  orgName: string,
): string {
  const t = i18n[lang];
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #1f2937;
  margin: 0;
  padding: 0;
  background-color: #f9fafb;
">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          max-width: 600px;
          width: 100%;
        ">
          <!-- Header -->
          <tr>
            <td style="
              text-align: center;
              padding: 24px 32px;
              border-bottom: 1px solid #e5e7eb;
            ">
              <h1 style="font-size: 22px; font-weight: 600; color: #111827; margin: 0;">EquiDuty</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${bodyRows}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="
              padding: 20px 32px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 12px;
              color: #9ca3af;
            ">
              <p style="margin: 0;">${escapeHtml(orgName)}</p>
              <p style="margin: 8px 0 0 0;">${escapeHtml(t.footerAuto)}</p>
              <p style="margin: 4px 0 0 0;">${escapeHtml(t.footerSettings)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Template functions
// ---------------------------------------------------------------------------

/**
 * New invoice email
 */
export function invoiceEmailTemplate(
  data: InvoiceEmailData,
  locale: "sv" | "en" = "sv",
): TemplateResult {
  const t = i18n[locale];
  const subject = t.invoiceSubject(data.invoiceNumber);

  const bodyRows = `
    <tr><td style="font-size: 15px; color: #374151;">${escapeHtml(t.greeting(data.contactName))}</td></tr>
    <tr><td style="padding: 8px 0 16px 0; font-size: 14px; color: #4b5563;">${escapeHtml(t.invoiceIntro(data.organizationName))}</td></tr>
    <tr>
      <td>
        <table width="100%" cellpadding="0" cellspacing="0" style="
          background-color: #f9fafb;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        ">
          ${summaryRow(t.invoiceNumber, data.invoiceNumber)}
          ${summaryRow(t.amount, formatAmount(data.totalAmount, data.currency))}
          ${summaryRow(t.dueDate, data.dueDate)}
        </table>
      </td>
    </tr>
    ${buildLineItemsTable(data.items, t)}
    ${buildActionButton(data.paymentLinkUrl, t.payNow)}`;

  const textBody = [
    t.greeting(data.contactName),
    "",
    t.invoiceIntro(data.organizationName),
    "",
    `${t.invoiceNumber}: ${data.invoiceNumber}`,
    `${t.amount}: ${formatAmount(data.totalAmount, data.currency)}`,
    `${t.dueDate}: ${data.dueDate}`,
    ...(data.items
      ? [
          "",
          t.lineItemsHeader,
          ...data.items.map(
            (i) =>
              `  - ${i.description} x${i.quantity}  ${formatAmount(i.totalPrice, data.currency)}`,
          ),
        ]
      : []),
    ...(data.paymentLinkUrl ? ["", `${t.payNow}: ${data.paymentLinkUrl}`] : []),
  ].join("\n");

  return {
    subject,
    htmlBody: wrapInLayout(locale, subject, bodyRows, data.organizationName),
    textBody,
  };
}

/**
 * Payment confirmation email
 */
export function paymentConfirmationTemplate(
  data: PaymentConfirmationData,
  locale: "sv" | "en" = "sv",
): TemplateResult {
  const t = i18n[locale];
  const subject = t.paymentConfirmSubject(data.invoiceNumber);

  const methodRow = data.paymentMethod
    ? summaryRow(t.paymentMethod, data.paymentMethod)
    : "";

  const bodyRows = `
    <tr><td style="font-size: 15px; color: #374151;">${escapeHtml(t.greeting(data.contactName))}</td></tr>
    <tr><td style="padding: 8px 0 16px 0; font-size: 14px; color: #4b5563;">${escapeHtml(t.paymentConfirmIntro(data.organizationName))}</td></tr>
    <tr>
      <td>
        <table width="100%" cellpadding="0" cellspacing="0" style="
          background-color: #f0fdf4;
          border-radius: 6px;
          border: 1px solid #bbf7d0;
        ">
          ${summaryRow(t.invoiceNumber, data.invoiceNumber)}
          ${summaryRow(t.amountPaid, formatAmount(data.amountPaid, data.currency))}
          ${methodRow}
        </table>
      </td>
    </tr>
    ${buildActionButton(data.receiptUrl, t.viewReceipt)}`;

  const textBody = [
    t.greeting(data.contactName),
    "",
    t.paymentConfirmIntro(data.organizationName),
    "",
    `${t.invoiceNumber}: ${data.invoiceNumber}`,
    `${t.amountPaid}: ${formatAmount(data.amountPaid, data.currency)}`,
    ...(data.paymentMethod
      ? [`${t.paymentMethod}: ${data.paymentMethod}`]
      : []),
    ...(data.receiptUrl ? ["", `${t.viewReceipt}: ${data.receiptUrl}`] : []),
  ].join("\n");

  return {
    subject,
    htmlBody: wrapInLayout(locale, subject, bodyRows, data.organizationName),
    textBody,
  };
}

/**
 * Payment failure email
 */
export function paymentFailureTemplate(
  data: PaymentFailureData,
  locale: "sv" | "en" = "sv",
): TemplateResult {
  const t = i18n[locale];
  const subject = t.paymentFailSubject(data.invoiceNumber);

  const errorRow = data.errorMessage
    ? summaryRow(t.errorReason, data.errorMessage)
    : "";

  const bodyRows = `
    <tr><td style="font-size: 15px; color: #374151;">${escapeHtml(t.greeting(data.contactName))}</td></tr>
    <tr><td style="padding: 8px 0 16px 0; font-size: 14px; color: #4b5563;">${escapeHtml(t.paymentFailIntro)}</td></tr>
    <tr>
      <td>
        <table width="100%" cellpadding="0" cellspacing="0" style="
          background-color: #fef2f2;
          border-radius: 6px;
          border: 1px solid #fecaca;
        ">
          ${summaryRow(t.invoiceNumber, data.invoiceNumber)}
          ${summaryRow(t.amount, formatAmount(data.amount, data.currency))}
          ${errorRow}
        </table>
      </td>
    </tr>
    ${buildActionButton(data.retryUrl, t.retryPayment)}`;

  const textBody = [
    t.greeting(data.contactName),
    "",
    t.paymentFailIntro,
    "",
    `${t.invoiceNumber}: ${data.invoiceNumber}`,
    `${t.amount}: ${formatAmount(data.amount, data.currency)}`,
    ...(data.errorMessage ? [`${t.errorReason}: ${data.errorMessage}`] : []),
    ...(data.retryUrl ? ["", `${t.retryPayment}: ${data.retryUrl}`] : []),
  ].join("\n");

  return {
    subject,
    htmlBody: wrapInLayout(locale, subject, bodyRows, data.organizationName),
    textBody,
  };
}

/**
 * Outstanding invoice reminder email
 */
export function reminderEmailTemplate(
  data: ReminderData,
  locale: "sv" | "en" = "sv",
): TemplateResult {
  const t = i18n[locale];
  const subject = t.reminderSubject(data.invoiceNumber);

  const pastDueRow =
    data.daysPastDue != null && data.daysPastDue > 0
      ? `<tr><td colspan="2" style="padding: 6px 12px; color: #dc2626; font-size: 13px; font-weight: 600;">${escapeHtml(t.daysPastDue(data.daysPastDue))}</td></tr>`
      : "";

  const bodyRows = `
    <tr><td style="font-size: 15px; color: #374151;">${escapeHtml(t.greeting(data.contactName))}</td></tr>
    <tr><td style="padding: 8px 0 16px 0; font-size: 14px; color: #4b5563;">${escapeHtml(t.reminderIntro(data.organizationName))}</td></tr>
    <tr>
      <td>
        <table width="100%" cellpadding="0" cellspacing="0" style="
          background-color: #fffbeb;
          border-radius: 6px;
          border: 1px solid #fde68a;
        ">
          ${summaryRow(t.invoiceNumber, data.invoiceNumber)}
          ${summaryRow(t.amount, formatAmount(data.totalAmount, data.currency))}
          ${summaryRow(t.amountDue, formatAmount(data.amountDue, data.currency))}
          ${summaryRow(t.dueDate, data.dueDate)}
          ${pastDueRow}
        </table>
      </td>
    </tr>
    ${buildActionButton(data.paymentLinkUrl, t.payNow)}`;

  const textBody = [
    t.greeting(data.contactName),
    "",
    t.reminderIntro(data.organizationName),
    "",
    `${t.invoiceNumber}: ${data.invoiceNumber}`,
    `${t.amount}: ${formatAmount(data.totalAmount, data.currency)}`,
    `${t.amountDue}: ${formatAmount(data.amountDue, data.currency)}`,
    `${t.dueDate}: ${data.dueDate}`,
    ...(data.daysPastDue != null && data.daysPastDue > 0
      ? [t.daysPastDue(data.daysPastDue)]
      : []),
    ...(data.paymentLinkUrl ? ["", `${t.payNow}: ${data.paymentLinkUrl}`] : []),
  ].join("\n");

  return {
    subject,
    htmlBody: wrapInLayout(locale, subject, bodyRows, data.organizationName),
    textBody,
  };
}

/**
 * Credit note issued email
 */
export function creditNoteEmailTemplate(
  data: CreditNoteData,
  locale: "sv" | "en" = "sv",
): TemplateResult {
  const t = i18n[locale];
  const subject = t.creditNoteSubject(data.creditNoteNumber);

  const bodyRows = `
    <tr><td style="font-size: 15px; color: #374151;">${escapeHtml(t.greeting(data.contactName))}</td></tr>
    <tr><td style="padding: 8px 0 16px 0; font-size: 14px; color: #4b5563;">${escapeHtml(t.creditNoteIntro(data.organizationName))}</td></tr>
    <tr>
      <td>
        <table width="100%" cellpadding="0" cellspacing="0" style="
          background-color: #f0f9ff;
          border-radius: 6px;
          border: 1px solid #bae6fd;
        ">
          ${summaryRow(t.creditNoteNumber, data.creditNoteNumber)}
          ${summaryRow(t.originalInvoice, data.invoiceNumber)}
          ${summaryRow(t.creditAmount, formatAmount(data.amount, data.currency))}
        </table>
      </td>
    </tr>`;

  const textBody = [
    t.greeting(data.contactName),
    "",
    t.creditNoteIntro(data.organizationName),
    "",
    `${t.creditNoteNumber}: ${data.creditNoteNumber}`,
    `${t.originalInvoice}: ${data.invoiceNumber}`,
    `${t.creditAmount}: ${formatAmount(data.amount, data.currency)}`,
  ].join("\n");

  return {
    subject,
    htmlBody: wrapInLayout(locale, subject, bodyRows, data.organizationName),
    textBody,
  };
}
