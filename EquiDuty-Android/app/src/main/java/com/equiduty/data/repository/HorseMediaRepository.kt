package com.equiduty.data.repository

import com.equiduty.data.remote.api.EquiDutyApi
import com.equiduty.data.remote.dto.HorseMediaUploadRequestDto
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import timber.log.Timber
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class HorseMediaRepository @Inject constructor(
    private val api: EquiDutyApi,
    private val okHttpClient: OkHttpClient
) {

    companion object {
        private const val MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  // 10MB
    }

    /**
     * Upload a horse photo (cover or avatar) using signed URL flow.
     *
     * @param horseId The ID of the horse
     * @param mediaType "cover" or "avatar"
     * @param imageFile The image file to upload
     * @return The public URL of the uploaded image
     */
    suspend fun uploadHorsePhoto(
        horseId: String,
        mediaType: String,
        imageFile: File
    ): String {
        try {
            // Check file size before loading into memory
            if (imageFile.length() > MAX_IMAGE_SIZE_BYTES) {
                throw Exception("Bilden är för stor. Max 10MB tillåtet.")
            }

            // Step 1: Request a signed upload URL from the API
            val request = HorseMediaUploadRequestDto(
                horseId = horseId,
                mediaType = mediaType,
                contentType = "image/jpeg"
            )

            val response = api.getHorseMediaUploadUrl(request)

            // Step 2: Upload the file to the signed URL using a PUT request
            val imageBytes = imageFile.readBytes()
            val requestBody = imageBytes.toRequestBody("image/jpeg".toMediaTypeOrNull())

            val uploadRequest = Request.Builder()
                .url(response.uploadUrl)
                .put(requestBody)
                .addHeader("Content-Type", "image/jpeg")
                .build()

            // Wrap in use {} to ensure response is closed and prevent resource leaks
            okHttpClient.newCall(uploadRequest).execute().use { uploadResponse ->
                if (!uploadResponse.isSuccessful) {
                    throw Exception("Failed to upload image to signed URL: ${uploadResponse.code}")
                }

                Timber.d("Successfully uploaded $mediaType photo for horse $horseId")
                return response.publicUrl
            }

        } catch (e: Exception) {
            Timber.e(e, "Failed to upload horse photo")
            throw e
        }
    }

    /**
     * Delete a horse media file.
     *
     * @param mediaId The ID of the media to delete
     */
    suspend fun deleteHorseMedia(mediaId: String) {
        try {
            api.deleteHorseMedia(mediaId)
            Timber.d("Successfully deleted media $mediaId")
        } catch (e: Exception) {
            Timber.e(e, "Failed to delete horse media")
            throw e
        }
    }
}
