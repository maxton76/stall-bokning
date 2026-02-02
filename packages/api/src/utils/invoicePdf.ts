/**
 * Invoice HTML generator for the EquiDuty invoicing module.
 *
 * Produces a self-contained HTML document with inline CSS that can be
 * converted to PDF via a headless browser or sent directly as an HTML email.
 * All monetary values are stored and accepted in ore (1 SEK = 100 ore).
 */

export interface InvoicePdfData {
  // Organization info
  orgName: string;
  orgNumber?: string;
  orgAddress?: string;
  orgBankgiro?: string;
  orgPlusgiro?: string;
  orgSwish?: string;
  orgEmail?: string;
  orgPhone?: string;

  // Invoice details
  invoiceNumber: string;
  type: "invoice" | "credit_note";
  ocrNumber?: string;
  issueDate: string;
  dueDate: string;

  // Customer
  customerName: string;
  customerAddress?: string;
  customerEmail?: string;
  customerOrgNumber?: string;

  // Line items
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number; // ore
    vatRate: number;
    lineTotal: number; // ore
  }>;

  // Totals (all in ore)
  subtotal: number;
  vatAmount: number;
  roundingAmount: number;
  total: number;

  // Optional
  notes?: string;
  originalInvoiceNumber?: string; // For credit notes
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
 * Collect unique VAT rates and their respective totals from line items.
 * Returns an array sorted by rate ascending.
 */
function groupVatByRate(
  items: InvoicePdfData["items"],
): Array<{ rate: number; amount: number }> {
  const map = new Map<number, number>();

  for (const item of items) {
    const vatForItem = Math.round(
      item.lineTotal * (item.vatRate / (100 + item.vatRate)),
    );
    const prev = map.get(item.vatRate) ?? 0;
    map.set(item.vatRate, prev + vatForItem);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([rate, amount]) => ({ rate, amount }));
}

/**
 * Generate a complete, self-contained HTML document representing an invoice
 * or credit note. The output uses only inline CSS and requires no external
 * resources, making it suitable for PDF conversion or email delivery.
 */
