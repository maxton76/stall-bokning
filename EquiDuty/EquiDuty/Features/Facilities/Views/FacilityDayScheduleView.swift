//
//  FacilityDayScheduleView.swift
//  EquiDuty
//
//  Vertical time grid showing available and booked slots for a day
//

import SwiftUI

struct FacilityDayScheduleView: View {
    let availableSlots: AvailableSlotsResponse?
    let reservations: [FacilityReservation]
    var onSlotTapped: ((_ startTime: String, _ endTime: String) -> Void)?
    var onReservationTapped: ((_ reservation: FacilityReservation) -> Void)?

    /// Hours to display (6 AM to 10 PM)
    private let displayHours = Array(6...21)
    private let slotHeight: CGFloat = 48
    /// Width of the time label column + spacing
    private let timeLabelWidth: CGFloat = 40 + 8

    // Drag-to-select state
    @State private var isDragging = false
    @State private var dragStartSlot: Int?
    @State private var dragEndSlot: Int?

    /// Total number of 30-min slots
    private var totalSlots: Int { displayHours.count * 2 }

    /// First display hour (e.g. 6)
    private var firstHour: Int { displayHours.first ?? 6 }
    /// Last display hour end (e.g. 22:00)
    private var lastMinutes: Int { ((displayHours.last ?? 21) + 1) * 60 }

