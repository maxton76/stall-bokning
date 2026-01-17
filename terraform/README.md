# Terraform Infrastructure

This directory contains Terraform configuration for managing the stall-bokning infrastructure on Google Cloud Platform.

## Directory Structure

```
terraform/
├── modules/                    # Reusable Terraform modules
│   ├── cloud-run/             # Cloud Run API service
│   ├── cloud-functions/       # Cloud Functions Gen2 + schedulers
│   ├── secret-manager/        # Centralized secrets
│   ├── iam/                   # Service accounts + roles
│   ├── monitoring/            # Uptime checks, alerts, dashboards
│   ├── firebase/              # Firebase project + Identity Platform
│   └── storage/               # GCS buckets (state, artifacts)
├── environments/
│   └── dev/                   # Dev environment configuration
│       ├── main.tf            # Module instantiations
│       ├── variables.tf       # Variable declarations
│       ├── outputs.tf         # Environment outputs
│       ├── terraform.tfvars   # Dev-specific values
│       ├── backend.tf         # GCS backend config
│       └── locals.tf          # Computed locals
├── shared/                    # Shared provider configurations
│   ├── providers.tf           # Google provider config
│   └── versions.tf            # Terraform version constraints
├── scripts/                   # Helper scripts
│   ├── init-backend.sh        # Initialize state bucket
│   └── import-existing.sh     # Import existing resources
└── README.md                  # This file
```

## Prerequisites

1. **Google Cloud SDK** installed and configured
2. **Terraform** >= 1.5.0 installed
3. GCP project with billing enabled
4. Appropriate IAM permissions (Owner or Editor role recommended for initial setup)

## Quick Start

### 1. Authenticate with Google Cloud

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project stall-bokning-dev
```

### 2. Initialize the State Bucket

First-time setup only - creates the GCS bucket for storing Terraform state:

```bash
cd terraform
chmod +x scripts/init-backend.sh
./scripts/init-backend.sh stall-bokning-dev
```

### 3. Initialize Terraform

```bash
cd environments/dev
terraform init
```

### 4. Plan and Apply

```bash
# Review the planned changes
terraform plan

# Apply the changes
terraform apply
```

## Environment Configuration

### Dev Environment

Located in `environments/dev/`:

| Variable | Description | Default |
|----------|-------------|---------|
| `project_id` | GCP project ID | `stall-bokning-dev` |
| `region` | GCP region | `europe-west1` |
| `cloud_run_min_instances` | Min Cloud Run instances | `0` |
| `cloud_run_max_instances` | Max Cloud Run instances | `2` |
| `enable_monitoring` | Enable uptime checks | `true` |
| `enable_alerting` | Enable alert notifications | `false` |

### Sensitive Variables

Create `terraform.tfvars.local` (gitignored) for sensitive values:

```hcl
google_oauth_client_id     = "your-client-id.apps.googleusercontent.com"
google_oauth_client_secret = "your-client-secret"
```

## Modules

### cloud-run

Deploys the main REST API service on Cloud Run v2.

```hcl
module "cloud_run" {
  source = "../../modules/cloud-run"

  project_id        = var.project_id
  region            = var.region
  environment       = var.environment
  container_image   = "gcr.io/project/image:tag"
  service_account_email = module.iam.cloud_run_api_service_account_email

  min_instances = 0
  max_instances = 2
  memory_limit  = "512Mi"
}
```

### cloud-functions

Deploys Cloud Functions Gen2 with optional Cloud Scheduler triggers.

```hcl
module "cloud_functions" {
  source = "../../modules/cloud-functions"

  project_id            = var.project_id
  region                = var.region
  environment           = var.environment
  service_account_email = module.iam.cloud_functions_service_account_email

  functions = {
    "my-function" = {
      description     = "My function"
      runtime         = "nodejs22"
      entry_point     = "myFunction"
      memory          = "256Mi"
      timeout_seconds = 60
      schedule = {
        cron     = "0 * * * *"
        timezone = "Europe/Stockholm"
      }
    }
  }
}
```

### secret-manager

Creates and manages application secrets.

```hcl
module "secrets" {
  source = "../../modules/secret-manager"

  project_id  = var.project_id
  environment = var.environment

  cloud_run_service_account_email       = module.iam.cloud_run_api_service_account_email
  cloud_functions_service_account_email = module.iam.cloud_functions_service_account_email
}
```

### iam

Creates service accounts and IAM bindings.

```hcl
module "iam" {
  source = "../../modules/iam"

