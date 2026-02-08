//
//  APIEndpoints.swift
//  EquiDuty
//
//  API endpoint definitions
//

import Foundation

/// API endpoint paths
enum APIEndpoints {
    // MARK: - Auth
    static let authMe = "/auth/me"

    // MARK: - Users
    static let usersMe = "/auth/me"  // Alias for backwards compatibility
    static func user(_ uid: String) -> String { "/users/\(uid)" }

    // MARK: - Organizations
    static let organizations = "/organizations"
    static func organization(_ id: String) -> String { "/organizations/\(id)" }
    static func organizationMembers(_ orgId: String) -> String { "/organizations/\(orgId)/members" }
    static func organizationMember(_ orgId: String, memberId: String) -> String {
        "/organizations/\(orgId)/members/\(memberId)"
    }

    // MARK: - Stables
    static func stables(organizationId: String) -> String {
        "/organizations/\(organizationId)/stables"
    }
    static func stable(_ orgId: String, stableId: String) -> String {
        "/organizations/\(orgId)/stables/\(stableId)"
    }
    static func stableMembers(_ orgId: String, stableId: String) -> String {
        "/organizations/\(orgId)/stables/\(stableId)/members"
    }

    // MARK: - Horses
    static let horses = "/horses"
    static func horse(_ id: String) -> String { "/horses/\(id)" }
    static func horsesByStable(_ stableId: String) -> String { "/horses?stableId=\(stableId)" }

    // MARK: - Horse Groups
    static func horseGroups(_ orgId: String) -> String { "/organizations/\(orgId)/horse-groups" }
    static func horseGroup(_ orgId: String, groupId: String) -> String {
        "/organizations/\(orgId)/horse-groups/\(groupId)"
    }

    // MARK: - Horse Vaccinations
    static func horseVaccinations(_ horseId: String) -> String { "/vaccination-records/horse/\(horseId)" }
    static func horseVaccination(_ recordId: String) -> String { "/vaccination-records/\(recordId)" }
    static func vaccinationRules(_ orgId: String) -> String { "/vaccination-rules?scope=organization&organizationId=\(orgId)" }

    // MARK: - Horse Ownership
    static let horseOwnership = "/horse-ownership"
    static func horseOwnershipByHorse(_ horseId: String) -> String { "/horse-ownership/horse/\(horseId)" }
    static func horseOwnershipById(_ ownershipId: String) -> String { "/horse-ownership/\(ownershipId)" }

    // MARK: - Horse Team
    static func horseTeam(_ horseId: String) -> String { "/horses/\(horseId)/team" }
    static func horseTeamMember(_ horseId: String, index: Int) -> String {
        "/horses/\(horseId)/team/\(index)"
    }

    // MARK: - Horse Media
    static let horseMediaUploadUrl = "/horse-media/upload-url"
    static let horseMedia = "/horse-media"

    // MARK: - Horse Activity History
    static func horseActivities(_ horseId: String) -> String { "/activities/horse/\(horseId)" }
    static func horseActivityHistory(_ horseId: String) -> String { "/horse-activity-history/horse/\(horseId)" }

    // MARK: - Feeding
    static func feedTypes(_ organizationId: String) -> String { "/feed-types/organization/\(organizationId)" }
    static func feedType(_ typeId: String) -> String { "/feed-types/\(typeId)" }
    static func feedingTimes(_ stableId: String) -> String { "/feeding-times/stable/\(stableId)" }
    static func feedingTime(_ timeId: String) -> String { "/feeding-times/\(timeId)" }
    static func horseFeedings(_ stableId: String) -> String { "/horse-feedings/stable/\(stableId)" }
    static func horseFeeding(_ feedingId: String) -> String { "/horse-feedings/\(feedingId)" }

    // MARK: - Routines
    static func routineTemplates(_ orgId: String) -> String {
        "/routines/templates/organization/\(orgId)"
    }
    static func routineTemplate(_ templateId: String) -> String {
        "/routines/templates/\(templateId)"
    }
    static func routineInstances(_ stableId: String) -> String {
        "/routines/instances/stable/\(stableId)"
    }
    static func routineInstance(_ instanceId: String) -> String {
        "/routines/instances/\(instanceId)"
    }
    static func routineInstanceStart(_ instanceId: String) -> String {
        "/routines/instances/\(instanceId)/start"
    }
    static func routineInstanceProgress(_ instanceId: String) -> String {
        "/routines/instances/\(instanceId)/progress"
    }
    static func routineInstanceComplete(_ instanceId: String) -> String {
        "/routines/instances/\(instanceId)/complete"
    }

    // MARK: - Daily Notes
    static func dailyNotes(_ stableId: String, date: String) -> String {
        "/stables/\(stableId)/daily-notes/\(date)"
    }

    // MARK: - Activities
    static func activityTypes(_ stableId: String) -> String {
        // Activity types are fetched by stable context
        "/activities/stable/\(stableId)"
    }
    static func activitiesForStable(_ stableId: String) -> String {
        "/activities/stable/\(stableId)"
    }
    static func activitiesForHorse(_ horseId: String) -> String {
        "/activities/horse/\(horseId)"
    }
    static func activitiesForUser(_ userId: String) -> String {
        "/activities/my/\(userId)"
    }
    static func activity(_ activityId: String) -> String {
        "/activities/\(activityId)"
    }
    static func activityComplete(_ activityId: String) -> String {
        "/activities/\(activityId)/complete"
    }
    static let activities = "/activities"

    // MARK: - Tasks
    static func tasks(_ orgId: String) -> String { "/organizations/\(orgId)/tasks" }
    static func task(_ orgId: String, taskId: String) -> String {
        "/organizations/\(orgId)/tasks/\(taskId)"
    }

    // MARK: - Messages
    static func messages(_ orgId: String) -> String { "/organizations/\(orgId)/messages" }
    static func message(_ orgId: String, messageId: String) -> String {
        "/organizations/\(orgId)/messages/\(messageId)"
    }

    // MARK: - Invites
    static let invites = "/invites"
    static func invite(_ token: String) -> String { "/invites/\(token)" }
    static func acceptInvite(_ token: String) -> String { "/invites/\(token)/accept" }

    // MARK: - Permissions
    static func userPermissions(organizationId: String) -> String {
        "/organizations/\(organizationId)/permissions/my"
    }

    static func permissionMatrix(organizationId: String) -> String {
        "/organizations/\(organizationId)/permissions/matrix"
    }

    // MARK: - Settings
    static let settingsPreferences = "/settings/preferences"

    // MARK: - Subscriptions
    static let tierDefinitions = "/tiers"

    static func organizationSubscription(organizationId: String) -> String {
        "/organizations/\(organizationId)/subscription"
    }

    // MARK: - Notifications
    static let notifications = "/notifications"
    static func notification(_ id: String) -> String { "/notifications/\(id)" }
    static func notificationRead(_ id: String) -> String { "/notifications/\(id)/read" }
    static let notificationsReadAll = "/notifications/read-all"
    static let notificationsClearRead = "/notifications/clear-read"
    static let notificationsPreferences = "/notifications/preferences"
    static let notificationsFcmToken = "/notifications/preferences/fcm-token"
    static func notificationsFcmTokenDevice(_ deviceId: String) -> String {
        "/notifications/preferences/fcm-token/\(deviceId)"
    }
}
