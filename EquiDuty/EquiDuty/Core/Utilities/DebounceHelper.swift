//
//  DebounceHelper.swift
//  EquiDuty
//
//  Debouncing utility for search and other delayed operations
//

import Foundation
import Combine

@MainActor
class Debouncer: ObservableObject {
    @Published var text: String = ""
    @Published var debouncedText: String = ""

    private var cancellables = Set<AnyCancellable>()

    init(delay: TimeInterval = 0.3) {
        $text
            .debounce(for: .seconds(delay), scheduler: DispatchQueue.main)
            .sink { [weak self] value in
                self?.debouncedText = value
            }
            .store(in: &cancellables)
    }
}