export function generateInvoiceHtml(data: InvoicePdfData): string {
  const isCredit = data.type === "credit_note";
  const typeLabel = isCredit ? "KREDITFAKTURA" : "FAKTURA";
  const vatGroups = groupVatByRate(data.items);

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
            ${item.vatRate}%
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">
            ${formatSEK(item.lineTotal)}
          </td>
        </tr>`,
    )
    .join("");

  const vatRows = vatGroups
    .map(
      (g) =>
        `<tr>
          <td style="padding:4px 0;color:#4b5563;">Varav moms ${g.rate}%</td>
          <td style="padding:4px 0;text-align:right;color:#4b5563;">${formatSEK(g.amount)} kr</td>
        </tr>`,
    )
    .join("");

  const roundingRow =
    data.roundingAmount !== 0
      ? `<tr>
          <td style="padding:4px 0;color:#4b5563;">Oresavrundning</td>
          <td style="padding:4px 0;text-align:right;color:#4b5563;">${formatSEK(data.roundingAmount)} kr</td>
        </tr>`
      : "";

  const paymentMethods: string[] = [];
  if (data.orgBankgiro) {
    paymentMethods.push(
      `<tr><td style="padding:4px 0;color:#6b7280;">Bankgiro</td><td style="padding:4px 0;">${escapeHtml(data.orgBankgiro)}</td></tr>`,
    );
  }
  if (data.orgPlusgiro) {
    paymentMethods.push(
      `<tr><td style="padding:4px 0;color:#6b7280;">Plusgiro</td><td style="padding:4px 0;">${escapeHtml(data.orgPlusgiro)}</td></tr>`,
    );
  }
  if (data.orgSwish) {
    paymentMethods.push(
      `<tr><td style="padding:4px 0;color:#6b7280;">Swish</td><td style="padding:4px 0;">${escapeHtml(data.orgSwish)}</td></tr>`,
    );
  }
  if (data.ocrNumber) {
    paymentMethods.push(
      `<tr><td style="padding:4px 0;color:#6b7280;">OCR-nummer</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(data.ocrNumber)}</td></tr>`,
    );
  }

  const paymentSection =
    paymentMethods.length > 0
      ? `<div style="margin-top:32px;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
          <h3 style="margin:0 0 12px 0;font-size:14px;font-weight:600;color:#111827;">Betalningsinformation</h3>
          <table style="font-size:13px;border-collapse:collapse;">
            ${paymentMethods.join("")}
          </table>
        </div>`
      : "";

  const creditReference =
    isCredit && data.originalInvoiceNumber
      ? `<p style="margin:8px 0 0 0;font-size:13px;color:#dc2626;">Krediterar faktura: ${escapeHtml(data.originalInvoiceNumber)}</p>`
      : "";

  const notesSection = data.notes
    ? `<div style="margin-top:24px;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;font-size:13px;color:#92400e;">
        <strong>Meddelande:</strong> ${escapeHtml(data.notes)}
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${typeLabel} ${escapeHtml(data.invoiceNumber)}</title>
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
        <div style="width:60px;height:60px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#9ca3af;margin-bottom:12px;">LOGOTYP</div>
        <h2 style="font-size:18px;font-weight:700;margin-bottom:4px;">${escapeHtml(data.orgName)}</h2>
        ${data.orgNumber ? `<p style="font-size:12px;color:#6b7280;">Org.nr: ${escapeHtml(data.orgNumber)}</p>` : ""}
        ${data.orgAddress ? `<p style="font-size:12px;color:#6b7280;">${escapeHtml(data.orgAddress)}</p>` : ""}
        ${data.orgEmail ? `<p style="font-size:12px;color:#6b7280;">${escapeHtml(data.orgEmail)}</p>` : ""}
        ${data.orgPhone ? `<p style="font-size:12px;color:#6b7280;">${escapeHtml(data.orgPhone)}</p>` : ""}
      </div>
      <div style="text-align:right;">
        <h1 style="font-size:28px;font-weight:800;color:${isCredit ? "#dc2626" : "#111827"};margin-bottom:8px;">${typeLabel}</h1>
        <table style="margin-left:auto;font-size:13px;border-collapse:collapse;">
          <tr>
            <td style="padding:2px 12px 2px 0;color:#6b7280;">Fakturanummer</td>
            <td style="padding:2px 0;font-weight:600;">${escapeHtml(data.invoiceNumber)}</td>
          </tr>
          <tr>
            <td style="padding:2px 12px 2px 0;color:#6b7280;">Fakturadatum</td>
            <td style="padding:2px 0;">${escapeHtml(data.issueDate)}</td>
          </tr>
          <tr>
            <td style="padding:2px 12px 2px 0;color:#6b7280;">Forfallodag</td>
            <td style="padding:2px 0;font-weight:600;">${escapeHtml(data.dueDate)}</td>
          </tr>
          ${data.ocrNumber ? `<tr><td style="padding:2px 12px 2px 0;color:#6b7280;">OCR</td><td style="padding:2px 0;font-weight:600;">${escapeHtml(data.ocrNumber)}</td></tr>` : ""}
        </table>
        ${creditReference}
      </div>
    </div>

    <!-- Customer -->
    <div style="margin-bottom:32px;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin-bottom:4px;">Kund</p>
      <p style="font-size:15px;font-weight:600;">${escapeHtml(data.customerName)}</p>
      ${data.customerOrgNumber ? `<p style="font-size:12px;color:#6b7280;">Org.nr: ${escapeHtml(data.customerOrgNumber)}</p>` : ""}
      ${data.customerAddress ? `<p style="font-size:12px;color:#6b7280;">${escapeHtml(data.customerAddress)}</p>` : ""}
      ${data.customerEmail ? `<p style="font-size:12px;color:#6b7280;">${escapeHtml(data.customerEmail)}</p>` : ""}
    </div>

    <!-- Line items table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#374151;border-bottom:2px solid #d1d5db;">Beskrivning</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#374151;border-bottom:2px solid #d1d5db;">Antal</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#374151;border-bottom:2px solid #d1d5db;">A-pris</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#374151;border-bottom:2px solid #d1d5db;">Moms</th>
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
        ${vatRows}
        ${roundingRow}
        <tr style="border-top:2px solid #111827;">
          <td style="padding:12px 0 4px 0;font-size:16px;font-weight:700;">${isCredit ? "Att kreditera" : "Att betala"}</td>
          <td style="padding:12px 0 4px 0;text-align:right;font-size:18px;font-weight:700;">${formatSEK(data.total)} kr</td>
        </tr>
      </table>
    </div>

    <!-- Payment info -->
    ${paymentSection}

    <!-- Notes -->
    ${notesSection}

    <!-- Footer -->
    <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;">
      ${escapeHtml(data.orgName)}${data.orgNumber ? ` | Org.nr: ${escapeHtml(data.orgNumber)}` : ""}${data.orgEmail ? ` | ${escapeHtml(data.orgEmail)}` : ""}${data.orgPhone ? ` | ${escapeHtml(data.orgPhone)}` : ""}
    </div>

  </div>
</body>
</html>`;
}