  project_id  = var.project_id
  environment = var.environment

  create_workload_identity = true
  github_repository        = "owner/repo"
}
```

### monitoring

Sets up uptime checks, alerts, and log-based metrics.

```hcl
module "monitoring" {
  source = "../../modules/monitoring"

  project_id             = var.project_id
  environment            = var.environment
  cloud_run_service_name = module.cloud_run.service_name
  cloud_run_service_url  = module.cloud_run.service_url

  enable_uptime_checks = true
  enable_alerting      = false
}
```

### firebase

Configures Firebase project and Identity Platform.

```hcl
module "firebase" {
  source = "../../modules/firebase"

  project_id         = var.project_id
  environment        = var.environment
  firestore_location = "europe-west1"

  enable_google_oauth        = true
  google_oauth_client_id     = var.google_oauth_client_id
  google_oauth_client_secret = var.google_oauth_client_secret
}
```

## Managing Secrets

Secrets are created by Terraform but their **values** must be set manually:

```bash
# Set a secret value
echo -n "my-secret-value" | gcloud secrets versions add dev-jwt-secret --data-file=-

# View a secret value
gcloud secrets versions access latest --secret=dev-jwt-secret

# List all secrets
gcloud secrets list
```

## Resources Managed by Terraform

| Resource | Module | Terraform Resource |
|----------|--------|-------------------|
| Cloud Run API | cloud-run | `google_cloud_run_v2_service` |
| Cloud Functions | cloud-functions | `google_cloudfunctions2_function` |
| Cloud Scheduler | cloud-functions | `google_cloud_scheduler_job` |
| Secrets | secret-manager | `google_secret_manager_secret` |
| Service Accounts | iam | `google_service_account` |
| IAM Bindings | iam | `google_project_iam_member` |
| Uptime Checks | monitoring | `google_monitoring_uptime_check_config` |
| Alert Policies | monitoring | `google_monitoring_alert_policy` |
| Firebase Project | firebase | `google_firebase_project` |
| Firestore DB | firebase | `google_firestore_database` |

## Resources NOT Managed by Terraform

These remain managed via Firebase CLI:

| Resource | Reason | Command |
|----------|--------|---------|
| Firestore Rules | No TF support | `firebase deploy --only firestore:rules` |
| Firestore Indexes | JSON-based | `firebase deploy --only firestore:indexes` |
| Storage Rules | No TF support | `firebase deploy --only storage` |
| Firebase Hosting | Frontend build | `firebase deploy --only hosting` |

## Common Operations

### View Terraform State

```bash
terraform state list
terraform state show module.cloud_run.google_cloud_run_v2_service.api
```

### Import Existing Resources

```bash
terraform import module.iam.google_service_account.cloud_run_api \
  projects/stall-bokning-dev/serviceAccounts/dev-cloud-run-api@stall-bokning-dev.iam.gserviceaccount.com
```

### Destroy Resources (Caution!)

```bash
# Destroy specific module
terraform destroy -target=module.monitoring

# Destroy everything
terraform destroy
```

## Troubleshooting

### "Backend configuration changed"

Re-initialize with:
```bash
terraform init -reconfigure
```

### "Resource already exists"

Import the existing resource:
```bash
terraform import <resource_address> <resource_id>
```

### "Permission denied"

Ensure you have the required IAM roles:
```bash
gcloud projects add-iam-policy-binding stall-bokning-dev \
  --member="user:your-email@example.com" \
  --role="roles/owner"
```

## CI/CD Integration

For GitHub Actions, enable Workload Identity:

```hcl
# In terraform.tfvars
create_workload_identity = true
github_repository        = "owner/stall-bokning"
```

Then use in GitHub Actions:
```yaml
- uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
    service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}
```

## Adding New Environments

1. Copy `environments/dev/` to `environments/staging/` or `environments/prod/`
2. Update `backend.tf` with new prefix
3. Update `terraform.tfvars` with environment-specific values
4. Run `terraform init` and `terraform apply`

## Best Practices

1. **Never commit secrets** - Use `terraform.tfvars.local` for sensitive values
2. **Review plans** - Always review `terraform plan` before applying
3. **Use workspaces sparingly** - Prefer separate directories per environment
4. **Lock state** - GCS backend handles locking automatically
5. **Version modules** - Tag releases when modules are stable
