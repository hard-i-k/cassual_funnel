# User Analytics Application — CausalFunnel Assignment

A full-stack application that tracks user interactions on a webpage and displays them in a dashboard. Built with React, Node.js/Express, and MongoDB.

## Tech Stack

| Layer      | Technology              |
| ---------- | ----------------------- |
| Frontend   | React 18 + Vite         |
| Backend    | Node.js + Express       |
| Database   | MongoDB + Mongoose      |
| Tracking   | Vanilla JavaScript      |
| HTTP Client| Axios                   |
| Routing    | React Router DOM v6     |

## Project Structure

```
Casual_Funnel_Assignment/
├── backend/                    # Node.js API server
│   ├── models/Event.js         # Mongoose event schema
│   ├── routes/
│   │   ├── events.js           # POST /api/events
│   │   ├── sessions.js         # GET /api/sessions, /api/sessions/:id/events
│   │   └── heatmap.js          # GET /api/heatmap, /api/pages
│   ├── server.js               # Express app entry point
│   ├── .env.example            # Environment variables template
│   └── package.json
├── frontend/                   # React dashboard
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page-level components
│   │   ├── styles/             # CSS stylesheets
│   │   └── utils/              # API client & formatters
│   ├── .env.example
│   └── package.json
└── tracking/                   # Client-side tracking
    ├── tracker.js              # Event tracking script
    └── demo.html               # Demo e-commerce page
```

## Setup Steps

### Prerequisites

- **Node.js** v18+ (tested with v22)
- **MongoDB** running locally or a MongoDB Atlas connection string
- **npm** v8+

### 1. Clone & Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables

**Backend** — create `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/user_analytics
```

**Frontend** — create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
```

### 3. Start MongoDB

Make sure MongoDB is running on your machine:
```bash
# If using local MongoDB
mongod

# Or connect to MongoDB Atlas by updating MONGODB_URI in .env
```

### 4. Start the Backend

```bash
cd backend
npm run dev    # or: npm start
```
Server runs at http://localhost:5000

### 5. Start the Frontend

```bash
cd frontend
npm run dev
```
Dashboard runs at http://localhost:5173

### 6. Generate Test Data

Open `tracking/demo.html` in a browser:
- You can simply double-click the file, or serve it locally
- Click around the demo e-commerce page — each click and page view is tracked
- Then go to the dashboard (http://localhost:5173) to see the data

## API Endpoints

| Method | Endpoint                          | Description                      |
| ------ | --------------------------------- | -------------------------------- |
| POST   | `/api/events`                     | Receive and store events (single or batch) |
| GET    | `/api/sessions`                   | List all sessions with event counts |
| GET    | `/api/sessions/:sessionId/events` | Get all events for a session (user journey) |
| GET    | `/api/heatmap?page_url=<url>`     | Get click data for a specific page |
| GET    | `/api/pages`                      | Get distinct page URLs with click events |
| GET    | `/health`                         | Health check endpoint |

## Dashboard Features

### Sessions View
- Lists all tracked sessions with event counts
- Shows first seen / last seen timestamps
- Click any session to view the full user journey

### Session Detail (User Journey)
- Vertical timeline of all events in chronological order
- Color-coded badges: 🔵 Page View, 🟡 Click
- Shows click coordinates and viewport dimensions

### Heatmap View
- Select a page URL from the dropdown
- Visual canvas-based heatmap showing click density
- Color gradient from blue (low) to red (high density)
- Individual click dots with radial glow effects

## Tracking Script

The tracker (`tracking/tracker.js`) can be embedded on any webpage:

```html
<script src="tracker.js" data-api="http://localhost:5000"></script>
```

It tracks:
- **page_view** events on page load and SPA navigation
- **click** events with x/y coordinates
- Generates and persists a `session_id` in localStorage
- Batches events and sends via `sendBeacon` / `fetch`

## Assumptions & Trade-offs

1. **Session Persistence**: Session IDs are stored in `localStorage` and persist until cleared. A new session can be started by clearing localStorage.
2. **No Authentication**: The API is open for simplicity. In production, you'd add API keys or auth.
3. **Heatmap Scaling**: The heatmap scales viewport dimensions to fit the canvas. Click coordinates are proportionally adjusted.
4. **Event Batching**: The tracker batches events every 3 seconds or when 20 events accumulate, whichever comes first.
5. **SPA Support**: The tracker intercepts `pushState`/`replaceState` to track SPA navigations.
