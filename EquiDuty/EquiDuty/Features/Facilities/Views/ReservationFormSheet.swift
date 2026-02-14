//
//  ReservationFormSheet.swift
//  EquiDuty
//
//  Sheet for creating or editing a facility reservation
//

import SwiftUI

struct ReservationFormSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: ReservationFormViewModel
    @State private var showHorseSelectionSheet = false

    /// Create mode: new reservation with optional pre-filled times
    init(
        facilityId: String,
        facilityName: String,
        date: Date? = nil,
        startTime: String? = nil,
        endTime: String? = nil,
        existingReservationId: String? = nil
    ) {
        _viewModel = State(initialValue: ReservationFormViewModel(
            facilityId: facilityId,
            facilityName: facilityName,
            date: date,
            startTime: startTime,
            endTime: endTime,
            existingReservationId: existingReservationId
        ))
    }

    /// Edit mode: pre-fill from an existing reservation
    init(
        facilityId: String,
        facilityName: String,
        date: Date? = nil,
        existingReservation: FacilityReservation
    ) {
        _viewModel = State(initialValue: ReservationFormViewModel(
            facilityId: facilityId,
            facilityName: facilityName,
            date: date,
            existingReservation: existingReservation
        ))
    }

    var body: some View {
        NavigationStack {
            Form {
                facilityInfoSection
                dateTimeSection
                horseSelectionSection
                externalHorseSection
                optionalFieldsSection
                recurringWeeklySection
                errorSection
                suggestedSlotsSection
            }
            .navigationTitle(viewModel.isEditMode
                ? String(localized: "reservation.edit")
                : String(localized: "reservation.create"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                toolbarContent
            }
            .onChange(of: viewModel.startTime) { _, _ in
                Task { await viewModel.checkConflicts() }
            }
            .onChange(of: viewModel.endTime) { _, _ in
                Task { await viewModel.checkConflicts() }
            }
            .onChange(of: viewModel.selectedDate) { _, _ in
                Task { await viewModel.checkConflicts() }
            }
            .onChange(of: viewModel.didSave) { _, saved in
                if saved { dismiss() }
            }
            .task {
                await viewModel.loadHorses()
            }
            .sheet(isPresented: $showHorseSelectionSheet) {
                HorseSelectionSheet(viewModel: viewModel)
            }
        }
    }

    // MARK: - View Sections

    private var facilityInfoSection: some View {
        Section {
            LabeledContent(String(localized: "facilities.title"), value: viewModel.facilityName)
        }
    }

    private var dateTimeSection: some View {
        Section {
            DatePicker(
                String(localized: "reservation.date"),
                selection: $viewModel.selectedDate,
                displayedComponents: .date
            )

            HStack {
                Text(String(localized: "reservation.startTime"))
                Spacer()
                MinuteIntervalDatePicker(selection: $viewModel.startTime, minuteInterval: 5)
                    .frame(maxWidth: 150, maxHeight: 120)
            }

            HStack {
                Text(String(localized: "reservation.endTime"))
                Spacer()
                MinuteIntervalDatePicker(selection: $viewModel.endTime, minuteInterval: 5)
                    .frame(maxWidth: 150, maxHeight: 120)
            }

            // Conflict warning
            if viewModel.hasConflict {
                Label(
                    viewModel.conflictMessage ?? String(localized: "reservation.conflict"),
                    systemImage: "exclamationmark.triangle.fill"
                )
                .foregroundStyle(.orange)
                .font(.subheadline)
            }
        }
    }

    @ViewBuilder
    private var horseSelectionSection: some View {

        Section {
            if viewModel.isLoadingHorses {
                HStack {
                    Text(String(localized: "reservation.horses"))
                    Spacer()
                    ProgressView()
                }
            } else if viewModel.availableHorses.isEmpty {
                Text(String(localized: "reservation.noHorsesAvailable"))
                    .foregroundStyle(.secondary)
            } else {
                // Compact tappable row to open horse selection sheet
                Button {
                    showHorseSelectionSheet = true
                } label: {
                    HStack {
                        Text(String(localized: "reservation.horses"))
                            .foregroundStyle(.primary)
                        Spacer()
                        if viewModel.selectedHorseIds.isEmpty {
                            Text(String(localized: "reservation.selectHorses"))
                                .foregroundStyle(.secondary)
                        } else {
                            Text(String(localized: "reservation.horsesSelected \(viewModel.selectedHorseIds.count)"))
                                .foregroundStyle(.secondary)
                        }
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                }

                selectedHorsesChips
                capacityInfo
            }
        } header: {
            Text(String(localized: "reservation.horses"))
        }
    }

    @ViewBuilder
    private var selectedHorsesChips: some View {
        if !viewModel.selectedHorseIds.isEmpty {
            FlowLayout(spacing: 6) {
                ForEach(viewModel.selectedHorses) { horse in
                    HStack(spacing: 4) {
                        Text(horse.name)
                            .font(.subheadline)
                        Button {
                            viewModel.removeHorse(horse.id)
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.caption)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color.accentColor.opacity(0.15))
                    .foregroundStyle(Color.accentColor)
                    .clipShape(Capsule())
                }
            }
        }
    }

    @ViewBuilder
    private var capacityInfo: some View {
        if let message = viewModel.capacityMessage {
            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
        }

        if !viewModel.canAddMoreHorses && !viewModel.selectedHorseIds.isEmpty {
            Label(
                String(localized: "reservation.capacity.full"),
                systemImage: "exclamationmark.triangle.fill"
            )
            .foregroundStyle(.orange)
            .font(.subheadline)
        }
    }

    private var externalHorseSection: some View {

        let maxExternal = max(0, viewModel.remainingCapacity - viewModel.selectedHorseIds.count)
        return Section {
            Stepper(
                value: $viewModel.externalHorseCount,
                in: 0...maxExternal
            ) {
                HStack {
                    Text(String(localized: "reservation.externalHorseCount"))
                    Spacer()
                    Text("\(viewModel.externalHorseCount)")
                        .foregroundStyle(.secondary)
                }
            }
            Text(String(localized: "reservation.externalHorseCount.description"))
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private var optionalFieldsSection: some View {
        Section {
            TextField(String(localized: "reservation.purpose"), text: $viewModel.purpose)
            TextField(String(localized: "reservation.notes"), text: $viewModel.notes, axis: .vertical)
                .lineLimit(3...6)
            TextField(
                String(localized: "reservation.contactInfo.placeholder"),
                text: $viewModel.contactInfo
            )
        }
    }

    @ViewBuilder
    private var recurringWeeklySection: some View {
        if !viewModel.isEditMode {
            Section {
                Toggle(String(localized: "reservation.recurringWeekly"), isOn: $viewModel.recurringWeekly)
                if viewModel.recurringWeekly {
                    Text(String(localized: "reservation.recurringWeekly.description"))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    @ViewBuilder
    private var errorSection: some View {
        if let error = viewModel.errorMessage {
            Section {
                Text(error)
                    .foregroundStyle(.red)
                    .font(.subheadline)
            }
        }
    }

    @ViewBuilder
    private var suggestedSlotsSection: some View {
        if !viewModel.suggestedSlots.isEmpty {
            Section {
                ForEach(Array(viewModel.suggestedSlots.enumerated()), id: \.offset) { _, slot in
                    Button {
                        viewModel.selectSuggestedSlot(slot)
                    } label: {
                        HStack {
                            Image(systemName: "clock.arrow.circlepath")
                                .foregroundStyle(Color.accentColor)
                            Text(formatSlotTimeRange(slot))
                                .foregroundStyle(.primary)
                            Spacer()
                            Text("(\(slot.remainingCapacity) " + String(localized: "reservation.suggestedSlots.spotsAvailable") + ")")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            } header: {
                Text(String(localized: "reservation.suggestedSlots.header"))
            }
        }
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .cancellationAction) {
            Button(String(localized: "common.cancel")) {
                dismiss()
            }
        }

        ToolbarItem(placement: .confirmationAction) {
            Button {
                Task { await viewModel.submit() }
            } label: {
                if viewModel.isSubmitting {
                    ProgressView()
                } else {
                    Text(String(localized: "common.save"))
                }
            }
            .disabled(!viewModel.canSubmit)
        }
    }

    /// Format a suggested slot's start/end ISO strings as "HH:mm \u{2013} HH:mm"
    private func formatSlotTimeRange(_ slot: SuggestedSlot) -> String {
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        let isoFormatterNoFrac = ISO8601DateFormatter()
        isoFormatterNoFrac.formatOptions = [.withInternetDateTime]

        let start = isoFormatter.date(from: slot.startTime) ?? isoFormatterNoFrac.date(from: slot.startTime)
        let end = isoFormatter.date(from: slot.endTime) ?? isoFormatterNoFrac.date(from: slot.endTime)

        guard let start, let end else { return "\(slot.startTime) \u{2013} \(slot.endTime)" }

        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HH:mm"
        timeFormatter.locale = Locale(identifier: "sv_SE")

        return "\(timeFormatter.string(from: start)) \u{2013} \(timeFormatter.string(from: end))"
    }
}

/// Simple flow layout for horse chips
struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = layout(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = layout(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func layout(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentX + size.width > maxWidth && currentX > 0 {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            positions.append(CGPoint(x: currentX, y: currentY))
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
        }

        return (CGSize(width: maxWidth, height: currentY + lineHeight), positions)
    }
}
