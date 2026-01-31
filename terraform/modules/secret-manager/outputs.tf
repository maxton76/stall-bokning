# Secret Manager Module Outputs

output "secret_ids" {
  description = "Map of secret names to their full IDs"
  value = {
    for name, secret in google_secret_manager_secret.secrets :
    name => secret.id
  }
}

output "secret_names" {
  description = "Map of secret names to their full resource names"
  value = {
    for name, secret in google_secret_manager_secret.secrets :
    name => secret.name
  }
}

output "secret_versions" {
  description = "Map of secret names to their version references (for Cloud Run/Functions)"
  value = {
    for name, secret in google_secret_manager_secret.secrets :
    name => "${secret.name}/versions/latest"
  }
  sensitive = true
}

# Individual secret references for convenience
output "jwt_secret_id" {
  description = "Secret ID for JWT secret"
  value       = google_secret_manager_secret.secrets["jwt-secret"].id
}

output "jwt_refresh_secret_id" {
  description = "Secret ID for JWT refresh secret"
  value       = google_secret_manager_secret.secrets["jwt-refresh-secret"].id
}

output "stripe_secret_key_id" {
  description = "Secret ID for Stripe secret key"
  value       = google_secret_manager_secret.secrets["stripe-secret-key"].id
}

output "stripe_webhook_secret_id" {
  description = "Secret ID for Stripe webhook secret"
  value       = google_secret_manager_secret.secrets["stripe-webhook-secret"].id
}

output "sendgrid_api_key_id" {
  description = "Secret ID for SendGrid API key"
  value       = google_secret_manager_secret.secrets["sendgrid-api-key"].id
}

output "twilio_account_sid_id" {
  description = "Secret ID for Twilio account SID"
  value       = google_secret_manager_secret.secrets["twilio-account-sid"].id
}

output "twilio_auth_token_id" {
  description = "Secret ID for Twilio auth token"
  value       = google_secret_manager_secret.secrets["twilio-auth-token"].id
}

output "telegram_bot_token_id" {
  description = "Secret ID for Telegram bot token"
  value       = google_secret_manager_secret.secrets["telegram-bot-token"].id
}

output "smtp_password_id" {
  description = "Secret ID for SMTP password"
  value       = google_secret_manager_secret.secrets["smtp-password"].id
}

output "zendesk_api_token_id" {
  description = "Secret ID for ZenDesk API token"
  value       = google_secret_manager_secret.secrets["zendesk-api-token"].id
}

output "zendesk_webhook_secret_id" {
  description = "Secret ID for ZenDesk webhook secret"
  value       = google_secret_manager_secret.secrets["zendesk-webhook-secret"].id
}
