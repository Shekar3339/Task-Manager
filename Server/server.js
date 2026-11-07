const path = require("node:path");
const express = require("express");
const database = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_DIR = path.join(__dirname, "..", "Client");

app.use(express.json({ limit: "10kb" }));
app.use(express.static(CLIENT_DIR));

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    database.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

function parseTaskInput(body, partial = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "A JSON object is required." };
  }

  const task = {};
  if (!partial || Object.hasOwn(body, "title")) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return { error: "A task title is required." };
    }
    if (body.title.trim().length > 120) {
      return { error: "Task titles must be 120 characters or fewer." };
    }
    task.title = body.title.trim();
  }

  if (!partial || Object.hasOwn(body, "description")) {
    if (body.description !== undefined && typeof body.description !== "string") {
      return { error: "The description must be text." };
    }
    task.description = (body.description || "").trim();
    if (task.description.length > 1000) {
      return { error: "Descriptions must be 1,000 characters or fewer." };
    }
  }

  if (Object.hasOwn(body, "completed")) {
    if (typeof body.completed !== "boolean") {
      return { error: "The completed value must be true or false." };
    }
    task.completed = body.completed ? 1 : 0;
  }

  return { task };
}

function validId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

app.get("/api/tasks", async (req, res, next) => {
  try {
    const tasks = await all(
      "SELECT id, title, description, completed, created_at, updated_at FROM tasks ORDER BY completed ASC, id DESC"
    );
    res.json(tasks.map((task) => ({ ...task, completed: Boolean(task.completed) })));
  } catch (error) {
    next(error);
  }
});

app.post("/api/tasks", async (req, res, next) => {
  try {
    const { task, error } = parseTaskInput(req.body);
    if (error) return res.status(400).json({ error });

    const result = await run(
      "INSERT INTO tasks (title, description) VALUES (?, ?)",
      [task.title, task.description]
    );
    const created = await get(
      "SELECT id, title, description, completed, created_at, updated_at FROM tasks WHERE id = ?",
      [result.id]
    );
    res.status(201).json({ ...created, completed: Boolean(created.completed) });
  } catch (error) {
    next(error);
  }
});

app.put("/api/tasks/:id", async (req, res, next) => {
  try {
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ error: "A valid task ID is required." });

    const { task, error } = parseTaskInput(req.body, true);
    if (error) return res.status(400).json({ error });
    if (Object.keys(task).length === 0) {
      return res.status(400).json({ error: "Provide at least one task field to update." });
    }

    const existing = await get("SELECT id FROM tasks WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "Task not found." });

    const fields = [];
    const values = [];
    for (const [field, value] of Object.entries(task)) {
      fields.push(`${field} = ?`);
      values.push(value);
    }
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    await run(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`, values);

    const updated = await get(
      "SELECT id, title, description, completed, created_at, updated_at FROM tasks WHERE id = ?",
      [id]
    );
    res.json({ ...updated, completed: Boolean(updated.completed) });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/tasks/:id", async (req, res, next) => {
  try {
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ error: "A valid task ID is required." });
    const result = await run("DELETE FROM tasks WHERE id = ?", [id]);
    if (!result.changes) return res.status(404).json({ error: "Task not found." });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "The requested resource was not found." });
});

// Keep internal database details in the server logs, not in API responses.
app.use((error, req, res, next) => {
  console.error("Request failed:", error);
  if (res.headersSent) return next(error);
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "The request body must contain valid JSON." });
  }
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

app.listen(PORT, () => {
  console.log(`Task Manager is running at http://localhost:${PORT}`);
});