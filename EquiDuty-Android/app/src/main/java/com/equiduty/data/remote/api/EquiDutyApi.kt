package com.equiduty.data.remote.api

import com.equiduty.data.remote.dto.*
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.HTTP
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface EquiDutyApi {

    // ── Auth ──────────────────────────────────────────────────────
    @GET("api/v1/auth/me")
    suspend fun getAuthMe(): UserDto

    @POST("api/v1/auth/signup")
    suspend fun signup(@Body body: SignupRequestDto): UserDto

    // ── Organizations ────────────────────────────────────────────
    @GET("api/v1/organizations")
    suspend fun getOrganizations(): OrganizationsResponseDto

    @GET("api/v1/organizations/{orgId}/stables")
    suspend fun getStables(@Path("orgId") orgId: String): StablesResponseDto

    // ── Permissions ──────────────────────────────────────────────
    @GET("api/v1/organizations/{orgId}/permissions/my")
    suspend fun getMyPermissions(@Path("orgId") orgId: String): UserPermissionsResponseDto

    // ── Subscriptions ────────────────────────────────────────────
    @GET("api/v1/tiers")
    suspend fun getTierDefinitions(): TierDefinitionsResponseDto

    @GET("api/v1/organizations/{orgId}/subscription")
    suspend fun getOrganizationSubscription(@Path("orgId") orgId: String): OrganizationSubscriptionResponseDto

    // ── Feature Toggles ──────────────────────────────────────────
    @GET("api/v1/feature-toggles")
    suspend fun getFeatureToggles(): FeatureTogglesResponseDto

    // ── Settings ─────────────────────────────────────────────────
    @GET("api/v1/settings/preferences")
    suspend fun getUserPreferences(): UserPreferencesResponseDto

    @PATCH("api/v1/settings/preferences")
    suspend fun updateUserPreferences(@Body body: UpdatePreferencesDto): UserPreferencesResponseDto

    // ── Horses ───────────────────────────────────────────────────
    @GET("api/v1/horses")
    suspend fun getHorses(
        @Query("scope") scope: String? = null,
        @Query("stableId") stableId: String? = null
    ): HorsesResponseDto

    @GET("api/v1/horses/{id}")
    suspend fun getHorse(@Path("id") id: String): HorseResponseDto

    @POST("api/v1/horses")
    suspend fun createHorse(@Body body: CreateHorseDto): HorseResponseDto

    @PUT("api/v1/horses/{id}")
    suspend fun updateHorse(@Path("id") id: String, @Body body: UpdateHorseDto): HorseResponseDto

    @DELETE("api/v1/horses/{id}")
    suspend fun deleteHorse(@Path("id") id: String)

    // ── Horse Media ──────────────────────────────────────────────
    @POST("api/v1/horse-media/upload-url")
    suspend fun getHorseMediaUploadUrl(@Body body: HorseMediaUploadRequestDto): HorseMediaUploadResponseDto

    @DELETE("api/v1/horse-media/{mediaId}")
    suspend fun deleteHorseMedia(@Path("mediaId") mediaId: String)

    // ── Horse Team ───────────────────────────────────────────────
    @GET("api/v1/horses/{horseId}/team")
    suspend fun getHorseTeam(@Path("horseId") horseId: String): HorseTeamResponseDto

    @PUT("api/v1/horses/{horseId}/team")
    suspend fun updateHorseTeam(@Path("horseId") horseId: String, @Body body: HorseTeamDto): HorseTeamResponseDto

    // ── Vaccinations ─────────────────────────────────────────────
    @GET("api/v1/vaccination-records/horse/{horseId}")
    suspend fun getVaccinationRecords(@Path("horseId") horseId: String): VaccinationRecordsResponseDto

    @POST("api/v1/vaccination-records")
    suspend fun createVaccinationRecord(@Body body: CreateVaccinationRecordDto): VaccinationRecordDto

    @GET("api/v1/vaccination-rules")
    suspend fun getVaccinationRules(
        @Query("scope") scope: String = "organization",
        @Query("organizationId") organizationId: String
    ): VaccinationRulesResponseDto

    // ── Health Records ───────────────────────────────────────────
    @GET("api/v1/health-records/horse/{horseId}")
    suspend fun getHealthRecords(
        @Path("horseId") horseId: String,
        @Query("professionalType") professionalType: String? = null
    ): HealthRecordsResponseDto

    @GET("api/v1/health-records/horse/{horseId}/stats")
    suspend fun getHealthRecordStats(@Path("horseId") horseId: String): HealthRecordStatsResponseDto

    @GET("api/v1/health-records/horse/{horseId}/upcoming-followups")
    suspend fun getUpcomingFollowups(@Path("horseId") horseId: String): UpcomingFollowupsResponseDto

    @POST("api/v1/health-records")
    suspend fun createHealthRecord(@Body body: CreateHealthRecordDto): HealthRecordDto

    @PUT("api/v1/health-records/{id}")
    suspend fun updateHealthRecord(@Path("id") id: String, @Body body: UpdateHealthRecordDto): HealthRecordDto

    @DELETE("api/v1/health-records/{id}")
    suspend fun deleteHealthRecord(@Path("id") id: String)

    // ── Horse Ownership ──────────────────────────────────────────
    @GET("api/v1/horse-ownership/horse/{horseId}")
    suspend fun getHorseOwnerships(@Path("horseId") horseId: String): HorseOwnershipResponseDto

    @POST("api/v1/horse-ownership")
    suspend fun createHorseOwnership(@Body body: CreateHorseOwnershipDto): HorseOwnershipDto

    @PUT("api/v1/horse-ownership/{id}")
    suspend fun updateHorseOwnership(@Path("id") id: String, @Body body: UpdateHorseOwnershipDto): HorseOwnershipDto

    @DELETE("api/v1/horse-ownership/{id}")
    suspend fun deleteHorseOwnership(@Path("id") id: String)

    // ── Activities ───────────────────────────────────────────────
    @GET("api/v1/activities/stable/{stableId}")
    suspend fun getActivitiesByStable(
        @Path("stableId") stableId: String,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): ActivityInstancesResponseDto

    @GET("api/v1/activities/horse/{horseId}")
    suspend fun getActivitiesByHorse(@Path("horseId") horseId: String): ActivityInstancesResponseDto

    @GET("api/v1/activities/{id}")
    suspend fun getActivity(@Path("id") id: String): ActivityInstanceDto

    @POST("api/v1/activities")
    suspend fun createActivity(@Body body: CreateActivityDto): ActivityInstanceDto

    @PUT("api/v1/activities/{id}")
    suspend fun updateActivity(@Path("id") id: String, @Body body: UpdateActivityDto): ActivityInstanceDto

    @DELETE("api/v1/activities/{id}")
    suspend fun deleteActivity(@Path("id") id: String)

    @POST("api/v1/activities/{id}/complete")
    suspend fun completeActivity(@Path("id") id: String): ActivityInstanceDto

    // ── Routines ─────────────────────────────────────────────────
    @GET("api/v1/routines/templates/organization/{orgId}")
    suspend fun getRoutineTemplates(@Path("orgId") orgId: String): RoutineTemplatesResponseDto

    @GET("api/v1/routines/templates/{id}")
    suspend fun getRoutineTemplate(@Path("id") id: String): RoutineTemplateResponseDto

    @POST("api/v1/routines/templates")
    suspend fun createRoutineTemplate(@Body body: CreateRoutineTemplateDto): RoutineTemplateResponseDto

    @PUT("api/v1/routines/templates/{id}")
    suspend fun updateRoutineTemplate(@Path("id") id: String, @Body body: UpdateRoutineTemplateDto): RoutineTemplateResponseDto

    @DELETE("api/v1/routines/templates/{id}")
    suspend fun deleteRoutineTemplate(@Path("id") id: String)

    @GET("api/v1/routines/instances/stable/{stableId}")
    suspend fun getRoutineInstances(
        @Path("stableId") stableId: String,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): RoutineInstancesResponseDto

    @GET("api/v1/routines/instances/{id}")
    suspend fun getRoutineInstance(@Path("id") id: String): RoutineInstanceDto

    @POST("api/v1/routines/instances/{id}/start")
    suspend fun startRoutineInstance(
        @Path("id") id: String,
        @Body body: StartRoutineRequestDto
    ): RoutineInstanceResponseDto

    @PUT("api/v1/routines/instances/{id}/progress")
    suspend fun updateRoutineProgress(
        @Path("id") instanceId: String,
        @Body body: UpdateStepProgressDto
    ): RoutineInstanceResponseDto

    @POST("api/v1/routines/instances/{id}/complete")
    suspend fun completeRoutineInstance(@Path("id") id: String): RoutineInstanceResponseDto

    @POST("api/v1/routines/instances/{id}/assign")
    suspend fun assignRoutineInstance(
        @Path("id") id: String,
        @Body body: AssignRoutineRequestDto
    ): RoutineInstanceResponseDto

    @POST("api/v1/routines/instances/{id}/cancel")
    suspend fun cancelRoutineInstance(
        @Path("id") id: String,
        @Body body: CancelRoutineRequestDto
    ): RoutineInstanceResponseDto

    @POST("api/v1/routines/instances/{instanceId}/steps/{stepId}/upload-url")
    suspend fun getRoutineStepUploadUrl(
        @Path("instanceId") instanceId: String,
        @Path("stepId") stepId: String
    ): StepPhotoUploadResponseDto

    // ── Daily Notes ──────────────────────────────────────────────
    @GET("api/v1/stables/{stableId}/daily-notes/{date}")
    suspend fun getDailyNotes(
        @Path("stableId") stableId: String,
        @Path("date") date: String
    ): DailyNotesResponseDto

    // ── Feeding ──────────────────────────────────────────────────
    @GET("api/v1/feed-types/organization/{orgId}")
    suspend fun getFeedTypes(@Path("orgId") orgId: String): FeedTypesResponseDto

    @POST("api/v1/feed-types")
    suspend fun createFeedType(@Body body: CreateFeedTypeDto): FeedTypeDto

    @PUT("api/v1/feed-types/{id}")
    suspend fun updateFeedType(@Path("id") id: String, @Body body: UpdateFeedTypeDto): FeedTypeDto

    @DELETE("api/v1/feed-types/{id}")
    suspend fun deleteFeedType(@Path("id") id: String)

    @GET("api/v1/feeding-times/stable/{stableId}")
    suspend fun getFeedingTimes(@Path("stableId") stableId: String): FeedingTimesResponseDto

    @GET("api/v1/horse-feedings/stable/{stableId}")
    suspend fun getHorseFeedings(@Path("stableId") stableId: String): HorseFeedingsResponseDto

    @POST("api/v1/horse-feedings")
    suspend fun createHorseFeeding(@Body body: CreateHorseFeedingDto): HorseFeedingDto

    @PUT("api/v1/horse-feedings/{id}")
    suspend fun updateHorseFeeding(@Path("id") id: String, @Body body: UpdateHorseFeedingDto): HorseFeedingDto

    @DELETE("api/v1/horse-feedings/{id}")
    suspend fun deleteHorseFeeding(@Path("id") id: String)

    // ── Horse Activity History ───────────────────────────────────
    @GET("api/v1/horse-activity-history/horse/{horseId}")
    suspend fun getHorseActivityHistory(@Path("horseId") horseId: String): HorseActivityHistoryResponseDto

    // ── Notifications ──────────────────────────────────────────────
    @GET("api/v1/notifications")
    suspend fun getNotifications(
        @Query("limit") limit: Int = 50,
        @Query("unreadOnly") unreadOnly: Boolean = false
    ): NotificationsResponseDto

    @PATCH("api/v1/notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: String)

    @PATCH("api/v1/notifications/read-all")
    suspend fun markAllNotificationsRead()

    @DELETE("api/v1/notifications/{id}")
    suspend fun deleteNotification(@Path("id") id: String)

    @HTTP(method = "DELETE", path = "api/v1/notifications/clear-read")
    suspend fun clearReadNotifications()

    @POST("api/v1/notifications/preferences/fcm-token")
    suspend fun registerFcmToken(@Body body: RegisterFcmTokenDto)

    @DELETE("api/v1/notifications/preferences/fcm-token/{deviceId}")
    suspend fun removeFcmToken(@Path("deviceId") deviceId: String)

    // ── Facilities ──────────────────────────────────────────────────
    @GET("api/v1/facilities")
    suspend fun getFacilities(
        @Query("stableId") stableId: String,
        @Query("status") status: String? = null,
        @Query("reservableOnly") reservableOnly: Boolean? = null
    ): FacilitiesResponseDto

    @GET("api/v1/facilities/{id}")
    suspend fun getFacility(@Path("id") id: String): FacilityDto

    @POST("api/v1/facilities")
    suspend fun createFacility(@Body body: CreateFacilityDto): CreateFacilityResponseDto

    @PATCH("api/v1/facilities/{id}")
    suspend fun updateFacility(@Path("id") id: String, @Body body: UpdateFacilityDto): FacilityDto

    @DELETE("api/v1/facilities/{id}")
    suspend fun deleteFacility(@Path("id") id: String)

    // ── Facility Reservations ───────────────────────────────────────
    @GET("api/v1/facility-reservations")
    suspend fun getFacilityReservations(
        @Query("stableId") stableId: String? = null,
        @Query("facilityId") facilityId: String? = null,
        @Query("userId") userId: String? = null,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null
    ): FacilityReservationsResponseDto

    @GET("api/v1/facility-reservations/{id}")
    suspend fun getFacilityReservation(@Path("id") id: String): FacilityReservationDto

    @POST("api/v1/facility-reservations")
    suspend fun createFacilityReservation(@Body body: CreateReservationDto): FacilityReservationDto

    @PATCH("api/v1/facility-reservations/{id}")
    suspend fun updateFacilityReservation(
        @Path("id") id: String,
        @Body body: UpdateReservationDto
    ): FacilityReservationDto

    @POST("api/v1/facility-reservations/{id}/cancel")
    suspend fun cancelFacilityReservation(@Path("id") id: String)

    @POST("api/v1/facility-reservations/check-conflicts")
    suspend fun checkReservationConflicts(@Body body: CheckConflictsDto): ConflictsResponseDto

    // ── Feature Requests ──────────────────────────────────────────────
    @GET("api/v1/feature-requests")
    suspend fun getFeatureRequests(
        @Query("status") status: String? = null,
        @Query("category") category: String? = null,
        @Query("sort") sort: String = "votes",
        @Query("mine") mine: String? = null,
        @Query("cursor") cursor: String? = null,
        @Query("limit") limit: Int = 20
    ): FeatureRequestListResponseDto

    @POST("api/v1/feature-requests")
    suspend fun createFeatureRequest(@Body body: CreateFeatureRequestDto): FeatureRequestDto

    @POST("api/v1/feature-requests/refine")
    suspend fun refineFeatureRequestText(@Body body: RefineTextRequestDto): RefineTextResponseDto

    @GET("api/v1/feature-requests/{id}")
    suspend fun getFeatureRequest(@Path("id") id: String): FeatureRequestDetailResponseDto

    @POST("api/v1/feature-requests/{id}/vote")
    suspend fun toggleFeatureRequestVote(@Path("id") id: String): FeatureRequestVoteResponseDto

    @GET("api/v1/feature-requests/{id}/comments")
    suspend fun getFeatureRequestComments(
        @Path("id") id: String,
        @Query("cursor") cursor: String? = null,
        @Query("limit") limit: Int = 20
    ): FeatureRequestCommentsResponseDto

    @POST("api/v1/feature-requests/{id}/comments")
    suspend fun addFeatureRequestComment(
        @Path("id") id: String,
        @Body body: CreateFeatureRequestCommentDto
    ): FeatureRequestCommentDto
}
