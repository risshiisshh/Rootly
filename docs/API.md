# Rootly - API Documentation

All application endpoints are deployed as Next.js API Routes under the `/api/` prefix.

---

## 1. Global Requirements

1. **Authentication**: All endpoints (except public checks) require the `Authorization` header:
   ```http
   Authorization: Bearer <Firebase_ID_Token>
   ```
2. **Response format**: All endpoints communicate using UTF-8 JSON payloads.
3. **Validation**: Payloads are strictly parsed using Zod schemas prior to controller routing.

---

## 2. API Endpoints

### POST `/api/chat`
Submits a message to the AI coach.
- **Request**:
  ```json
  {
    "message": "How can I reduce my transportation footprint?",
    "userId": "firebase-uid"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "response": "Based on your activity logs, you drove 45km in a petrol car yesterday. Switching that trip to train transit...",
    "suggestedActions": [
      "Switch Monday commute to train — saves 5.4 kg CO2e",
      "Combine grocery trips into one drive — saves 1.8 kg CO2e"
    ]
  }
  ```

### POST `/api/voice`
Processes an audio recording to extract carbon-emitting activities.
- **Request**:
  - Content-Type: `multipart/form-data`
  - Body: `audio` (file blob, typically `audio/webm` or `audio/ogg`)
- **Response `200 OK`**:
  ```json
  {
    "transcript": "Yesterday I took a bus to work which was about 8 kilometers and had chicken salad for lunch.",
    "activities": [
      {
        "category": "transport",
        "activity": "bus",
        "quantity": 8,
        "emission": 0.712,
        "description": "8 km bus trip"
      },
      {
        "category": "food",
        "activity": "poultry_meal",
        "quantity": 1,
        "emission": 1.2,
        "description": "Chicken meal"
      }
    ]
  }
  ```

### POST `/api/routes`
Compares route emission factors between two geographical points using Google Maps.
- **Request**:
  ```json
  {
    "origin": "San Francisco Ferry Building",
    "destination": "Golden Gate Park"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "comparison": {
      "origin": "Ferry Building, San Francisco, CA",
      "destination": "Golden Gate Park, San Francisco, CA",
      "distanceKm": 8.4,
      "options": [
        {
          "mode": "walk",
          "label": "Walking",
          "emissionsKg": 0,
          "durationMinutes": 110,
          "distanceKm": 8.4,
          "isRecommended": false,
          "savingsVsCar": 1.6128
        },
        {
          "mode": "car",
          "label": "Car",
          "emissionsKg": 1.6128,
          "durationMinutes": 18,
          "distanceKm": 8.4,
          "isRecommended": false,
          "savingsVsCar": 0
        },
        {
          "mode": "train",
          "label": "Transit",
          "emissionsKg": 0.3444,
          "durationMinutes": 25,
          "distanceKm": 8.4,
          "isRecommended": true,
          "savingsVsCar": 1.2684
        }
      ],
      "recommendedMode": "train",
      "totalSavingsKg": 1.2684,
      "aiReasoning": "Taking transit cuts emissions by 78% while adding only 7 minutes to the trip compared to driving."
    }
  }
  ```

### POST `/api/reports`
Triggers weekly narrative calculations using Claude.
- **Request**:
  ```json
  {
    "uid": "firebase-uid"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "report": {
      "id": "rep-abc123xyz",
      "userId": "firebase-uid",
      "weekStart": "2026-06-08T00:00:00.000Z",
      "weekEnd": "2026-06-14T23:59:59.999Z",
      "totalEmissionsKg": 24.5,
      "carbonScore": 84,
      "previousScore": 80,
      "scoreDelta": 4,
      "topContributors": [
        { "category": "transport", "percentage": 50, "emissionsKg": 12.25 }
      ],
      "recommendations": [
        {
          "title": "Lower thermostat by 1 degree",
          "description": "Adjusting home temperature saves significant energy.",
          "potentialSavingsKg": 4.5,
          "priority": "high"
        }
      ],
      "trend": "improving",
      "narrative": "You made great strides reducing transportation emissions this week...",
      "projectedAnnualKg": 1274,
      "generatedAt": "2026-06-15T09:00:00.000Z"
    }
  }
  ```

### POST `/api/exports`
Compiles and logs data exports.
- **Request**:
  ```json
  {
    "format": "csv",
    "range": "30d",
    "contentType": "activity-history"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "recordId": "exp-123456",
    "downloadUrl": "data:text/csv;base64,QWN0aXZpdHksQ2F0ZWdvcnksUXVhbnRpdHksRW1pc3Npb24sRGF0ZQo=",
    "fileContent": "Activity,Category,Quantity,Emission (kg CO2e),Date...",
    "filename": "rootly-export-activity-history-30d.csv"
  }
  ```

### GET `/api/exports`
Retrieves past export transaction records.
- **Response `200 OK`**:
  ```json
  {
    "history": [
      {
        "id": "exp-123456",
        "userId": "firebase-uid",
        "format": "csv",
        "contentType": "activity-history",
        "dateRange": "30d",
        "status": "completed",
        "downloadUrl": "data:text/csv;base64,...",
        "createdAt": { "seconds": 1781683200, "nanoseconds": 0 }
      }
    ]
  }
  ```

---

## 3. Rate Limiting Enforcements

To protect the serverless functions and downstream APIs from spam, Rootly imposes per-user in-memory limits:

| Route Path | Limit Threshold | Reset Window |
|---|---|---|
| `/api/chat` | 20 Requests | 60 Seconds |
| `/api/voice` | 5 Requests | 60 Seconds |
| `/api/routes` | 10 Requests | 60 Seconds |
| `/api/reports` | 2 Requests | 1 Hour |
| `/api/exports` (POST) | 5 Requests | 60 Seconds |
| `/api/exports` (GET) | 20 Requests | 60 Seconds |

---

## 4. API Error Handling Reference

Standard response payloads when operations fail:

| Status Code | Code / Error Name | Description / Resolution |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Request schema mismatch or invalid data size (Zod failed). |
| `401` | `UNAUTHORIZED` | Bearer token header missing, invalid, or expired. |
| `429` | `RATE_LIMIT_EXCEEDED` | Exceeded request limit. Try again after the reset window. |
| `500` | `INTERNAL_SERVER_ERROR` | Call to downstream vendor API (Anthropic/Google Maps) failed. |
