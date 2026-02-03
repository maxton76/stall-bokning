import type { ParseResult } from "./importParser";

/**
 * A single unpivoted horse row: one horse per row.
 */
export interface HorseImportRow {
  ownerEmail: string;
  horseName: string;
  rowIndex: number;
}

/**
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
