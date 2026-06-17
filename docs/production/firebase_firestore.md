# Google Firebase & Cloud Firestore Production Guide

## Overview

This guide details the Cloud Firestore database configurations for **Rootly AI**. It highlights security rules, query indexing maps, and optimization strategies deployed to secure client-side transactions and control operations costs.

---

## 1. Firestore Security Rules Audit

The application database is locked down using Firebase Security Rules in `firestore.rules`. Access is governed by these core concepts:

- **JWT Validation**: Request identity is verified via `request.auth.uid`. Unauthenticated users cannot read or write to any data path.
- **Strict Row-Level Ownership**: Users can only query and write documents matching their verified UID:
  ```javascript
  allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
  ```
- **Immutability Enforcement**: The collections `activities` and `weeklyReports` are audit records. The rules explicitly block document updates (`allow update: if false;`) to prevent modification of logged historical footprint data.
- **Schema Validation**: Writes to the database are checked to ensure fields conform to valid bounds (e.g. emissions are numbers and categories match standard enums).

---

## 2. Query Indexing Strategy

To support dynamic dashboards and sorted feeds, Rootly defines compound query indexes in `firestore.indexes.json`:

- **Activity Timeline**: Index on `userId` (ASC) and `timestamp` (DESC) in the `activities` collection. Allows immediate extraction of a user's recent footprint logs for real-time calculations.
- **Weekly Briefing Log**: Index on `userId` (ASC) and `generatedAt` (DESC) in the `weeklyReports` collection. Used to quickly query the latest generated briefing.
- **Export History Timeline**: Index on `userId` (ASC) and `timestamp` (DESC) in the `exports_history` collection to populate the audit reports panel.

Without these pre-configured compound indexes, Firestore queries combining equality checks and sort filters would reject execution with an error.

---

## 3. Read/Write Cost Control Strategies

Cloud Firestore charges on a per-operation basis (reads, writes, and deletes). Rootly minimizes database operations using the following architectural design patterns:

### A. Client-Side Caching (React Query)
- **Mechanism**: Real-time queries use a stale-while-revalidate caching window.
- **Effect**: If a user switches tabs or navigates away and back, cached data is rendered instantly instead of triggering a new Firestore read.

### B. Telemetry Counters Batching
- **Mechanism**: Daily application analytics are aggregated in-memory and batched rather than performing a write on every page click.
- **Database Model**: Telemetry increments are stored in a single daily document `/analytics_daily/{YYYY-MM-DD}` using atomic increments (`FieldValue.increment()`).
- **Savings**: Avoids writing separate documents for thousands of clicks, reducing writes by up to 98%.

### C. Client-Side Calculations
- **Mechanism**: Aggregate values (e.g., carbon score, weekly emissions totals) are computed dynamically on the client side from the fetched activity array.
- **Savings**: Eliminates the need to maintain separate, complex aggregation documents that require additional transactional database writes on every activity modification.
