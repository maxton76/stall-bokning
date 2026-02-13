//
//  MinuteIntervalDatePicker.swift
//  EquiDuty
//
//  UIDatePicker wrapper with minuteInterval support
//

import SwiftUI

struct MinuteIntervalDatePicker: UIViewRepresentable {
    @Binding var selection: Date
    var minuteInterval: Int = 5

    func makeUIView(context: Context) -> UIDatePicker {
        let picker = UIDatePicker()
        picker.datePickerMode = .time
        picker.preferredDatePickerStyle = .wheels
        picker.minuteInterval = minuteInterval
        picker.addTarget(context.coordinator, action: #selector(Coordinator.dateChanged(_:)), for: .valueChanged)
        picker.setContentHuggingPriority(.required, for: .horizontal)
        return picker
    }

    func updateUIView(_ picker: UIDatePicker, context: Context) {
        picker.date = selection
        picker.minuteInterval = minuteInterval
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(selection: $selection)
    }

    final class Coordinator: NSObject {
        private let selection: Binding<Date>

        init(selection: Binding<Date>) {
            self.selection = selection
        }

        @objc func dateChanged(_ sender: UIDatePicker) {
            selection.wrappedValue = sender.date
        }
    }
}
