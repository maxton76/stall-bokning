import * as XLSX from "xlsx";
import type { Horse } from "@/types/roles";
import { toDate } from "@/utils/timestampUtils";

/**
 * Export data interface for horses
 */
interface HorseExportData {
  Name: string;
  Gender: string;
  Age: string;
  Stable: string;
  Identification: string;
  Owner: string;
  Breed: string;
  Color: string;
  Status: string;
}

/**
 * Convert horse data to export format
 */
function prepareHorseData(horses: Horse[]): HorseExportData[] {
  return horses.map((horse) => {
    let age = "";
    if (horse.age !== undefined) {
      age = `${horse.age} years`;
    } else if (horse.dateOfBirth) {
      const birthDate = toDate(horse.dateOfBirth);
      if (birthDate) {
        const today = new Date();
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          calculatedAge--;
        }
        age = `${calculatedAge} years`;
      }
    }

    return {
      Name: horse.name || "",
      Gender: horse.gender
        ? horse.gender.charAt(0).toUpperCase() + horse.gender.slice(1)
        : "",
      Age: age,
      Stable: horse.currentStableName || "Unassigned",
      Identification: horse.ueln || horse.chipNumber || "",
      Owner: horse.ownerName || "",
      Breed: horse.breed || "",
      Color: horse.color || "",
      Status: horse.status
        ? horse.status.charAt(0).toUpperCase() + horse.status.slice(1)
        : "",
    };
  });
}

/**
 * Generate filename with timestamp
 */
function generateFilename(prefix: string, extension: string): string {
  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `${prefix}_${timestamp}.${extension}`;
}

/**
 * Export horses to CSV format
 * @param horses - Array of horses to export
 * @param filename - Optional filename (default: horses_YYYY-MM-DD.csv)
 */
export function exportToCSV(horses: Horse[], filename?: string): void {
  const data = prepareHorseData(horses);

  if (data.length === 0) {
    alert("No data to export");
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]!);

  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(","),
    // Data rows
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header as keyof HorseExportData];
          // Escape commas and quotes
          if (
            value.includes(",") ||
            value.includes('"') ||
            value.includes("\n")
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(","),
    ),
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename || generateFilename("horses", "csv"));
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export horses to Excel format
 * @param horses - Array of horses to export
 * @param filename - Optional filename (default: horses_YYYY-MM-DD.xlsx)
 */
export function exportToExcel(horses: Horse[], filename?: string): void {
  const data = prepareHorseData(horses);

  if (data.length === 0) {
    alert("No data to export");
    return;
  }

  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths
  const columnWidths = [
    { wch: 20 }, // Name
    { wch: 10 }, // Gender
    { wch: 10 }, // Age
    { wch: 20 }, // Stable
    { wch: 20 }, // Identification
    { wch: 20 }, // Owner
    { wch: 15 }, // Breed
    { wch: 15 }, // Color
    { wch: 10 }, // Status
  ];
  worksheet["!cols"] = columnWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Horses");

  // Write file
  XLSX.writeFile(workbook, filename || generateFilename("horses", "xlsx"));
}

/**
 * Export horses to specified format
 * @param horses - Array of horses to export
 * @param format - Export format ('csv' or 'excel')
 * @param filename - Optional filename
 */
export function exportHorses(
  horses: Horse[],
  format: "csv" | "excel",
  filename?: string,
): void {
  if (format === "csv") {
    exportToCSV(horses, filename);
  } else {
    exportToExcel(horses, filename);
  }
}
