# Naming Standards

Single source of truth for resource naming conventions across all environments.

## Cloud Functions

| Aspect | Convention | Example |
|--------|-----------|---------|
| Terraform key | `kebab-case`, descriptive verb-noun | `monthly-time-accrual`, `scan-for-reminders` |
| Deployed name | `{env}-{terraform-key}` | `dev-monthly-time-accrual`, `prod-scan-for-reminders` |
| Code export (entry_point) | `camelCase`, matches Terraform `entry_point` | `monthlyTimeAccrual`, `scanForReminders` |
| Trigger functions | `on-{event}-{resource}` (Terraform), `on{Event}{Resource}` (code) | `on-schedule-published` / `onSchedulePublished` |
| Scheduler jobs | `{env}-{function-key}-scheduler` | `dev-monthly-time-accrual-scheduler` |
| Source file | `camelCase` matching context | `generateInstances.ts`, `onSchedulePublished.ts` |

## Secrets (Secret Manager)

| Aspect | Convention | Example |
|--------|-----------|---------|
| Secret ID | `{env}-{service}-{purpose}` | `dev-stripe-secret-key`, `prod-sendgrid-api-key` |
| Categories | auth, integration, notification, smtp | `dev-jwt-secret`, `dev-twilio-account-sid` |
| Env var name | `UPPER_SNAKE_CASE` | `STRIPE_SECRET_KEY`, `SENDGRID_API_KEY` |

## Service Accounts

| Aspect | Convention | Example |
|--------|-----------|---------|
| Environment-scoped | `{env}-{service}` | `dev-cloud-run-api`, `staging-cloud-functions` |
| Shared (cross-env) | `{purpose}` (no env prefix) | `terraform-ci` |

## Cloud Run

| Aspect | Convention | Example |
|--------|-----------|---------|
| Service name | `{env}-api-service` | `dev-api-service`, `prod-api-service` |
| Container image | `gcr.io/{project}/api-service:{tag}` | `gcr.io/equiduty-dev/api-service:latest` |

## Storage Buckets

| Aspect | Convention | Example |
|--------|-----------|---------|
| Functions source | `{project}-{env}-functions-source` | `equiduty-dev-functions-source` |
| Shared buckets | `{project}-{purpose}` (no env prefix) | `equiduty-terraform-state` |

## GCP Projects

| Convention | Example |
|-----------|---------|
| `equiduty-{env}` | `equiduty-dev`, `equiduty-staging`, `equiduty-prod` |

## Labels

Applied to all Terraform-managed resources:

```hcl
common_labels = {
  project     = "equiduty"
  environment = "{env}"          # dev, staging, prod
  managed_by  = "terraform"
}
```

## Deployment Rules

**All Cloud Functions are deployed via Terraform** using `task deploy:functions`. This ensures every function gets the correct `{env}-{terraform-key}` deployed name.

### What NOT to do

**Never use `firebase deploy --only functions`** for production deployments. Firebase CLI uses the JS export name directly (e.g., `processBulkImport`) without the environment prefix, violating the naming standard. A safety gate in `scripts/prepare-functions-deploy.sh` blocks this by default.

### How deployment works

| Function type | Deployment method | Example deployed name |
|---------------|-------------------|----------------------|
| Scheduled functions | `task deploy:functions` (Terraform) | `dev-monthly-time-accrual` |
| Firestore trigger functions | `task deploy:functions` (Terraform) | `dev-on-schedule-published` |
| HTTP functions | `task deploy:functions` (Terraform) | `dev-process-notification-queue` |

### Bypassing the safety gate

If you have a legitimate reason to deploy via Firebase CLI (e.g., local emulator testing), set:

```bash
export FIREBASE_ALLOW_FUNCTIONS_DEPLOY=confirmed
firebase deploy --only functions:functionName
```

## Adding a New Cloud Function

1. Create source file in `packages/functions/src/{category}/` using camelCase
2. Export from `packages/functions/src/index.ts` using camelCase
3. Add Terraform definition to `terraform/environments/dev/locals.tf` using kebab-case key
4. Set `entry_point` to match the camelCase export name
5. Copy definition to staging/prod locals
6. Add secrets with `{env}-` prefix if needed
7. Run `terraform plan` in each environment
8. Deploy with `task deploy:functions`
