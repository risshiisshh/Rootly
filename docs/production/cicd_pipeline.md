# CI/CD Pipeline & Build Orchestration Guide

## Overview

This guide describes the automated build, test, and deployment configurations for **Rootly AI** using GitHub Actions and Google Artifact Registry.

---

## 1. Automated Integration Checks

Before any deployment, the CI pipeline (`.github/workflows/deploy.yml`) executes three mandatory validation phases:

1. **Linting (`npm run lint`)**: Enforces code style, checks for unused variables, and verifies imports.
2. **Type Safety (`npx tsc --noEmit`)**: Verifies strict TypeScript compilation rules across all components and API controllers.
3. **Vitest Test Suite (`npm run test`)**: Runs all 245+ unit and integration test suites, ensuring changes do not break calculations or endpoints.

Any failure in these checks immediately halts the pipeline, preventing broken code from reaching production.

---

## 2. Google Artifact Registry Setup

Docker container images compiled during deployment are stored in Google Artifact Registry:

- **Repository Type**: Docker container repository.
- **Region**: `us-central1` (located near the Cloud Run instances to ensure fast deployment pull times).
- **Naming Convention**: `us-central1-docker.pkg.dev/PROJECT_ID/rootly-docker-repo/rootly`.
- **Retention Policy**: Standard policy retaining the last 10 build images. Unused older tags are cleaned up automatically to manage storage costs.

---

## 3. Automated Rollback Strategy

In the event of a critical regression post-deployment:

1. **GCP Console Rollback**: Cloud Run maintains immutable "Revisions" of every build. If a regression occurs, operations teams can roll back traffic to the previous known-good revision in the GCP Cloud Run console with zero downtime:
   ```bash
   gcloud run services update-traffic rootly --to-revisions=rootly-PREVIOUS_REVISION=100 --region=us-central1
   ```
2. **Commit Reverts**: In the repository, reverting the commit on `main` triggers the CI/CD pipeline, automatically building and deploying the reverted code as a clean revision.
