# Operational Deployment & Incident Playbook

## Overview

This playbook provides setup guidelines, credential management, and incident response procedures for operating the **Rootly AI** platform on Google Cloud Run.

---

## 1. Google Secret Manager Setup

Rootly relies on Google Secret Manager to feed application environment variables to Cloud Run containers at runtime. 

### Step-by-Step Secrets Registration:

For each environment variable (e.g. `GEMINI_API_KEY`, `FIREBASE_ADMIN_PRIVATE_KEY`):

1. Go to **Google Secret Manager** in the Google Cloud Console.
2. Click **Create Secret**.
3. Name the secret exactly (e.g., `GEMINI_API_KEY`).
4. Paste the value in the Secret Value box.
5. Click **Create**.
6. Ensure your Cloud Run Service Account has the **Secret Manager Secret Accessor** (`roles/secretmanager.secretAccessor`) role granted for these secrets.

---

## 2. Deployment Setup Commands

If you need to deploy the application manually from your workstation:

```bash
# 1. Authenticate with Google Cloud
gcloud auth login

# 2. Set active project
gcloud config set project rootly-18a49

# 3. Create Artifact Registry repository (one-time setup)
gcloud artifacts repositories create rootly-docker-repo \
    --repository-format=docker \
    --location=us-central1 \
    --description="Rootly Docker Repository"

# 4. Build and Push Container Image using Cloud Build
gcloud builds submit --tag us-central1-docker.pkg.dev/rootly-18a49/rootly-docker-repo/rootly:latest

# 5. Apply Knative service configuration
gcloud run services replace gcp-service.yaml --region=us-central1

# 6. Local Docker Verification
# Build and run the app locally inside a Docker container using Compose:
docker compose up --build
```

---

## 3. Incident Playbook

### Incident A: AI Coach or Voice Logging Fails
- **Symptom**: Chat messages or audio logs fail with API errors in logs.
- **Diagnostics**:
  1. Check GCP Cloud Logging for `GEMINI_API_KEY` authentication errors.
  2. Verify the secret is active in Google Secret Manager and has not expired or been deleted.
  3. Check Google AI Studio for quota limit alerts.

### Incident B: Firestore Security Violations
- **Symptom**: Client console shows `FirebaseError: Missing or insufficient permissions`.
- **Diagnostics**:
  1. Verify the client is authenticated. Unauthenticated reads/writes are rejected.
  2. Check if a user is trying to update documents in the `activities` or `weeklyReports` collections. (Rules disallow updates to preserve audit trail integrity).

### Incident C: High Latency / Slow Response Times
- **Symptom**: Route comparison loading spinner hangs.
- **Diagnostics**:
  1. Check GCP Cloud Run logs. If cold starts are high, verify **Startup CPU Boost** is set to `true` in `gcp-service.yaml`.
  2. If Directions API is failing, verify your GCP Billing is active and Maps Directions API has no key restrictions blocking requests.

### Incident D: Cloud Build Logging Permission Errors
- **Symptom**: Cloud Build fails with: `The service account [PROJECT_NUM]-compute@developer.gserviceaccount.com does not have permission to write the logs.`
- **Resolution**:
  Run this `gcloud` command to grant the required Logs Writer role to the build service account:
  ```bash
  gcloud projects add-iam-policy-binding rootly-18a49 \
      --member="serviceAccount:730949223305-compute@developer.gserviceaccount.com" \
      --role="roles/logging.logWriter"
  ```