    /// Reservations that are visible in the display range and not cancelled/rejected
    private var visibleReservations: [FacilityReservation] {
        let calendar = Calendar.current
        let displayStart = firstHour * 60
        let displayEnd = lastMinutes

        return reservations.filter { reservation in
            guard reservation.status != .cancelled && reservation.status != .rejected else { return false }
            let startMinutes = calendar.component(.hour, from: reservation.startTime) * 60
                + calendar.component(.minute, from: reservation.startTime)
            let endMinutes = calendar.component(.hour, from: reservation.endTime) * 60
                + calendar.component(.minute, from: reservation.endTime)
            // Overlaps the visible range
            return startMinutes < displayEnd && endMinutes > displayStart
        }
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            // Base grid
            VStack(alignment: .leading, spacing: 0) {
                ForEach(displayHours, id: \.self) { hour in
                    HStack(alignment: .top, spacing: EquiDutyDesign.Spacing.sm) {
                        // Time label
                        Text(String(format: "%02d:00", hour))
                            .font(.caption2)
                            .monospacedDigit()
                            .foregroundStyle(.secondary)
                            .frame(width: 40, alignment: .trailing)

                        // Slot area
                        VStack(spacing: 0) {
                            slotView(hour: hour, minute: 0)
                            slotView(hour: hour, minute: 30)
                        }
                    }
                    .frame(height: slotHeight)
                }
            }

            // Reservation overlay blocks (merged, continuous)
            ForEach(visibleReservations) { reservation in
                reservationOverlay(reservation)
            }

            // Drag selection overlay
            if isDragging, let start = dragStartSlot, let end = dragEndSlot {
                let minSlot = min(start, end)
                let maxSlot = max(start, end)
                let rangeAvailable = isRangeAvailable(from: minSlot, to: maxSlot)

                Rectangle()
                    .fill(rangeAvailable ? Color.blue.opacity(0.3) : Color.red.opacity(0.3))
                    .border(rangeAvailable ? Color.blue : Color.red, width: 2)
                    .frame(height: CGFloat(maxSlot - minSlot + 1) * (slotHeight / 2))
                    .offset(
                        x: timeLabelWidth,
                        y: CGFloat(minSlot) * (slotHeight / 2)
                    )
                    .allowsHitTesting(false)
            }
        }
        .padding(.horizontal)
        .contentShape(Rectangle())
        .gesture(
            DragGesture(minimumDistance: 20)
                .onChanged { value in
                    let startSlot = slotIndex(forY: value.startLocation.y)
                    let currentSlot = slotIndex(forY: value.location.y)
                    // Only activate if drag started in the slot area (past time labels)
                    guard value.startLocation.x > timeLabelWidth else { return }
                    isDragging = true
                    dragStartSlot = startSlot
                    dragEndSlot = currentSlot
                }
                .onEnded { _ in
                    guard isDragging,
                          let start = dragStartSlot,
                          let end = dragEndSlot else {
                        resetDrag()
                        return
                    }
                    let minSlot = min(start, end)
                    let maxSlot = max(start, end)
                    if isRangeAvailable(from: minSlot, to: maxSlot) {
                        let startTime = timeString(forSlotIndex: minSlot)
                        let endTime = timeString(forSlotIndex: maxSlot + 1)
                        onSlotTapped?(startTime, endTime)
                    }
                    resetDrag()
                }
        )
    }

    // MARK: - Reservation Overlay

    @ViewBuilder
    private func reservationOverlay(_ reservation: FacilityReservation) -> some View {
        let layout = reservationLayout(reservation)

        RoundedRectangle(cornerRadius: 6)
            .fill(Color.red.opacity(0.75))
            .overlay(
                VStack(alignment: .leading, spacing: 2) {
                    Text(reservation.userFullName ?? reservation.userEmail ?? "")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .lineLimit(1)

                    Text(reservationTimeLabel(reservation))
                        .font(.caption2)
                        .lineLimit(1)

                    if let horseName = reservation.horseName, !horseName.isEmpty {
                        Text(horseName)
                            .font(.caption2)
                            .lineLimit(1)
                            .opacity(0.85)
                    }
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            )
            .frame(height: layout.height)
            .offset(x: timeLabelWidth, y: layout.yOffset)
            .padding(.trailing, timeLabelWidth) // match left inset for proper width
            .onTapGesture {
                onReservationTapped?(reservation)
            }
    }

    private func reservationLayout(_ reservation: FacilityReservation) -> (yOffset: CGFloat, height: CGFloat) {
        let calendar = Calendar.current
        let displayStart = firstHour * 60

        let startMinutes = max(
            calendar.component(.hour, from: reservation.startTime) * 60
                + calendar.component(.minute, from: reservation.startTime),
            displayStart
        )
        let endMinutes = min(
            calendar.component(.hour, from: reservation.endTime) * 60
                + calendar.component(.minute, from: reservation.endTime),
            lastMinutes
        )

        let pixelsPerMinute = slotHeight / 60.0 // slotHeight covers 1 hour (2 x 30min slots)
        let yOffset = CGFloat(startMinutes - displayStart) * pixelsPerMinute
        let height = max(CGFloat(endMinutes - startMinutes) * pixelsPerMinute, slotHeight / 2)

        return (yOffset, height)
    }

    private func reservationTimeLabel(_ reservation: FacilityReservation) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return "\(formatter.string(from: reservation.startTime)) – \(formatter.string(from: reservation.endTime))"
    }

    // MARK: - Drag Helpers

    private func slotIndex(forY y: CGFloat) -> Int {
        let halfSlotHeight = slotHeight / 2
        let index = Int(y / halfSlotHeight)
        return max(0, min(index, totalSlots - 1))
    }

    private func timeString(forSlotIndex index: Int) -> String {
        let totalMinutes = firstHour * 60 + index * 30
        let hour = totalMinutes / 60
        let minute = totalMinutes % 60
        return String(format: "%02d:%02d", hour, minute)
    }

    private func isRangeAvailable(from startSlot: Int, to endSlot: Int) -> Bool {
        for slot in startSlot...endSlot {
            let time = timeString(forSlotIndex: slot)
            if !isSlotAvailable(time) { return false }
            let totalMinutes = firstHour * 60 + slot * 30
            let hour = totalMinutes / 60
            let minute = totalMinutes % 60
            if reservationAt(hour: hour, minute: minute) != nil { return false }
        }
        return true
    }

    private func resetDrag() {
        isDragging = false
        dragStartSlot = nil
        dragEndSlot = nil
    }

    // MARK: - Slot Views

    @ViewBuilder
    private func slotView(hour: Int, minute: Int) -> some View {
        let timeString = String(format: "%02d:%02d", hour, minute)
        let nextTimeString = minute == 0
            ? String(format: "%02d:30", hour)
            : String(format: "%02d:00", hour + 1)

        let hasReservation = reservationAt(hour: hour, minute: minute) != nil
        let isAvailable = isSlotAvailable(timeString)

        ZStack(alignment: .leading) {
            Rectangle()
                .fill(slotColor(isAvailable: isAvailable, hasReservation: hasReservation))
                .frame(height: slotHeight / 2)
            // Reservation text is now rendered in the overlay blocks
        }
        .clipShape(RoundedRectangle(cornerRadius: 4))
        .onTapGesture {
            if isAvailable && !hasReservation {
                onSlotTapped?(timeString, nextTimeString)
            }
        }
    }

    private func slotColor(isAvailable: Bool, hasReservation: Bool) -> Color {
        if hasReservation {
            // Light tint underneath the overlay block
            return .red.opacity(0.1)
        } else if isAvailable {
            return .green.opacity(0.15)
        } else {
            return Color(.systemGray5)
        }
    }

    private func isSlotAvailable(_ time: String) -> Bool {
        guard let slots = availableSlots else { return false }
        return slots.timeBlocks.contains { block in
            time >= block.from && time < block.to
        }
    }

    private func reservationAt(hour: Int, minute: Int) -> FacilityReservation? {
        let calendar = Calendar.current
        return reservations.first { reservation in
            let startHour = calendar.component(.hour, from: reservation.startTime)
            let startMinute = calendar.component(.minute, from: reservation.startTime)
            let endHour = calendar.component(.hour, from: reservation.endTime)
            let endMinute = calendar.component(.minute, from: reservation.endTime)

            let slotMinutes = hour * 60 + minute
            let startMinutes = startHour * 60 + startMinute
            let endMinutes = endHour * 60 + endMinute

            return slotMinutes >= startMinutes && slotMinutes < endMinutes
                && reservation.status != .cancelled && reservation.status != .rejected
        }
    }
}
