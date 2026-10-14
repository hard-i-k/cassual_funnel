# User Analytics Backend API

Production-ready Node.js + Express + MongoDB backend for the User Analytics Application.

## Features
- **Event Ingestion**: Supports single event and batch event ingestion with strict input validation.
- **Session Tracking**: Aggregates sessions, calculates total events, page views, clicks, and session lifespan (first seen & last seen timestamps).
- **User Journey**: Returns chronological events for any specific session.
- **Heatmap Analytics**: Delivers click coordinate data (`click_x`, `click_y`, viewport dimensions) per page.
- **Page Discovery**: Lists distinct pages that have recorded click activity for dropdown selectors.
- **Robust Error Handling**: Centralized error middleware, input validation, and fallback handling.

---

## Environment Variables

Copy `.env.example` to `.env`:
```bash
PORT=5000
MONGODB_URI=mongodb://localhost:27017/user_analytics
CLIENT_ORIGIN=http://localhost:3000
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server listening port | `5000` |
| `MONGODB_URI` | MongoDB connection connection string | `mongodb://localhost:27017/user_analytics` |
| `CLIENT_ORIGIN` | Allowed client origin (CORS allows all by default) | `http://localhost:3000` |

---

## Installation & Running

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Start development server with nodemon
npm run dev

# Or start in production mode
npm start
```

---

## API Endpoints

### 1. Ingest Events
- **POST** `/api/events`
- **Description**: Stores a single event or a batch of events.
- **Request Body (Single Event)**:
  ```json
  {
    "session_id": "sess_12345",
    "event_type": "click",
    "page_url": "https://example.com/pricing",
    "click_x": 450,
    "click_y": 320,
    "viewport_width": 1920,
    "viewport_height": 1080,
    "timestamp": "2026-10-14T15:00:00.000Z"
  }
  ```
- **Request Body (Batch)**:
  ```json
  [
    {
      "session_id": "sess_12345",
      "event_type": "page_view",
      "page_url": "https://example.com/home"
    },
    {
      "session_id": "sess_12345",
      "event_type": "click",
      "page_url": "https://example.com/home",
      "click_x": 200,
      "click_y": 150
    }
  ]
  ```
- **Response**: `201 Created`

---

### 2. Fetch Sessions List
- **GET** `/api/sessions`
- **Description**: Groups events by `session_id` using MongoDB aggregation and sorts by `last_seen` descending.
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "count": 2,
    "sessions": [
      {
        "session_id": "sess_12345",
        "total_events": 5,
        "page_views": 3,
        "clicks": 2,
        "first_seen": "2026-10-14T15:00:00.000Z",
        "last_seen": "2026-10-14T15:10:00.000Z"
      }
    ]
  }
  ```

---

### 3. Fetch Session Journey
- **GET** `/api/sessions/:sessionId/events`
- **Description**: Retrieves all events for the specified session sorted chronologically (`timestamp` ascending).
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "session_id": "sess_12345",
    "count": 2,
    "events": [
      {
        "_id": "670c...",
        "session_id": "sess_12345",
        "event_type": "page_view",
        "page_url": "https://example.com/home",
        "timestamp": "2026-10-14T15:00:00.000Z"
      },
      {
        "_id": "670d...",
        "session_id": "sess_12345",
        "event_type": "click",
        "page_url": "https://example.com/home",
        "click_x": 200,
        "click_y": 150,
        "timestamp": "2026-10-14T15:01:00.000Z"
      }
    ]
  }
  ```

---

### 4. Fetch Heatmap Click Data
- **GET** `/api/heatmap?page_url=https://example.com/home`
- **Description**: Retrieves all click events for the specified `page_url` containing coordinates and viewport dimensions.
- **Query Parameters**:
  - `page_url` (required): URL of the page to get clicks for.
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "page_url": "https://example.com/home",
    "count": 1,
    "clicks": [
      {
        "_id": "670d...",
        "session_id": "sess_12345",
        "page_url": "https://example.com/home",
        "click_x": 200,
        "click_y": 150,
        "viewport_width": 1920,
        "viewport_height": 1080,
        "timestamp": "2026-10-14T15:01:00.000Z"
      }
    ]
  }
  ```

---

### 5. Fetch Pages with Click Events
- **GET** `/api/pages`
- **Description**: Retrieves distinct `page_url` values that have recorded click events. Used by frontend dropdowns.
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "count": 2,
    "pages": [
      "https://example.com/home",
      "https://example.com/pricing"
    ]
  }
  ```
