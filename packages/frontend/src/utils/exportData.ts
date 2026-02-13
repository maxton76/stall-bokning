/**
 * Data Export Utilities
 * Generate CSV and PDF exports for analytics and reports
 */

import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export interface FacilityUtilizationData {
  facilityId: string;
  facilityName: string;
  bookings: number;
  bookedHours: number;
}

export interface TopUserData {
  userId: string;
  userEmail: string;
  userName?: string;
  bookingCount: number;
}

export interface AnalyticsMetrics {
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShows: number;
  averageDuration: number;
  noShowRate: number;
  peakHour: number | null;
}

export interface AnalyticsExportData {
  metrics: AnalyticsMetrics;
  facilityUtilization: FacilityUtilizationData[];
  topUsers: TopUserData[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Export analytics data to CSV format
 */
export function exportAnalyticsToCSV(data: AnalyticsExportData): void {
  const { metrics, facilityUtilization, topUsers, dateRange } = data;

  // Create CSV data structure
  const csvData: string[][] = [];

  // Header section
  csvData.push(["Facility Reservations Analytics Report"]);
  csvData.push(["Generated:", new Date().toLocaleString()]);
  csvData.push([
    "Date Range:",
    `${dateRange.startDate} to ${dateRange.endDate}`,
  ]);
  csvData.push([]);

  // Metrics section
  csvData.push(["Metrics"]);
  csvData.push(["Total Bookings", metrics.totalBookings.toString()]);
  csvData.push(["Confirmed Bookings", metrics.confirmedBookings.toString()]);
  csvData.push(["Completed Bookings", metrics.completedBookings.toString()]);
  csvData.push(["Cancelled Bookings", metrics.cancelledBookings.toString()]);
  csvData.push(["No-Shows", metrics.noShows.toString()]);
  csvData.push(["Average Duration (min)", metrics.averageDuration.toFixed(1)]);
  csvData.push(["No-Show Rate (%)", metrics.noShowRate.toFixed(1)]);
  csvData.push([
    "Peak Hour",
    metrics.peakHour !== null
      ? `${metrics.peakHour}:00 - ${metrics.peakHour + 1}:00`
      : "N/A",
  ]);
  csvData.push([]);

  // Facility utilization section
  csvData.push(["Facility Utilization"]);
  csvData.push(["Facility Name", "Bookings", "Booked Hours"]);
  facilityUtilization.forEach((facility) => {
    csvData.push([
      facility.facilityName,
      facility.bookings.toString(),
      facility.bookedHours.toFixed(1),
    ]);
  });
  csvData.push([]);

  // Top users section
  csvData.push(["Top Users by Booking Frequency"]);
  csvData.push(["User Name", "Email", "Booking Count"]);
  topUsers.forEach((user) => {
    csvData.push([
      user.userName || "N/A",
      user.userEmail,
      user.bookingCount.toString(),
    ]);
  });

  // Convert to CSV string
  const csv = Papa.unparse(csvData, {
    quotes: true,
    delimiter: ",",
  });

  // Trigger download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `facility-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export analytics data to PDF format
 */
export function exportAnalyticsToPDF(data: AnalyticsExportData): void {
  const { metrics, facilityUtilization, topUsers, dateRange } = data;

  // Create PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Facility Reservations Analytics Report", pageWidth / 2, currentY, {
    align: "center",
  });
  currentY += 10;

  // Metadata
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, currentY);
  currentY += 5;
  doc.text(
    `Date Range: ${dateRange.startDate} to ${dateRange.endDate}`,
    14,
    currentY,
  );
  currentY += 10;

  // Metrics section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Key Metrics", 14, currentY);
  currentY += 2;

  autoTable(doc, {
    startY: currentY,
    head: [["Metric", "Value"]],
    body: [
      ["Total Bookings", metrics.totalBookings.toString()],
      ["Confirmed Bookings", metrics.confirmedBookings.toString()],
      ["Completed Bookings", metrics.completedBookings.toString()],
      ["Cancelled Bookings", metrics.cancelledBookings.toString()],
      ["No-Shows", metrics.noShows.toString()],
      ["Average Duration (min)", metrics.averageDuration.toFixed(1)],
      ["No-Show Rate (%)", `${metrics.noShowRate.toFixed(1)}%`],
      [
        "Peak Hour",
        metrics.peakHour !== null
          ? `${metrics.peakHour}:00 - ${metrics.peakHour + 1}:00`
          : "N/A",
      ],
    ],
    theme: "grid",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229], fontStyle: "bold" },
    margin: { left: 14, right: 14 },
  });

  // Update Y position after first table
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Facility utilization section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Facility Utilization", 14, currentY);
  currentY += 2;

  autoTable(doc, {
    startY: currentY,
    head: [["Facility Name", "Bookings", "Booked Hours"]],
    body: facilityUtilization.map((facility) => [
      facility.facilityName,
      facility.bookings.toString(),
      facility.bookedHours.toFixed(1),
    ]),
    theme: "grid",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229], fontStyle: "bold" },
    margin: { left: 14, right: 14 },
  });

  // Update Y position
  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Check if we need a new page for top users
  if (currentY > 250) {
    doc.addPage();
    currentY = 20;
  }

  // Top users section
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Top Users by Booking Frequency", 14, currentY);
  currentY += 2;

  autoTable(doc, {
    startY: currentY,
    head: [["User Name", "Email", "Booking Count"]],
    body: topUsers.map((user) => [
      user.userName || "N/A",
      user.userEmail,
      user.bookingCount.toString(),
    ]),
    theme: "grid",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229], fontStyle: "bold" },
    margin: { left: 14, right: 14 },
  });

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" },
    );
  }

  // Save PDF
  doc.save(`facility-analytics-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

/**
 * Export reservation list to CSV format
 */
export function exportReservationsToCSV(
  reservations: any[],
  filename?: string,
): void {
  if (reservations.length === 0) {
    console.warn("No reservations to export");
    return;
  }

  // Format data for CSV
  const csvData = reservations.map((reservation) => ({
    "Reservation ID": reservation.id,
    "Facility Name": reservation.facilityName || "N/A",
    Date: reservation.startTime
      ? format(new Date(reservation.startTime), "yyyy-MM-dd")
      : "N/A",
    "Start Time": reservation.startTime
      ? format(new Date(reservation.startTime), "HH:mm")
      : "N/A",
    "End Time": reservation.endTime
      ? format(new Date(reservation.endTime), "HH:mm")
      : "N/A",
    "User Name": reservation.userFullName || "N/A",
    "User Email": reservation.userEmail || "N/A",
    Horse: reservation.horseName || "N/A",
    Status: reservation.status || "N/A",
    Notes: reservation.notes || "",
  }));

  // Convert to CSV
  const csv = Papa.unparse(csvData, {
    quotes: true,
    delimiter: ",",
  });

  // Download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    filename || `reservations-${format(new Date(), "yyyy-MM-dd")}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
