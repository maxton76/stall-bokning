# Firebase Module Outputs

output "firebase_project_id" {
  description = "Firebase project ID"
  value       = google_firebase_project.default.project
}

output "web_app_id" {
  description = "Firebase Web App ID"
  value       = google_firebase_web_app.frontend.app_id
}

output "web_app_config" {
  description = "Firebase Web App configuration for frontend"
  value = {
    apiKey            = data.google_firebase_web_app_config.frontend.api_key
    authDomain        = data.google_firebase_web_app_config.frontend.auth_domain
    projectId         = var.project_id
    storageBucket     = data.google_firebase_web_app_config.frontend.storage_bucket
    messagingSenderId = data.google_firebase_web_app_config.frontend.messaging_sender_id
    appId             = google_firebase_web_app.frontend.app_id
  }
  sensitive = true
}

output "firestore_database_name" {
  description = "Firestore database name"
  value       = google_firestore_database.default.name
}

output "firestore_database_id" {
  description = "Firestore database ID"
  value       = google_firestore_database.default.id
}

output "storage_bucket_name" {
  description = "Firebase Storage bucket name"
  value       = var.create_storage_bucket ? google_storage_bucket.firebase_storage[0].name : "${var.project_id}.firebasestorage.app"
}

output "storage_bucket_url" {
  description = "Firebase Storage bucket URL"
  value       = var.create_storage_bucket ? google_storage_bucket.firebase_storage[0].url : "gs://${var.project_id}.firebasestorage.app"
}

output "hosting_site_id" {
  description = "Firebase Hosting site ID"
  value       = google_firebase_hosting_site.default.site_id
}

output "hosting_default_url" {
  description = "Default Firebase Hosting URL"
  value       = google_firebase_hosting_site.default.default_url
}

output "derived_images_bucket_name" {
  description = "Derived images bucket name (optimized variants)"
  value       = google_storage_bucket.derived_images.name
}

output "authorized_domains" {
  description = "Authorized domains for authentication"
  value       = google_identity_platform_config.default.authorized_domains
}
