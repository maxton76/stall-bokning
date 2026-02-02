/**
 * Receipt HTML Generator
 *
 * Generates a self-contained HTML receipt document for manual (non-Stripe)
 * payments. All monetary values are in ore (1 SEK = 100 ore).
 *
 * Follows the same formatting approach as invoicePdf.ts.
 */

export interface ReceiptData {
  orgName: string;
  orgNumber?: string;
  orgAddress?: string;
  receiptNumber: string;
  paymentDate: string;
  paymentMethod: string;
  customerName: string;
  customerEmail?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number; // ore
    lineTotal: number; // ore
  }>;
  subtotal: number; // ore
  vatAmount: number; // ore
  total: number; // ore
  currency?: string;
}

/**
 * Format an ore amount as a Swedish-locale SEK string.
 * Uses space as thousands separator and comma as decimal separator.
 *
 * @example formatSEK(125050) => "1 250,50"
 */
function formatSEK(ore: number): string {
  const sek = ore / 100;
  return sek.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Escape HTML special characters to prevent XSS when interpolating
 * user-provided strings into the HTML document.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generate a complete, self-contained HTML receipt document.
 * The output uses only inline CSS and requires no external resources,
 * making it suitable for PDF conversion or email delivery.
 */
export function generateReceiptHtml(data: ReceiptData): string {
  const currencyLabel = (data.currency || "SEK").toUpperCase();

  const lineItemRows = data.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">
            ${escapeHtml(item.description)}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">
            ${item.quantity}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">
            ${formatSEK(item.unitPrice)}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">
            ${formatSEK(item.lineTotal)}
          </td>
        </tr>`,
    )
    .join("");

  const vatRow =
    data.vatAmount !== 0
      ? `<tr>
          <td style="padding:4px 0;color:#4b5563;">Varav moms</td>
          <td style="padding:4px 0;text-align:right;color:#4b5563;">${formatSEK(data.vatAmount)} kr</td>
        </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KVITTO ${escapeHtml(data.receiptNumber)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      color: #111827;
      background: #ffffff;
      line-height: 1.5;
    }
    @media print {
      body { padding: 0; }
      .page { box-shadow: none; margin: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="page" style="max-width:800px;margin:0 auto;padding:40px;">

    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;border-bottom:2px solid #111827;padding-bottom:24px;">
      <div>
        <h2 style="font-size:18px;font-weight:700;margin-bottom:4px;">${escapeHtml(data.orgName)}</h2>
        ${data.orgNumber ? `<p style="font-size:12px;color:#6b7280;">Org.nr: ${escapeHtml(data.orgNumber)}</p>` : ""}
        ${data.orgAddress ? `<p style="font-size:12px;color:#6b7280;">${escapeHtml(data.orgAddress)}</p>` : ""}
      </div>
      <div style="text-align:right;">
        <h1 style="font-size:28px;font-weight:800;color:#059669;margin-bottom:8px;">KVITTO</h1>
        <table style="margin-left:auto;font-size:13px;border-collapse:collapse;">
          <tr>
            <td style="padding:2px 12px 2px 0;color:#6b7280;">Kvittonummer</td>
            <td style="padding:2px 0;font-weight:600;">${escapeHtml(data.receiptNumber)}</td>
          </tr>
          <tr>
            <td style="padding:2px 12px 2px 0;color:#6b7280;">Betalningsdatum</td>
            <td style="padding:2px 0;">${escapeHtml(data.paymentDate)}</td>
          </tr>
          <tr>
            <td style="padding:2px 12px 2px 0;color:#6b7280;">Betalningssatt</td>
            <td style="padding:2px 0;">${escapeHtml(data.paymentMethod)}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Customer -->
    <div style="margin-bottom:32px;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin-bottom:4px;">Kund</p>
      <p style="font-size:15px;font-weight:600;">${escapeHtml(data.customerName)}</p>
      ${data.customerEmail ? `<p style="font-size:12px;color:#6b7280;">${escapeHtml(data.customerEmail)}</p>` : ""}
    </div>

    <!-- Line items table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#374151;border-bottom:2px solid #d1d5db;">Beskrivning</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#374151;border-bottom:2px solid #d1d5db;">Antal</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#374151;border-bottom:2px solid #d1d5db;">A-pris</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#374151;border-bottom:2px solid #d1d5db;">Belopp</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemRows}
      </tbody>
    </table>

    <!-- Totals -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
      <table style="min-width:280px;border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="padding:4px 0;color:#4b5563;">Summa exkl. moms</td>
          <td style="padding:4px 0;text-align:right;">${formatSEK(data.subtotal)} kr</td>
        </tr>
        ${vatRow}
        <tr style="border-top:2px solid #111827;">
          <td style="padding:12px 0 4px 0;font-size:16px;font-weight:700;">Betalt</td>
          <td style="padding:12px 0 4px 0;text-align:right;font-size:18px;font-weight:700;">${formatSEK(data.total)} kr</td>
        </tr>
      </table>
    </div>

    <!-- Confirmation -->
    <div style="margin-top:24px;padding:12px 16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;font-size:13px;color:#065f46;text-align:center;">
      <strong>Betalning mottagen.</strong> Tack for din betalning.
    </div>

    <!-- Footer -->
    <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;">
      ${escapeHtml(data.orgName)}${data.orgNumber ? ` | Org.nr: ${escapeHtml(data.orgNumber)}` : ""} | Valuta: ${currencyLabel}
    </div>

  </div>
</body>
</html>`;
}
