//
//  HorseFilterSheet.swift
//  EquiDuty
//
//  Advanced filtering options for horse list
//

import SwiftUI

struct HorseFilters: Equatable {
    var status: HorseStatus?
    var genders: Set<HorseGender> = []
    var usages: Set<HorseUsage> = []
    var minAge: Int?
    var maxAge: Int?
    var horseGroupId: String?
    var sortBy: SortOption = .name
    var sortAscending: Bool = true

    enum SortOption: String, CaseIterable {
        case name
        case age
        case recentActivity

        var displayName: String {
            switch self {
            case .name: return String(localized: "horse.filter.sort.name")
            case .age: return String(localized: "horse.filter.sort.age")
            case .recentActivity: return String(localized: "horse.filter.sort.recent")
            }
        }
    }

    var hasActiveFilters: Bool {
        status != nil ||
        !genders.isEmpty ||
        !usages.isEmpty ||
        minAge != nil ||
        maxAge != nil ||
        horseGroupId != nil
    }

    var activeFilterCount: Int {
        var count = 0
        if status != nil { count += 1 }
        if !genders.isEmpty { count += genders.count }
        if !usages.isEmpty { count += usages.count }
        if minAge != nil || maxAge != nil { count += 1 }
        if horseGroupId != nil { count += 1 }
        return count
    }

    mutating func clearAll() {
        status = nil
        genders = []
        usages = []
        minAge = nil
        maxAge = nil
        horseGroupId = nil
    }
}

struct HorseFilterSheet: View {
    @Binding var filters: HorseFilters
    let horseGroups: [HorseGroup]
    let onApply: () -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var localFilters: HorseFilters = HorseFilters()

    var body: some View {
        NavigationStack {
            Form {
                // Status
                Section(String(localized: "horse.filter.status")) {
                    Picker(String(localized: "horse.filter.status"), selection: $localFilters.status) {
                        Text(String(localized: "filter.all")).tag(nil as HorseStatus?)
                        ForEach(HorseStatus.allCases, id: \.self) { status in
                            Text(status.displayName).tag(status as HorseStatus?)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                // Gender
                Section(String(localized: "horse.filter.gender")) {
                    ForEach(HorseGender.allCases, id: \.self) { gender in
                        Toggle(gender.displayName, isOn: Binding(
                            get: { localFilters.genders.contains(gender) },
                            set: { isOn in
                                if isOn {
                                    localFilters.genders.insert(gender)
                                } else {
                                    localFilters.genders.remove(gender)
                                }
                            }
                        ))
                    }
                }

                // Usage
                Section(String(localized: "horse.filter.usage")) {
                    ForEach(HorseUsage.allCases, id: \.self) { usage in
                        Toggle(usage.displayName, isOn: Binding(
                            get: { localFilters.usages.contains(usage) },
                            set: { isOn in
                                if isOn {
                                    localFilters.usages.insert(usage)
                                } else {
                                    localFilters.usages.remove(usage)
                                }
                            }
                        ))
                    }
                }

                // Age Range
                Section(String(localized: "horse.filter.age")) {
                    HStack {
                        Text(String(localized: "horse.filter.age.min"))
                        Spacer()
                        TextField("0", value: $localFilters.minAge, format: .number)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 60)
                        Text(String(localized: "common.years"))
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text(String(localized: "horse.filter.age.max"))
                        Spacer()
                        TextField("30", value: $localFilters.maxAge, format: .number)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 60)
                        Text(String(localized: "common.years"))
                            .foregroundStyle(.secondary)
                    }
                }

                // Horse Group
                if !horseGroups.isEmpty {
                    Section(String(localized: "horse.filter.group")) {
                        Picker(String(localized: "horse.filter.group"), selection: $localFilters.horseGroupId) {
                            Text(String(localized: "filter.all")).tag(nil as String?)
                            ForEach(horseGroups) { group in
                                Text(group.name).tag(group.id as String?)
                            }
                        }
                    }
                }

                // Sorting
                Section(String(localized: "horse.filter.sort")) {
                    Picker(String(localized: "horse.filter.sort.by"), selection: $localFilters.sortBy) {
                        ForEach(HorseFilters.SortOption.allCases, id: \.self) { option in
                            Text(option.displayName).tag(option)
                        }
                    }

                    Toggle(String(localized: "horse.filter.sort.ascending"), isOn: $localFilters.sortAscending)
                }

                // Clear filters
                if localFilters.hasActiveFilters {
                    Section {
                        Button(role: .destructive) {
                            localFilters.clearAll()
                        } label: {
                            HStack {
                                Spacer()
                                Text(String(localized: "horse.filter.clear_all"))
                                Spacer()
                            }
                        }
                    }
                }
            }
            .navigationTitle(String(localized: "horse.filter.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.cancel")) {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button(String(localized: "common.apply")) {
                        filters = localFilters
                        onApply()
                        dismiss()
                    }
                }
            }
            .onAppear {
                localFilters = filters
            }
        }
    }
}

#Preview {
    HorseFilterSheet(
        filters: .constant(HorseFilters()),
        horseGroups: [
            HorseGroup(
                id: "group1",
                organizationId: "org1",
                name: "Competition Horses",
                createdAt: Date(),
                updatedAt: Date(),
                createdBy: "user1"
            )
        ],
        onApply: {}
    )
}
