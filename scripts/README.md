# Rootly Firestore Seeding System

This seeding system populates a Firestore instance with high-quality, realistic, and mathematically coherent historical sustainability data spanning **60 days**. 

It generates 3 distinct demo accounts reflecting different carbon emission profiles (High, Average, Low), complete with historical activities, goals, reports, recommendations (compliant with the Explainable AI format), chat history, transit route comparisons, and voice logs.

---

## 👥 Demo User Personas

The system generates the following three user accounts. All accounts are configured with the default password: **`RootlyDemo123!`**

### 1. 🛑 High Emissions Profile
* **Name**: Alex Commuter
* **Email**: `alex.high@rootly.green`
* **Target Carbon Score**: ~35
* **Weekly Limit/Goal**: 150 kg CO₂e
* **Characteristics**:
  * SUV petrol commuting (50 km round-trip daily)
  * Heavy red meat meals (beef, pork, lamb) daily
  * High household gas heating & electricity consumption
  * Frequent air conditioner usage (6–12 hours daily)
  * High-waste lifestyle (long hot showers, frequent fast-fashion clothes shopping, high streaming volume)

### 2. ⚖️ Average Emissions Profile
* **Name**: Sam Moderate
* **Email**: `sam.average@rootly.green`
* **Target Carbon Score**: ~65
* **Weekly Limit/Goal**: 80 kg CO₂e
* **Characteristics**:
  * Mixed transportation (average diesel car, regional buses, commuter trains, walking)
  * Balanced diet (chicken/poultry, vegetarian options, occasional red meat)
  * Average household grid energy and heating usage
  * Normal lifestyle habits (moderate streaming, standard length showers, typical laundry loads)

### 3. 🌱 Low Emissions Profile
* **Name**: Emma Eco
* **Email**: `emma.eco@rootly.green`
* **Target Carbon Score**: ~92
* **Weekly Limit/Goal**: 35 kg CO₂e
* **Characteristics**:
  * Non-emissive transit (bicycles, walking, low-impact commuter trains)
  * Strictly plant-based vegan diet (vegan and vegetarian meals only)
  * Very low household energy (renewable/solar offsets, no air conditioning)
  * Eco-conscious lifestyle (very short cold-water showers, slow fashion, minimal video streaming)

---

## ⚙️ Configuration

The seeding script uses the Firebase Admin SDK and depends on the environment setup inside `.env.local` at the root of the project.

Verify that your `.env.local` contains **one** of the following configurations:

### Option A: Local Emulator Suite (Recommended for Development)
Ensure the Firestore Emulator is running and specify its host:
```bash
FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
```

### Option B: Firebase Service Account Key (For Cloud Instances)
Obtain a Service Account JSON from the Firebase Console (Project Settings > Service Accounts), encode it as a single line, and store it:
```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type": "service_account", "project_id": "rootly-18a49", ...}'
```

---

## 🚀 Execution

Commands should be executed from the root of the project directory.

### Seed Database
This command will create the Firebase Auth user accounts, generate 60 days of historical records, calculate consistent user profile statistics, and write everything to Firestore:
```bash
npm run db:seed
```

### Reset Database
This command will clean up all generated data. It deletes all Firestore records associated with the demo user IDs across all collections (including subcollections like conversation messages) and deletes the user logins from Firebase Auth:
```bash
npm run db:reset
```

---

## 📊 Data Schemas Seeded

The seeder populates the following Firestore collections:
1. `users`: Demographic profiles, total historical carbon totals, goals, and latest carbon scores.
2. `activities`: 60 days of daily food, transport, energy, and lifestyle activities matching persona coefficients.
3. `weeklyReports`: ~8.5 weeks of compiled reports featuring narrative insights, score trends, delta values, and contributor breakdowns.
4. `recommendations`: Actionable, auditable Explainable AI recommendation items exposing observation, reasoning, recommendation, and impact.
5. `conversations` / `conversations/{id}/messages`: Virtual coach chat logs with rich embedded metadata (e.g.Suggested Actions, Emissions Context).
6. `routeComparisons`: Commute and travel alternative routes with corresponding distance, time, cost, and carbon differences.
7. `voiceLogs`: Audio upload logs containing transcripts and list of extracted activity metadata.
