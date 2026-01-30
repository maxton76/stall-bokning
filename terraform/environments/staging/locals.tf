# Local Values - Staging Environment
#
# Computed values and configurations used across modules.

locals {
  # Common labels applied to all resources
  common_labels = {
    project     = "equiduty"
    environment = var.environment
    managed_by  = "terraform"
  }

  # Firestore location (must match region for consistency)
  firestore_location = var.region

  # Cloud Functions definitions
  # Note: Source bucket/object should be set when deploying functions via Terraform
  functions = {
    "monthly-time-accrual" = {
      description                  = "Monthly time accrual calculation"
      runtime                      = "nodejs22"
      entry_point                  = "monthlyTimeAccrual"
      memory                       = "256Mi"
      cpu                          = "1"
      timeout_seconds              = 540
      max_instances                = var.functions_max_instances
      min_instances                = 0
      max_concurrency              = 1
      ingress_settings             = "ALLOW_INTERNAL_ONLY"
      source_archive_bucket        = var.functions_source_bucket
      source_archive_object        = var.functions_source_object
      environment_variables        = {}
      build_environment_variables  = {}
      secret_environment_variables = {}
      event_trigger                = null
      schedule = {
        cron               = "5 0 1 * *" # 5 minutes after midnight on 1st of month
        timezone           = "Europe/Stockholm"
        pause_in_non_prod  = true
        retry_count        = 3
        max_retry_duration = 3600
        payload            = {}
      }
      allow_unauthenticated = false
    }

    "generate-activity-instances" = {
      description                  = "Generate recurring activity instances"
      runtime                      = "nodejs22"
      entry_point                  = "generateActivityInstances"
      memory                       = "512Mi"
      cpu                          = "1"
      timeout_seconds              = 300
      max_instances                = var.functions_max_instances
      min_instances                = 0
      max_concurrency              = 1
      ingress_settings             = "ALLOW_INTERNAL_ONLY"
      source_archive_bucket        = var.functions_source_bucket
      source_archive_object        = var.functions_source_object
      environment_variables        = {}
      build_environment_variables  = {}
      secret_environment_variables = {}
      event_trigger                = null
      schedule = {
        cron               = "0 2 * * *" # 2 AM daily
        timezone           = "Europe/Stockholm"
        pause_in_non_prod  = true
        retry_count        = 3
        max_retry_duration = 1800
        payload            = {}
      }
      allow_unauthenticated = false
    }

    "scan-for-reminders" = {
      description                  = "Scan for upcoming reminders and create notifications"
      runtime                      = "nodejs22"
      entry_point                  = "scanForReminders"
      memory                       = "256Mi"
      cpu                          = "1"
      timeout_seconds              = 120
      max_instances                = var.functions_max_instances
      min_instances                = 0
      max_concurrency              = 10
      ingress_settings             = "ALLOW_INTERNAL_ONLY"
      source_archive_bucket        = var.functions_source_bucket
      source_archive_object        = var.functions_source_object
      environment_variables        = {}
      build_environment_variables  = {}
      secret_environment_variables = {}
      event_trigger                = null
      schedule = {
        cron               = "*/5 * * * *" # Every 5 minutes
        timezone           = "Europe/Stockholm"
        pause_in_non_prod  = true
        retry_count        = 1
        max_retry_duration = 300
        payload            = {}
      }
      allow_unauthenticated = false
    }

    "process-notification-queue" = {
      description                 = "Process pending notifications from queue"
      runtime                     = "nodejs22"
      entry_point                 = "processNotificationQueue"
      memory                      = "256Mi"
      cpu                         = "1"
      timeout_seconds             = 60
      max_instances               = var.functions_max_instances
      min_instances               = 0
      max_concurrency             = 10
      ingress_settings            = "ALLOW_INTERNAL_ONLY"
      source_archive_bucket       = var.functions_source_bucket
      source_archive_object       = var.functions_source_object
      environment_variables       = {}
      build_environment_variables = {}
      secret_environment_variables = {
        SENDGRID_API_KEY = {
          secret  = "${var.environment}-sendgrid-api-key"
          version = "latest"
        }
        TWILIO_ACCOUNT_SID = {
          secret  = "${var.environment}-twilio-account-sid"
          version = "latest"
        }
        TWILIO_AUTH_TOKEN = {
          secret  = "${var.environment}-twilio-auth-token"
          version = "latest"
        }
        TELEGRAM_BOT_TOKEN = {
          secret  = "${var.environment}-telegram-bot-token"
          version = "latest"
        }
      }
      event_trigger = null
      schedule = {
        cron               = "*/1 * * * *" # Every minute
        timezone           = "Europe/Stockholm"
        pause_in_non_prod  = true
        retry_count        = 1
        max_retry_duration = 60
        payload            = {}
      }
      allow_unauthenticated = false
    }

    "retry-failed-notifications" = {
      description                 = "Retry failed notifications"
      runtime                     = "nodejs22"
      entry_point                 = "retryFailedNotifications"
      memory                      = "256Mi"
      cpu                         = "1"
      timeout_seconds             = 120
      max_instances               = var.functions_max_instances
      min_instances               = 0
      max_concurrency             = 1
      ingress_settings            = "ALLOW_INTERNAL_ONLY"
      source_archive_bucket       = var.functions_source_bucket
      source_archive_object       = var.functions_source_object
      environment_variables       = {}
      build_environment_variables = {}
      secret_environment_variables = {
        SENDGRID_API_KEY = {
          secret  = "${var.environment}-sendgrid-api-key"
          version = "latest"
        }
        TWILIO_ACCOUNT_SID = {
          secret  = "${var.environment}-twilio-account-sid"
          version = "latest"
        }
        TWILIO_AUTH_TOKEN = {
          secret  = "${var.environment}-twilio-auth-token"
          version = "latest"
        }
        TELEGRAM_BOT_TOKEN = {
          secret  = "${var.environment}-telegram-bot-token"
          version = "latest"
        }
      }
      event_trigger = null
      schedule = {
        cron               = "*/15 * * * *" # Every 15 minutes
        timezone           = "Europe/Stockholm"
        pause_in_non_prod  = true
        retry_count        = 3
        max_retry_duration = 600
        payload            = {}
      }
      allow_unauthenticated = false
    }

    "cleanup-old-notifications" = {
      description                  = "Clean up old processed notifications"
      runtime                      = "nodejs22"
      entry_point                  = "cleanupOldNotifications"
      memory                       = "256Mi"
      cpu                          = "1"
      timeout_seconds              = 300
      max_instances                = var.functions_max_instances
      min_instances                = 0
      max_concurrency              = 1
      ingress_settings             = "ALLOW_INTERNAL_ONLY"
      source_archive_bucket        = var.functions_source_bucket
      source_archive_object        = var.functions_source_object
      environment_variables        = {}
      build_environment_variables  = {}
      secret_environment_variables = {}
      event_trigger                = null
      schedule = {
        cron               = "0 3 * * 0" # 3 AM every Sunday
        timezone           = "Europe/Stockholm"
        pause_in_non_prod  = true
        retry_count        = 3
        max_retry_duration = 1800
        payload            = {}
      }
      allow_unauthenticated = false
    }

    # =========================================================================
    # Firestore Trigger Functions
    # =========================================================================

    "on-schedule-published" = {
      description                  = "Notify assigned users when schedule is published"
      runtime                      = "nodejs22"
      entry_point                  = "onSchedulePublished"
      memory                       = "512Mi"
      cpu                          = "1"
      timeout_seconds              = 300
      max_instances                = var.functions_max_instances
      min_instances                = 0
      max_concurrency              = 1
      ingress_settings             = "ALLOW_INTERNAL_ONLY"
      source_archive_bucket        = var.functions_source_bucket
      source_archive_object        = var.functions_source_object
      environment_variables        = {}
      build_environment_variables  = {}
      secret_environment_variables = {}
      event_trigger = {
        event_type   = "google.cloud.firestore.document.v1.updated"
        region       = ""
        retry_policy = "RETRY_POLICY_DO_NOT_RETRY"
        filters = [
          { attribute = "database", value = "(default)", operator = "" },
          { attribute = "document", value = "schedules/{scheduleId}", operator = "match-path-pattern" }
        ]
      }
      schedule              = null
      allow_unauthenticated = false
    }

    "on-routine-schedule-created" = {
      description                  = "Generate routine instances when schedule is created"
      runtime                      = "nodejs22"
      entry_point                  = "onRoutineScheduleCreated"
      memory                       = "512Mi"
      cpu                          = "1"
      timeout_seconds              = 540
      max_instances                = var.functions_max_instances
      min_instances                = 0
      max_concurrency              = 1
      ingress_settings             = "ALLOW_INTERNAL_ONLY"
      source_archive_bucket        = var.functions_source_bucket
      source_archive_object        = var.functions_source_object
      environment_variables        = {}
      build_environment_variables  = {}
      secret_environment_variables = {}
      event_trigger = {
        event_type   = "google.cloud.firestore.document.v1.created"
        region       = ""
        retry_policy = "RETRY_POLICY_RETRY"
        filters = [
          { attribute = "database", value = "(default)", operator = "" },
          { attribute = "document", value = "routineSchedules/{scheduleId}", operator = "match-path-pattern" }
        ]
      }
      schedule              = null
      allow_unauthenticated = false
    }

    "on-routine-schedule-deleted" = {
      description                  = "Remove non-completed instances when schedule is deleted"
      runtime                      = "nodejs22"
      entry_point                  = "onRoutineScheduleDeleted"
      memory                       = "512Mi"
      cpu                          = "1"
      timeout_seconds              = 300
      max_instances                = var.functions_max_instances
      min_instances                = 0
      max_concurrency              = 1
      ingress_settings             = "ALLOW_INTERNAL_ONLY"
      source_archive_bucket        = var.functions_source_bucket
      source_archive_object        = var.functions_source_object
      environment_variables        = {}
      build_environment_variables  = {}
      secret_environment_variables = {}
      event_trigger = {
        event_type   = "google.cloud.firestore.document.v1.deleted"
        region       = ""
        retry_policy = "RETRY_POLICY_RETRY"
        filters = [
          { attribute = "database", value = "(default)", operator = "" },
          { attribute = "document", value = "routineSchedules/{scheduleId}", operator = "match-path-pattern" }
        ]
      }
      schedule              = null
      allow_unauthenticated = false
    }
  }
}
