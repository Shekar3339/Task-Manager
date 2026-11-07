# Taskflow

A beginner-friendly task manager built with HTML, CSS, and vanilla JavaScript, with an Express REST API and SQLite database.

## Features

- Create, view, edit, complete, and delete tasks.
- Filter tasks by status and see completion progress.
- Store task data in a local SQLite database that persists between restarts.
- Validate API input and display helpful errors in the UI.

## Requirements

- Node.js 20.17 or newer
- npm (included with Node.js)

## Get started

1. Open a terminal in the project folder.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the server:

   ```bash
   npm start
   ```

   For development with automatic server restarts, use `npm run dev`.

4. Visit [http://localhost:3000](http://localhost:3000).

Express serves the frontend from `Client/` and the API from `/api`, so `npm start` runs both parts; no separate frontend server is needed.

The server creates `Server/tasks.db` automatically the first time it starts. Keep this file to preserve your tasks.

## Project structure

```text
Client/
  index.html       App structure
  style.css        Responsive UI styles
  script.js        Browser behavior and REST API calls
Server/
  database.js      SQLite connection and schema
  server.js        Express app, static files, and REST endpoints
package.json
README.md
```

## REST API

All endpoints are served from the same origin:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/tasks` | List tasks |
| `POST` | `/api/tasks` | Create a task (`title`, optional `description`) |
| `PUT` | `/api/tasks/:id` | Update task fields (`title`, `description`, and/or `completed`) |
| `DELETE` | `/api/tasks/:id` | Delete a task |

JSON errors use an `{ "error": "..." }` response body with an appropriate HTTP status.
