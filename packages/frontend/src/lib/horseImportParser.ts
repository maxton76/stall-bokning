import type { ParseResult } from "./importParser";

/**
 * A single unpivoted horse row: one horse per row.
 */
export interface HorseImportRow {
  ownerEmail: string;
  horseName: string;
  dateOfBirth?: string; // ISO date string (YYYY-MM-DD)
  ueln?: string; // UELN number
  chipNumber?: string; // Microchip number
  rowIndex: number;
}

/**
 * Helper to find column index from various header names (case-insensitive).
 */
function findColumn(headers: string[], aliases: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const normalized = headers[i]!.toLowerCase().trim();
    if (aliases.some((alias) => normalized === alias.toLowerCase())) {
      return i;
    }
  }
  return -1;
}

/**
 * Helper to get cell value from row by column index or positional index.
 */
function getCell(
  row: { [key: string]: string },
  colIndex: number,
  rowIndex: number,
  fallbackIndex: number,
): string | undefined {
  // Try by column index first
  if (colIndex >= 0) {
    const headers = Object.keys(row);
    if (colIndex < headers.length) {
      const header = headers[colIndex];
      return header !== undefined ? row[header] : undefined;
    }
  }
  // Fallback to positional index
  const headers = Object.keys(row);
  if (fallbackIndex < headers.length) {
    const header = headers[fallbackIndex];
    return header !== undefined ? row[header] : undefined;
  }
  return undefined;
}

/**
 * Normalize date formats to ISO 8601 (YYYY-MM-DD).
 */
function normalizeDate(dateStr: string): string | undefined {
  if (!dateStr || !dateStr.trim()) return undefined;

  const trimmed = dateStr.trim();

  // Try parsing common formats
  const isoFormat = /^(\d{4})-(\d{2})-(\d{2})$/; // YYYY-MM-DD
  const ddmmyyyySlash = /^(\d{2})\/(\d{2})\/(\d{4})$/; // DD/MM/YYYY
  const ddmmyyyyDot = /^(\d{2})\.(\d{2})\.(\d{4})$/; // DD.MM.YYYY

  // Check ISO format (YYYY-MM-DD) - already correct
  let match = trimmed.match(isoFormat);
  if (match) {
    const [_, year, month, day] = match;
    const date = new Date(`${year}-${month}-${day}`);
    if (!isNaN(date.getTime())) {
      return `${year}-${month}-${day}`;
    }
  }

  // Check DD/MM/YYYY format
  match = trimmed.match(ddmmyyyySlash);
  if (match) {
    const [_, day, month, year] = match;
    const date = new Date(`${year}-${month}-${day}`);
    if (!isNaN(date.getTime())) {
      return `${year}-${month}-${day}`;
    }
  }

  // Check DD.MM.YYYY format
  match = trimmed.match(ddmmyyyyDot);
  if (match) {
    const [_, day, month, year] = match;
    const date = new Date(`${year}-${month}-${day}`);
    if (!isNaN(date.getTime())) {
      return `${year}-${month}-${day}`;
    }
  }

  // Handle Excel serial numbers (e.g., "42173" for 2015-06-05)
  // Excel serial numbers are integers (as strings) typically in range 1-100000
  const serialNumber = parseInt(trimmed, 10);
  if (!isNaN(serialNumber) && serialNumber > 0 && serialNumber < 100000) {
    // Convert Excel serial date to JavaScript Date
    // Excel epoch: 1900-01-01 is day 1 (not 0, due to Excel's 1900 leap year bug)
    // But we use 1899-12-30 as base (day 0) to account for the bug
    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
    const date = new Date(
      excelEpoch.getTime() + serialNumber * 24 * 60 * 60 * 1000,
    );

    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }

  return undefined; // Invalid date format
}

/**
 * Parse horse import file with one horse per row.
 *
 * Expected file format:
 *   Column A or "email"/"e-post" = owner email (required)
 *   Column B or "Namn"/"name" = horse name (required)
 *   Column C or "Födelsedatum"/"dateOfBirth" = date of birth (optional, YYYY-MM-DD)
 *   Column D or "UELN-nummer"/"ueln" = UELN number (optional)
 *   Column E or "Chipnummer"/"chipNumber" = chip number (optional, 15 digits)
 *
 * Supports both header-based and positional parsing.
 */
export function parseHorseImportFile(
  parseResult: ParseResult,
): HorseImportRow[] {
  const rows: HorseImportRow[] = [];
  const headers = parseResult.headers;

  if (headers.length < 2) return rows;

  // Map column names to field names (case-insensitive)
  const emailCol = findColumn(headers, ["email", "e-post", "epost", "owner"]);
  const nameCol = findColumn(headers, ["namn", "name", "horse"]);
  const dobCol = findColumn(headers, [
    "födelsedatum",
    "dateofbirth",
    "birth",
    "dob",
  ]);
  const uelnCol = findColumn(headers, ["ueln-nummer", "ueln", "ueln number"]);
  const chipCol = findColumn(headers, [
    "chipnummer",
    "chipnumber",
    "chip",
    "chip number",
  ]);

  for (let rowIndex = 0; rowIndex < parseResult.rows.length; rowIndex++) {
    const row = parseResult.rows[rowIndex]!;
    const email = getCell(row, emailCol, rowIndex, 0)?.trim().toLowerCase();
    const horseName = getCell(row, nameCol, rowIndex, 1)?.trim();

    if (!email || !horseName) continue; // Skip empty rows

    const dateOfBirth = getCell(row, dobCol, rowIndex, 2)?.trim();
    const ueln = getCell(row, uelnCol, rowIndex, 3)?.trim();
    const chipNumber = getCell(row, chipCol, rowIndex, 4)?.trim();

    rows.push({
      ownerEmail: email,
      horseName,
      dateOfBirth: dateOfBirth ? normalizeDate(dateOfBirth) : undefined,
      ueln: ueln || undefined,
      chipNumber: chipNumber || undefined,
      rowIndex,
    });
  }

  return rows;
}

/**
 * @deprecated Use parseHorseImportFile instead.
 * Unpivot parsed horse import data.
 *
 * Expected file format:
 *   Column A = owner email
 *   Column B, C, D, ... = horse names (variable count per row)
 *
 * Each non-empty horse cell produces one HorseImportRow.
 */
export function unpivotHorseData(parseResult: ParseResult): HorseImportRow[] {
  const rows: HorseImportRow[] = [];
  const headers = parseResult.headers;

  if (headers.length < 2) return rows;

  const emailColumn = headers[0]!;
  const horseColumns = headers.slice(1);

  for (let rowIndex = 0; rowIndex < parseResult.rows.length; rowIndex++) {
    const row = parseResult.rows[rowIndex]!;
    const email = (row[emailColumn] ?? "").trim().toLowerCase();

    if (!email) continue;

    for (const col of horseColumns) {
      const horseName = (row[col] ?? "").trim();
      if (horseName) {
        rows.push({
          ownerEmail: email,
          horseName,
          rowIndex,
        });
      }
    }
  }

  return rows;
}
