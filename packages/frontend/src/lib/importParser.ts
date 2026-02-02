import * as XLSX from "xlsx";

/**
 * Parsed row from an imported file
 */
export interface ParsedRow {
  [key: string]: string;
}

/**
 * Result of parsing an import file
 */
export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  hasHeaders: boolean;
}

/**
 * Mapping target fields
 */
export type MappableField =
  | "email"
  | "firstName"
  | "lastName"
  | "phoneNumber"
  | "skip";

/**
 * Column mapping configuration
 */
export interface ColumnMapping {
  sourceColumn: string;
  targetField: MappableField;
}

/**
 * Auto-detection aliases for Swedish and English headers
 */
const FIELD_ALIASES: Record<Exclude<MappableField, "skip">, string[]> = {
  email: [
    "email",
    "e-mail",
    "e-post",
    "epost",
    "mail",
    "mejl",
    "mejladress",
    "e-postadress",
    "emailaddress",
    "email address",
  ],
  firstName: [
    "firstname",
    "first name",
    "first_name",
    "förnamn",
    "fornamn",
    "namn",
    "name",
    "given name",
    "givenname",
  ],
  lastName: [
    "lastname",
    "last name",
    "last_name",
    "efternamn",
    "surname",
    "familjenamn",
    "family name",
  ],
  phoneNumber: [
    "phone",
    "phonenumber",
    "phone number",
    "phone_number",
    "telefon",
    "telefonnummer",
    "tel",
    "mobile",
    "mobil",
    "mobilnummer",
    "mobiltelefon",
    "cell",
    "cellphone",
  ],
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 100;

/**
 * Sanitize a cell value to prevent formula injection.
 * Strips leading characters that spreadsheet apps interpret as formulas.
 */
function sanitizeCell(value: string): string {
  return value.replace(/^[=+@\t\r]/, "");
}

/**
 * Generate spreadsheet-style column names: A, B, ..., Z, AA, AB, ...
 */
function generateColumnName(index: number): string {
  let name = "";
  let n = index;
  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return name;
}

/**
 * Parse an uploaded file (xlsx, xls, csv) into rows.
 * @param maxRows - Maximum number of data rows allowed (default: MAX_ROWS).
 *   When the file contains more rows than this, the promise rejects with
 *   an error message in the format "MEMBER_LIMIT_EXCEEDED:<limit>:<found>".
 */
export function parseImportFile(
  file: File,
  hasHeaders: boolean,
  maxRows: number = MAX_ROWS,
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error("FILE_TOO_LARGE"));
      return;
    }

    const validExtensions = [".xlsx", ".xls", ".csv"];
    const extension = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();
    if (!validExtensions.includes(extension)) {
      reject(new Error("INVALID_FILE_TYPE"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", codepage: 65001 });

        const firstSheetName = workbook.SheetNames[0];
        const firstSheet = firstSheetName
          ? workbook.Sheets[firstSheetName]
          : undefined;
        if (!firstSheet) {
          reject(new Error("EMPTY_FILE"));
          return;
        }

        // Parse as array of arrays
        const rawData: string[][] = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
          defval: "",
          blankrows: false,
        });

        if (rawData.length === 0) {
          reject(new Error("EMPTY_FILE"));
          return;
        }

        let headers: string[];
        let dataRows: string[][];

        if (hasHeaders) {
          headers = (rawData[0] ?? []).map((h: string) => String(h).trim());
          dataRows = rawData.slice(1);
        } else {
          // Generate Column A, B, ..., Z, AA, AB... headers
          const maxCols = Math.max(...rawData.map((r) => r.length));
          headers = Array.from({ length: maxCols }, (_, i) =>
            generateColumnName(i),
          );
          dataRows = rawData;
        }

        // Reject if more data rows than allowed
        if (dataRows.length > maxRows) {
          reject(
            new Error(`MEMBER_LIMIT_EXCEEDED:${maxRows}:${dataRows.length}`),
          );
          return;
        }

        // Convert to ParsedRow objects, trimming and sanitizing all values
        const rows: ParsedRow[] = dataRows
          .map((row) => {
            const obj: ParsedRow = {};
            headers.forEach((header, i) => {
              obj[header] = sanitizeCell(String(row[i] ?? "").trim());
            });
            return obj;
          })
          .filter((row) =>
            // Filter out completely empty rows
            Object.values(row).some((v) => v !== ""),
          );

        if (rows.length === 0) {
          reject(new Error("NO_DATA_ROWS"));
          return;
        }

        resolve({
          headers,
          rows,
          hasHeaders,
        });
      } catch {
        reject(new Error("PARSE_ERROR"));
      }
    };

    reader.onerror = () => reject(new Error("READ_ERROR"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Auto-detect column mappings based on header names
 */
export function autoDetectMappings(headers: string[]): ColumnMapping[] {
  return headers.map((header) => {
    const normalized = header.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.includes(normalized)) {
        return {
          sourceColumn: header,
          targetField: field as MappableField,
        };
      }
    }
    return {
      sourceColumn: header,
      targetField: "skip" as MappableField,
    };
  });
}

/**
 * Get sample values from rows for a given column
 */
export function getSampleValues(
  rows: ParsedRow[],
  column: string,
  count: number = 3,
): string[] {
  return rows
    .slice(0, count)
    .map((row) => row[column])
    .filter((v): v is string => v != null && v.trim() !== "");
}

/**
 * Apply column mappings to parsed rows, producing structured member data
 */
export function applyMappings(
  rows: ParsedRow[],
  mappings: ColumnMapping[],
): Array<{
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}> {
  const emailMapping = mappings.find((m) => m.targetField === "email");
  if (!emailMapping) return [];

  const firstNameMapping = mappings.find((m) => m.targetField === "firstName");
  const lastNameMapping = mappings.find((m) => m.targetField === "lastName");
  const phoneMapping = mappings.find((m) => m.targetField === "phoneNumber");

  return rows.map((row) => ({
    email: row[emailMapping.sourceColumn]?.trim().toLowerCase() || "",
    firstName: firstNameMapping
      ? row[firstNameMapping.sourceColumn]?.trim()
      : undefined,
    lastName: lastNameMapping
      ? row[lastNameMapping.sourceColumn]?.trim()
      : undefined,
    phoneNumber: phoneMapping
      ? row[phoneMapping.sourceColumn]?.trim()
      : undefined,
  }));
}

export { MAX_FILE_SIZE, MAX_ROWS };
