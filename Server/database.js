const path = require("node:path");
const sqlite3 = require("sqlite3").verbose();

// Keep the database beside the server code so it is easy to find and back up.
const databasePath = path.join(__dirname, "tasks.db");
const database = new sqlite3.Database(databasePath);

database.serialize(() => {
  database.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = database;