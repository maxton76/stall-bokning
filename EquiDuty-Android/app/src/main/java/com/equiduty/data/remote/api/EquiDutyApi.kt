package com.equiduty.data.remote.api

import com.equiduty.data.remote.dto.*
import retrofit2.http.*

interface EquiDutyApi {

    // ── Auth ──────────────────────────────────────────────────────
    @GET("api/v1/auth/me")
    suspend fun getAuthMe(): UserDto

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

    @PUT("api/v1/settings/preferences")
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

    @GET("api/v1/routines/instances/stable/{stableId}")
    suspend fun getRoutineInstances(
        @Path("stableId") stableId: String,
        @Query("date") date: String? = null
    ): RoutineInstancesResponseDto

    @POST("api/v1/routines/instances/{id}/start")
    suspend fun startRoutineInstance(@Path("id") id: String): RoutineInstanceDto

    @POST("api/v1/routines/instances/{id}/steps/{stepId}/complete")
    suspend fun completeRoutineStep(
        @Path("id") instanceId: String,
        @Path("stepId") stepId: String,
        @Body body: CompleteStepDto
    ): RoutineInstanceDto

    @POST("api/v1/routines/instances/{id}/complete")
    suspend fun completeRoutineInstance(@Path("id") id: String): RoutineInstanceDto

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
}
